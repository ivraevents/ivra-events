-- =====================================================================
-- Migration 0002: Profiles, Roles, User-Roles, Categories
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles — one row per auth.users, created by trigger on signup
-- ---------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  mobile            citext,
  email             citext,
  avatar_url        text,
  profile_complete  boolean not null default false,
  is_suspended      boolean not null default false,
  suspended_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index profiles_mobile_key on public.profiles (mobile) where mobile is not null;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user is created
-- (covers both Google OAuth and Email OTP sign-ins/sign-ups)
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, mobile)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    new.phone
  )
  on conflict (id) do update
    set email = excluded.email,
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- roles — fixed catalogue, seeded below
-- ---------------------------------------------------------------------
create table public.roles (
  key         text primary key,               -- 'user' | 'vendor' | 'canopy_provider' | 'game_provider' | 'admin' | 'support_manager' | 'support_agent'
  label       text not null,
  description text
);

insert into public.roles (key, label, description) values
  ('user',             'User',              'Default role for every signed-in account'),
  ('vendor',           'Vendor / Stall Provider', 'Can book stalls at events'),
  ('canopy_provider',  'Canopy Provider',   'Provides canopies/tents for events'),
  ('game_provider',    'Game / Entertainment Provider', 'Provides games or entertainment at events'),
  ('admin',            'Administrator',     'Full system access'),
  ('support_manager',  'Support Manager',   'Manages support staff and escalations'),
  ('support_agent',    'Support Agent',     'Handles support tickets; no financial/document access');

-- ---------------------------------------------------------------------
-- user_roles — many-to-many
-- ---------------------------------------------------------------------
create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role_key    text not null references public.roles(key) on delete restrict,
  granted_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (user_id, role_key)
);

-- Every new user gets the base 'user' role automatically
create or replace function public.grant_default_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role_key)
  values (new.id, 'user')
  on conflict do nothing;
  return new;
end;
$$;

create trigger trg_profiles_default_role
  after insert on public.profiles
  for each row execute function public.grant_default_role();

-- ---------------------------------------------------------------------
-- has_role() / is_admin() / has_any_role() — SECURITY DEFINER to avoid
-- RLS recursion when policies on other tables check role membership
-- ---------------------------------------------------------------------
create or replace function public.has_role(p_role text, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user and ur.role_key = p_role
  );
$$;

create or replace function public.has_any_role(p_roles text[], p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user and ur.role_key = any(p_roles)
  );
$$;

create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin', p_user);
$$;

create or replace function public.is_support_staff(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin','support_manager','support_agent'], p_user);
$$;

-- ---------------------------------------------------------------------
-- categories — admin-configurable, used by vendors / monopoly / discounts
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

insert into public.categories (name, slug, sort_order) values
  ('Fashion', 'fashion', 1),
  ('Clothing', 'clothing', 2),
  ('Jewellery', 'jewellery', 3),
  ('Food', 'food', 4),
  ('Bakery', 'bakery', 5),
  ('Toys', 'toys', 6),
  ('Handmade Products', 'handmade-products', 7),
  ('NGO', 'ngo', 8),
  ('Promotional', 'promotional', 9),
  ('Home & Lifestyle', 'home-lifestyle', 10),
  ('Art & Craft', 'art-craft', 11),
  ('Beauty', 'beauty', 12),
  ('Other', 'other', 99);
