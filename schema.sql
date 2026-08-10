
-- THTTEX Ready Stock Fabric Program – Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users a where a.user_id = auth.uid());
$$;

grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  content jsonb not null default '{}'::jsonb,
  fabric_map jsonb not null default '{}'::jsonb,
  representative_groups jsonb not null default '[]'::jsonb,
  initialized boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  group_id text not null,
  fabric_code text,
  lot_code text,
  composition text,
  width text,
  color text,
  finish text,
  qty_m numeric not null default 0,
  qty_bucket text,
  reference_price text,
  featured boolean not null default false,
  active boolean not null default true
);

create table if not exists public.sales_contacts (
  id text primary key,
  name text,
  role text,
  email text,
  phone text,
  other text,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.images (
  image_key text primary key,
  storage_path text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.products enable row level security;
alter table public.sales_contacts enable row level security;
alter table public.images enable row level security;

drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select using (true);

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (active = true or public.is_admin());

drop policy if exists "public read contacts" on public.sales_contacts;
create policy "public read contacts" on public.sales_contacts for select using (active = true or public.is_admin());

drop policy if exists "public read images" on public.images;
create policy "public read images" on public.images for select using (true);

drop policy if exists "admin manage settings" on public.site_settings;
create policy "admin manage settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage products" on public.products;
create policy "admin manage products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage contacts" on public.sales_contacts;
create policy "admin manage contacts" on public.sales_contacts for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage images" on public.images;
create policy "admin manage images" on public.images for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id,name,public)
values ('thttex-stock-images','thttex-stock-images',true)
on conflict (id) do update set public = true;

drop policy if exists "THTTEX public image read" on storage.objects;
create policy "THTTEX public image read" on storage.objects
for select using (bucket_id = 'thttex-stock-images');

drop policy if exists "THTTEX admin image insert" on storage.objects;
create policy "THTTEX admin image insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'thttex-stock-images' and public.is_admin());

drop policy if exists "THTTEX admin image update" on storage.objects;
create policy "THTTEX admin image update" on storage.objects
for update to authenticated
using (bucket_id = 'thttex-stock-images' and public.is_admin())
with check (bucket_id = 'thttex-stock-images' and public.is_admin());

drop policy if exists "THTTEX admin image delete" on storage.objects;
create policy "THTTEX admin image delete" on storage.objects
for delete to authenticated
using (bucket_id = 'thttex-stock-images' and public.is_admin());

-- After creating an Admin user in Authentication > Users:
-- insert into public.admin_users(user_id)
-- values ('YOUR_AUTH_USER_UUID')
-- on conflict do nothing;
