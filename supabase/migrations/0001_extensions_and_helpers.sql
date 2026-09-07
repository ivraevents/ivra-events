-- =====================================================================
-- IVRA EVENTS — Flea Market Management System
-- Migration 0001: Extensions + generic helper functions
-- =====================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";        -- case-insensitive email
create extension if not exists "pg_trgm";       -- search

-- ---------------------------------------------------------------------
-- updated_at trigger helper — attach to any table with an updated_at col
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- current_user_id() — wraps auth.uid() so functions are testable/mockable
-- ---------------------------------------------------------------------
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- ---------------------------------------------------------------------
-- has_role(role_key) — checks the many-to-many user_roles table
-- SECURITY DEFINER so RLS on user_roles never causes recursive checks
-- ---------------------------------------------------------------------
-- (created after user_roles table exists — see 0002)
