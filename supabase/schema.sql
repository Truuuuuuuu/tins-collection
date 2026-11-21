-- Tin's Collection — run this once in Supabase → SQL Editor.
-- Safe to re-run: it drops and recreates the policies.

-- ---------- Tables ----------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 120),
  description  text not null default '',
  price        numeric(10,2) not null check (price >= 0),
  category     text not null default '',
  image_paths  text[] not null default '{}',
  is_sold_out  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  size        text not null check (char_length(size) between 1 and 30),
  stock       integer not null default 0 check (stock >= 0),
  sort_order  integer not null default 0,
  unique (product_id, size)
);

-- Brand new or pre-loved. Added later, so existing databases get it on re-run.
alter table public.products
  add column if not exists condition text not null default 'new'
  check (condition in ('new', 'preloved'));

create index if not exists product_variants_product_id_idx on public.product_variants(product_id);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Is the current user an admin?
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Row Level Security ----------
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.admins           enable row level security;

drop policy if exists "products: public read"  on public.products;
drop policy if exists "products: admin write"  on public.products;
create policy "products: public read" on public.products for select using (true);
create policy "products: admin write" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "variants: public read" on public.product_variants;
drop policy if exists "variants: admin write" on public.product_variants;
create policy "variants: public read" on public.product_variants for select using (true);
create policy "variants: admin write" on public.product_variants for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins: self read" on public.admins;
create policy "admins: self read" on public.admins for select using (user_id = auth.uid());

-- ---------- Storage: product images ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "images: public read"   on storage.objects;
drop policy if exists "images: admin read"    on storage.objects;
drop policy if exists "images: admin insert"  on storage.objects;
drop policy if exists "images: admin update"  on storage.objects;
drop policy if exists "images: admin delete"  on storage.objects;
-- No public SELECT policy: the bucket is public, so photo links work for everyone
-- without one, and a public SELECT would let anyone list every file.
-- Admins still need SELECT, because Supabase requires it to delete files.
create policy "images: admin read"   on storage.objects for select
  using (bucket_id = 'product-images' and public.is_admin());
create policy "images: admin insert" on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "images: admin update" on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin());
create policy "images: admin delete" on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------- Make yourself admin ----------
-- 1. Authentication → Users → "Add user" (email + password, auto-confirm).
-- 2. Run this with that email:
-- insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com'
-- on conflict do nothing;
