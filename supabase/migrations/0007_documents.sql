-- =====================================================================
-- Migration 0007: Documents + Versioning
-- Files themselves live in the private 'private-documents' storage
-- bucket (see 0021) — this table only stores metadata + storage paths.
-- =====================================================================

create type public.document_kind as enum ('aadhaar_front', 'aadhaar_back', 'pan', 'other');
create type public.document_status as enum ('pending', 'approved', 'rejected', 'reupload_requested');

create table public.documents (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  registration_id   uuid references public.registrations(id) on delete cascade,
  kind              public.document_kind not null,
  current_version   int not null default 1,
  status            public.document_status not null default 'pending',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index documents_user_idx on public.documents (user_id);
create index documents_registration_idx on public.documents (registration_id);

create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- document_versions — every upload/re-upload creates a new immutable row
-- ---------------------------------------------------------------------
create type public.document_rejection_reason as enum (
  'aadhaar_front_unclear', 'aadhaar_back_unclear', 'wrong_document',
  'document_mismatch', 'appears_altered', 'other'
);

create table public.document_versions (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.documents(id) on delete cascade,
  version           int not null,
  storage_bucket    text not null default 'private-documents',
  storage_path      text not null,          -- e.g. {user_id}/{document_id}/v{n}-{safe_filename}
  original_filename text not null,
  mime_type         text not null,
  file_size_bytes   bigint not null,

  status            public.document_status not null default 'pending',
  reviewed_by       uuid references public.profiles(id),
  reviewed_at       timestamptz,
  rejection_reason  public.document_rejection_reason,
  rejection_note    text,

  uploaded_at       timestamptz not null default now(),
  unique (document_id, version)
);

create index document_versions_document_idx on public.document_versions (document_id);

-- Keep documents.current_version / status in sync with the latest version row
create or replace function public.sync_document_from_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.documents
    set current_version = new.version,
        status = new.status
    where id = new.document_id;
  return new;
end;
$$;

create trigger trg_document_versions_sync
  after insert or update on public.document_versions
  for each row execute function public.sync_document_from_version();
