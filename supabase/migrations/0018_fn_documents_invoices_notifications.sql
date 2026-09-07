-- =====================================================================
-- Migration 0018: Document review, invoice generation, notifications,
-- public settings accessor, payment submission
-- =====================================================================

-- ---------------------------------------------------------------------
-- notify() — small helper, used by several functions below
-- ---------------------------------------------------------------------
create or replace function public.notify(
  p_user_id uuid, p_type public.notification_type, p_title text,
  p_body text default null, p_link_path text default null
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, type, title, body, link_path)
  values (p_user_id, p_type, p_title, p_body, p_link_path);
$$;

-- ---------------------------------------------------------------------
-- upload_document_version() — records a newly uploaded file (the file
-- itself is written to Storage by the client first via a signed path;
-- this just registers the metadata row + bumps the version)
-- ---------------------------------------------------------------------
create or replace function public.upload_document_version(
  p_kind public.document_kind, p_registration_id uuid, p_storage_path text,
  p_original_filename text, p_mime_type text, p_file_size_bytes bigint
) returns public.document_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_doc public.documents;
  v_version int;
  v_row public.document_versions;
begin
  select * into v_doc from public.documents
    where user_id = v_uid and kind = p_kind
      and (registration_id is not distinct from p_registration_id);

  if v_doc.id is null then
    insert into public.documents (user_id, registration_id, kind)
    values (v_uid, p_registration_id, p_kind)
    returning * into v_doc;
    v_version := 1;
  else
    v_version := v_doc.current_version + 1;
  end if;

  insert into public.document_versions (
    document_id, version, storage_path, original_filename, mime_type, file_size_bytes, status
  ) values (
    v_doc.id, v_version, p_storage_path, p_original_filename, p_mime_type, p_file_size_bytes, 'pending'
  ) returning * into v_row;

  perform public.write_audit_log('document.upload', 'documents', v_doc.id, null, to_jsonb(v_row));
  return v_row;
end;
$$;

grant execute on function public.upload_document_version(public.document_kind, uuid, text, text, text, bigint) to authenticated;

-- ---------------------------------------------------------------------
-- review_document() — admin approves / rejects / requests re-upload
-- ---------------------------------------------------------------------
create or replace function public.review_document(
  p_document_version_id uuid, p_action text,
  p_reason public.document_rejection_reason default null, p_note text default null
) returns public.document_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.document_versions;
  v_doc public.documents;
  v_status public.document_status;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  v_status := case p_action
    when 'approve' then 'approved'::public.document_status
    when 'reject' then 'rejected'::public.document_status
    when 'reupload' then 'reupload_requested'::public.document_status
    else null
  end;
  if v_status is null then raise exception 'INVALID_ACTION' using errcode = 'P0001'; end if;

  update public.document_versions
    set status = v_status, reviewed_by = auth.uid(), reviewed_at = now(),
        rejection_reason = p_reason, rejection_note = p_note
    where id = p_document_version_id
    returning * into v;

  select * into v_doc from public.documents where id = v.document_id;

  if v_status = 'approved' then
    perform public.notify(v_doc.user_id, 'document_approved', 'Document approved',
      v_doc.kind::text || ' has been approved.');
  else
    perform public.notify(v_doc.user_id, 'document_reupload_required', 'Document needs attention',
      coalesce(p_note, p_reason::text, 'Please re-upload this document.'));
  end if;

  perform public.write_audit_log('document.review', 'document_versions', v.id, null, to_jsonb(v));
  return v;
end;
$$;

grant execute on function public.review_document(uuid, text, public.document_rejection_reason, text) to authenticated;

-- ---------------------------------------------------------------------
-- submit_payment() — user records a payment claim (UPI/UTR); it stays
-- 'pending_verification' until an admin calls verify_payment()
-- ---------------------------------------------------------------------
create or replace function public.submit_payment(
  p_purpose public.payment_purpose, p_amount_paise bigint, p_method public.payment_method,
  p_allocation_id uuid default null, p_registration_id uuid default null,
  p_utr_reference text default null, p_proof_storage_path text default null
) returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_event_id uuid;
  p public.payments;
begin
  if p_allocation_id is not null then
    select event_id into v_event_id from public.stall_allocations
      where id = p_allocation_id and user_id = v_uid;
    if v_event_id is null then raise exception 'ALLOCATION_NOT_FOUND' using errcode = 'P0001'; end if;
  end if;

  insert into public.payments (
    user_id, event_id, allocation_id, registration_id, purpose, amount_paise,
    method, utr_reference, proof_storage_path, status
  ) values (
    v_uid, v_event_id, p_allocation_id, p_registration_id, p_purpose, p_amount_paise,
    p_method, p_utr_reference, p_proof_storage_path, 'pending_verification'
  ) returning * into p;

  perform public.write_audit_log('payment.submit', 'payments', p.id, null, to_jsonb(p));
  return p;
end;
$$;

grant execute on function public.submit_payment(public.payment_purpose, bigint, public.payment_method, uuid, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- generate_invoice() — admin/finance action, snapshots a booking or
-- application-fee payment into an immutable invoice + line items
-- ---------------------------------------------------------------------
create or replace function public.generate_invoice(
  p_user_id uuid, p_payment_id uuid default null, p_allocation_id uuid default null,
  p_registration_id uuid default null, p_invoice_type public.invoice_type default 'non_gst',
  p_description text default 'Stall booking', p_amount_paise bigint default 0,
  p_tax_rate_pct numeric default 0
) returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_number text;
  v_tax bigint;
  v_event_id uuid;
  inv public.invoices;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  select value into v_settings from public.system_settings where key = 'business_details';
  select value->>'prefix' into v_number from public.system_settings where key = 'invoice_settings';
  v_number := public.next_invoice_number(coalesce(v_number, 'IVRA'));
  v_tax := floor(p_amount_paise * p_tax_rate_pct / 100.0)::bigint;

  if p_allocation_id is not null then
    select event_id into v_event_id from public.stall_allocations where id = p_allocation_id;
  end if;

  insert into public.invoices (
    invoice_number, invoice_type, user_id, event_id, allocation_id, payment_id, registration_id,
    business_name, business_address, gstin, pan, subtotal_paise, tax_paise, total_paise, generated_by
  ) values (
    v_number, p_invoice_type, p_user_id, v_event_id, p_allocation_id, p_payment_id, p_registration_id,
    coalesce(v_settings->>'legal_name', 'IVRA Events'), v_settings->>'address',
    v_settings->>'gstin', v_settings->>'pan', p_amount_paise, v_tax, p_amount_paise + v_tax, auth.uid()
  ) returning * into inv;

  insert into public.invoice_items (invoice_id, description, quantity, unit_price_paise, tax_rate_pct, amount_paise)
  values (inv.id, p_description, 1, p_amount_paise, p_tax_rate_pct, p_amount_paise + v_tax);

  perform public.notify(p_user_id, 'invoice_generated', 'Invoice generated', v_number, '/invoices');
  perform public.write_audit_log('invoice.generate', 'invoices', inv.id);
  return inv;
end;
$$;

grant execute on function public.generate_invoice(uuid, uuid, uuid, uuid, public.invoice_type, text, bigint, numeric) to authenticated;

-- ---------------------------------------------------------------------
-- get_public_settings() — the only settings surface exposed to clients
-- ---------------------------------------------------------------------
create or replace function public.get_public_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'application_fee_paise', (select value from public.system_settings where key = 'application_fee_paise'),
    'upi_details', (select value from public.system_settings where key = 'upi_details'),
    'document_limits', (select value from public.system_settings where key = 'document_limits'),
    'business_name', (select value->>'legal_name' from public.system_settings where key = 'business_details')
  );
$$;

grant execute on function public.get_public_settings() to authenticated, anon;
