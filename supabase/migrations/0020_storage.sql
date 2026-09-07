-- =====================================================================
-- Migration 0020: Private Storage buckets + object-level RLS
--
-- Both buckets are PRIVATE (public = false). Files are only ever
-- reached through short-lived signed URLs generated server-side
-- (see src/lib/supabase/signed-url.ts) — never a public URL.
--
-- Path conventions (enforced by the policies below via
-- storage.foldername(name), NOT just convention):
--   private-documents:   {user_id}/{document_id}/v{n}-{safe_filename}
--   support-attachments: {ticket_id}/{safe_filename}
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('private-documents', 'private-documents', false, 5242880,
    array['image/jpeg','image/png','image/webp','application/pdf']),
  ('support-attachments', 'support-attachments', false, 10485760,
    array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- private-documents — first path segment must be the uploader's own
-- user id; admin can read every object (for review); nobody can update
-- or delete (re-uploads create a NEW version/object instead, preserving
-- history per spec #26/#27).
-- ---------------------------------------------------------------------
create policy "private_documents_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'private-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "private_documents_owner_or_admin_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'private-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- explicitly no update/delete policies -> those operations are denied by
-- default under RLS for every role except the service role.

-- ---------------------------------------------------------------------
-- support-attachments — first path segment must be a ticket the caller
-- owns or is staff on.
-- ---------------------------------------------------------------------
create policy "support_attachments_participant_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and exists (
      select 1 from public.support_tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (t.user_id = auth.uid() or public.is_support_staff())
    )
  );

create policy "support_attachments_participant_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and exists (
      select 1 from public.support_tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (t.user_id = auth.uid() or public.is_support_staff())
    )
  );

-- ---------------------------------------------------------------------
-- public event banners — a small PUBLIC bucket for marketing images only
-- (never used for anything sensitive). Admin-managed.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-banners', 'event-banners', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "event_banners_public_read" on storage.objects
  for select using (bucket_id = 'event-banners');

create policy "event_banners_admin_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'event-banners' and public.is_admin());

create policy "event_banners_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'event-banners' and public.is_admin());

create policy "event_banners_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'event-banners' and public.is_admin());
