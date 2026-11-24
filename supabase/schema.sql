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

-- Soft delete: deleted items go to "Recently deleted" for 7 days before they're removed for good.
alter table public.products add column if not exists deleted_at timestamptz;

-- Optional measurements per size, e.g. "Chest 36in, Length 26in".
alter table public.product_variants
  add column if not exists measurements text not null default ''
  check (char_length(measurements) <= 200);

-- Optional price per size. Empty means the size costs the item's price.
alter table public.product_variants
  add column if not exists price numeric(10,2) check (price >= 0);

-- Who an item is for: any of 'men', 'women', 'kids' (several for unisex). Empty means not set.
alter table public.products
  add column if not exists audiences text[] not null default '{}';
alter table public.products drop constraint if exists products_audiences_check;
alter table public.products add constraint products_audiences_check
  check (audiences <@ array['men', 'women', 'kids']::text[]);

-- Colors an item comes in. Optional: an item without colors keeps one stock row per size.
-- image_paths lists which of the item's photos show this color (empty = no photos of its own).
create table if not exists public.product_colors (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  hex         text check (hex ~ '^#[0-9a-fA-F]{6}$'),
  image_paths text[] not null default '{}',
  sort_order  integer not null default 0
);
create index if not exists product_colors_product_id_idx on public.product_colors(product_id);
create unique index if not exists product_colors_name_idx on public.product_colors(product_id, lower(name));

-- Each stock row is a size within a color (color_id is empty for items without colors).
-- Deleting a color removes its stock rows with it.
alter table public.product_variants
  add column if not exists color_id uuid references public.product_colors(id) on delete cascade;
create index if not exists product_variants_color_id_idx on public.product_variants(color_id);
alter table public.product_variants drop constraint if exists product_variants_product_id_size_key;
alter table public.product_variants drop constraint if exists product_variants_product_color_size_key;
alter table public.product_variants add constraint product_variants_product_color_size_key
  unique nulls not distinct (product_id, color_id, size);

-- Sales the admin records after confirming an order in Messenger.
-- Names, sizes and prices are copied in, so history stays readable after an item is edited or deleted.
create table if not exists public.sales (
  id            uuid primary key default gen_random_uuid(),
  sold_at       timestamptz not null default now(),
  order_code    text not null default '',
  product_id    uuid references public.products(id) on delete set null,
  variant_id    uuid references public.product_variants(id) on delete set null,
  product_name  text not null,
  size          text not null default '',
  category      text not null default '',
  qty           integer not null check (qty > 0),
  unit_price    numeric(10,2) not null check (unit_price >= 0)
);
create index if not exists sales_sold_at_idx on public.sales(sold_at desc);
-- The color sold, copied in like the size. Empty for items without colors.
alter table public.sales add column if not exists color text not null default '';

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

-- Record a sale: saves each line and lowers stock in one step, so it either fully happens or not at all.
-- items: [{ "variant_id": "...", "qty": 2, "unit_price": 450 }]
create or replace function public.record_sale(items jsonb, code text default '')
returns void language plpgsql security invoker set search_path = public as $$
declare
  it jsonb;
  v  record;
begin
  if not public.is_admin() then raise exception 'Only the admin can record sales'; end if;
  for it in select * from jsonb_array_elements(items) loop
    select pv.id, pv.size, pv.stock, p.id as product_id, p.name, p.category, coalesce(c.name, '') as color
      into v
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      left join public.product_colors c on c.id = pv.color_id
      where pv.id = (it->>'variant_id')::uuid
      for update of pv;
    if not found then raise exception 'An item in this sale no longer exists'; end if;
    if v.stock < (it->>'qty')::int then
      raise exception 'Only % left of % (%)', v.stock, v.name,
        concat_ws(', ', nullif(v.color, ''), nullif(v.size, 'One size'));
    end if;
    update public.product_variants set stock = stock - (it->>'qty')::int where id = v.id;
    insert into public.sales (order_code, product_id, variant_id, product_name, size, color, category, qty, unit_price)
      values (coalesce(code, ''), v.product_id, v.id, v.name, v.size, v.color, v.category,
              (it->>'qty')::int, (it->>'unit_price')::numeric);
  end loop;
end $$;

-- Undo a sale: removes it and puts the stock back (when that size still exists).
create or replace function public.undo_sale(sale_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare s record;
begin
  if not public.is_admin() then raise exception 'Only the admin can undo sales'; end if;
  delete from public.sales where id = sale_id returning * into s;
  if not found then return; end if;
  if s.variant_id is not null then
    update public.product_variants set stock = stock + s.qty where id = s.variant_id;
  end if;
end $$;

-- ---------- Row Level Security ----------
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_colors   enable row level security;
alter table public.admins           enable row level security;
alter table public.sales            enable row level security;

drop policy if exists "products: public read"  on public.products;
drop policy if exists "products: admin write"  on public.products;
-- Shoppers never see deleted items; the admin still can (for "Recently deleted").
create policy "products: public read" on public.products for select
  using (deleted_at is null or public.is_admin());
create policy "products: admin write" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "variants: public read" on public.product_variants;
drop policy if exists "variants: admin write" on public.product_variants;
create policy "variants: public read" on public.product_variants for select using (true);
create policy "variants: admin write" on public.product_variants for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "colors: public read" on public.product_colors;
drop policy if exists "colors: admin write" on public.product_colors;
create policy "colors: public read" on public.product_colors for select using (true);
create policy "colors: admin write" on public.product_colors for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sales: admin only" on public.sales;
create policy "sales: admin only" on public.sales for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins: self read" on public.admins;
create policy "admins: self read" on public.admins for select using (user_id = auth.uid());

-- ---------- Table access ----------
-- Newer Supabase projects don't give the website any access to new tables by default
-- ("permission denied for table ..."). These grants open the door; the RLS policies above
-- still decide who can actually read or change each row.
grant usage on schema public to anon, authenticated;
grant select on public.products, public.product_variants, public.product_colors to anon, authenticated;
grant insert, update, delete on public.products, public.product_variants, public.product_colors to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant select, insert, delete on public.sales to authenticated;
grant execute on function public.record_sale(jsonb, text) to authenticated;
grant execute on function public.undo_sale(uuid) to authenticated;

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
