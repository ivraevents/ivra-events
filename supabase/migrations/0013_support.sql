-- =====================================================================
-- Migration 0013: Support / Helpdesk
-- =====================================================================

create type public.ticket_category as enum (
  'booking', 'stall', 'payment', 'invoice', 'document', 'account', 'coupon', 'event', 'other'
);
create type public.ticket_status as enum (
  'open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'
);
create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');

create table public.support_tickets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  subject       text not null,
  category      public.ticket_category not null default 'other',
  status        public.ticket_status not null default 'open',
  priority      public.ticket_priority not null default 'normal',

  event_id      uuid references public.events(id),
  allocation_id uuid references public.stall_allocations(id),
  stall_id      uuid references public.stalls(id),

  assigned_to   uuid references public.profiles(id),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index support_tickets_user_idx on public.support_tickets (user_id);
create index support_tickets_status_idx on public.support_tickets (status);

create trigger trg_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id),
  is_staff    boolean not null default false,
  message     text not null,
  created_at  timestamptz not null default now()
);

create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

create table public.support_attachments (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid references public.support_messages(id) on delete cascade,
  ticket_id     uuid not null references public.support_tickets(id) on delete cascade,
  uploaded_by   uuid not null references public.profiles(id),
  storage_bucket text not null default 'support-attachments',
  storage_path  text not null,
  original_filename text not null,
  mime_type     text not null,
  file_size_bytes bigint not null,
  created_at    timestamptz not null default now()
);

create index support_attachments_ticket_idx on public.support_attachments (ticket_id);

-- First message auto-bumps a ticket back to "open"/"waiting_for_user"
create or replace function public.touch_ticket_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_tickets
    set status = case when new.is_staff then 'waiting_for_user'::public.ticket_status
                       else 'open'::public.ticket_status end,
        updated_at = now()
    where id = new.ticket_id
      and status not in ('closed');
  return new;
end;
$$;

create trigger trg_support_messages_touch_ticket
  after insert on public.support_messages
  for each row execute function public.touch_ticket_on_message();
