-- Run this once in the Supabase SQL Editor for the project used by Smart Kisan Bharat.
-- It creates the relational tables queried by the web app and keeps role assignment
-- server-controlled: sign-up can create farmer/buyer profiles only.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('farmer', 'buyer', 'government', 'admin')),
  display_name text not null default 'New member',
  business_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  market text not null check (market in ('crops', 'plants')),
  crop text not null,
  category text not null,
  quantity numeric(14, 2) not null check (quantity > 0),
  unit text not null,
  location text not null,
  state text,
  district text,
  radius_km integer check (radius_km is null or radius_km > 0),
  price numeric(14, 2) not null check (price > 0),
  msp numeric(14, 2) check (msp is null or msp >= 0),
  quality numeric(4, 2) check (quality is null or (quality >= 0 and quality <= 10)),
  status text not null default 'pending' check (status in ('pending', 'live', 'sold', 'closed')),
  certified boolean not null default false,
  image_url text,
  posted_at timestamptz not null default now()
);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  buyer_display text not null default 'Verified buyer',
  buyer_type text not null default 'Buyer',
  amount numeric(14, 2) not null check (amount > 0),
  quantity numeric(14, 2) not null check (quantity > 0),
  status text not null default 'active' check (status in ('active', 'accepted', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'SKB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  bid_id uuid not null unique references public.bids(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  quantity numeric(14, 2) not null check (quantity > 0),
  status text not null default 'payment_pending'
    check (status in ('payment_pending', 'pickup_scheduled', 'in_transit', 'delivered', 'disputed')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('bid', 'order')),
  title text not null,
  detail text not null,
  related_bid_id uuid references public.bids(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists listings_market_status_posted_idx
  on public.listings (market, status, posted_at desc);
create index if not exists listings_farmer_status_idx
  on public.listings (farmer_id, status);
create index if not exists bids_listing_status_amount_idx
  on public.bids (listing_id, status, amount desc);
create index if not exists bids_buyer_created_idx
  on public.bids (buyer_id, created_at desc);
create index if not exists orders_buyer_created_idx
  on public.orders (buyer_id, created_at desc);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to authenticated;

create or replace function public.create_marketplace_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  if requested_role is null or requested_role not in ('farmer', 'buyer') then
    requested_role := 'farmer';
  end if;

  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    requested_role,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'New member')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_marketplace_profile on auth.users;
create trigger create_marketplace_profile
after insert on auth.users
for each row execute procedure public.create_marketplace_profile();

insert into public.profiles (id, role, display_name)
select
  users.id,
  case when users.raw_user_meta_data ->> 'role' = 'buyer' then 'buyer' else 'farmer' end,
  coalesce(nullif(users.raw_user_meta_data ->> 'display_name', ''), 'New member')
from auth.users as users
on conflict (id) do nothing;

create or replace function public.set_bid_display()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  select coalesce(nullif(display_name, ''), 'Verified buyer'),
         case when role = 'buyer' then 'Buyer' else role end
    into new.buyer_display, new.buyer_type
    from public.profiles
   where id = new.buyer_id;
  return new;
end;
$$;

drop trigger if exists set_bid_display on public.bids;
create trigger set_bid_display
before insert on public.bids
for each row execute procedure public.set_bid_display();

create or replace function public.notify_listing_owner_of_bid()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.notifications (user_id, type, title, detail, related_bid_id)
  select listings.farmer_id,
         'bid',
         'New bid received',
         format('A buyer bid ₹%s on %s.', new.amount, listings.crop),
         new.id
    from public.listings
   where listings.id = new.listing_id;
  return new;
end;
$$;

drop trigger if exists notify_listing_owner_of_bid on public.bids;
create trigger notify_listing_owner_of_bid
after insert on public.bids
for each row execute procedure public.notify_listing_owner_of_bid();

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.bids enable row level security;
alter table public.orders enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_read_self_or_official on public.profiles;
create policy profiles_read_self_or_official on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.current_profile_role() in ('government', 'admin'));

drop policy if exists listings_read_market_or_owned on public.listings;
create policy listings_read_market_or_owned on public.listings
  for select to authenticated
  using (
    status = 'live'
    or farmer_id = auth.uid()
    or public.current_profile_role() in ('government', 'admin')
  );

drop policy if exists listings_create_as_farmer on public.listings;
create policy listings_create_as_farmer on public.listings
  for insert to authenticated
  with check (
    farmer_id = auth.uid()
    and public.current_profile_role() = 'farmer'
    and status = 'pending'
  );

drop policy if exists listings_update_owner_or_admin on public.listings;
create policy listings_update_owner_or_admin on public.listings
  for update to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

drop policy if exists bids_read_participant_or_official on public.bids;
create policy bids_read_participant_or_official on public.bids
  for select to authenticated
  using (
    buyer_id = auth.uid()
    or exists (
      select 1 from public.listings
      where listings.id = bids.listing_id and listings.farmer_id = auth.uid()
    )
    or public.current_profile_role() in ('government', 'admin')
  );

drop policy if exists bids_create_as_buyer on public.bids;
create policy bids_create_as_buyer on public.bids
  for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and public.current_profile_role() = 'buyer'
    and exists (
      select 1 from public.listings
      where listings.id = bids.listing_id and listings.status = 'live'
    )
  );

drop policy if exists orders_read_participants on public.orders;
create policy orders_read_participants on public.orders
  for select to authenticated
  using (
    buyer_id = auth.uid()
    or farmer_id = auth.uid()
    or public.current_profile_role() in ('government', 'admin')
  );

drop policy if exists notifications_read_owner on public.notifications;
create policy notifications_read_owner on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_owner on public.notifications;
create policy notifications_update_owner on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.accept_marketplace_bid(p_bid_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target_listing uuid;
  listing_owner uuid;
  bid_buyer uuid;
  bid_quantity numeric(14, 2);
begin
  select bids.listing_id, listings.farmer_id, bids.buyer_id, bids.quantity
    into target_listing, listing_owner, bid_buyer, bid_quantity
    from public.bids
    join public.listings on listings.id = bids.listing_id
   where bids.id = p_bid_id
     and bids.status = 'active'
     and listings.status = 'live'
   for update of bids, listings;

  if target_listing is null then
    raise exception 'This bid is no longer active.';
  end if;
  if listing_owner <> auth.uid() and public.current_profile_role() <> 'admin' then
    raise exception 'Only the listing owner or an administrator can accept this bid.';
  end if;

  update public.bids
     set status = case when id = p_bid_id then 'accepted' else 'closed' end
   where listing_id = target_listing and status = 'active';
  update public.listings set status = 'sold' where id = target_listing;

  insert into public.orders (bid_id, listing_id, buyer_id, farmer_id, quantity)
  values (p_bid_id, target_listing, bid_buyer, listing_owner, bid_quantity);

  insert into public.notifications (user_id, type, title, detail, related_bid_id)
  values
    (bid_buyer, 'order', 'Your bid was accepted', 'The farmer accepted your offer. Order tracking is now available.', p_bid_id),
    (listing_owner, 'order', 'Sale confirmed', 'Your listing has an accepted bid. Order tracking is now available.', p_bid_id);

  return p_bid_id;
end;
$$;

revoke all on function public.accept_marketplace_bid(uuid) from public;
grant execute on function public.accept_marketplace_bid(uuid) to authenticated;

create or replace view public.marketplace_metrics as
select
  (select count(*)::bigint from public.profiles where role = 'farmer') as farmers,
  (select count(*)::bigint from public.profiles where role = 'buyer') as buyers,
  (select count(*)::bigint from public.listings where status = 'live') as market_listings,
  (select count(*)::bigint from public.bids where status = 'active') as active_bids,
  (select coalesce(sum(amount * quantity), 0)::numeric(18, 2)
     from public.bids where status = 'accepted') as transaction_value;

grant select on public.marketplace_metrics to authenticated;
grant select on public.profiles, public.listings, public.bids, public.orders, public.notifications to authenticated;
grant insert on public.listings, public.bids to authenticated;
grant update on public.listings to authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke all on public.profiles, public.listings, public.bids, public.orders, public.notifications from anon, public;
grant select on public.marketplace_metrics to authenticated;
revoke all on public.marketplace_metrics from anon, public;

comment on view public.marketplace_metrics is
  'Aggregate counts only; queried by authenticated Smart Kisan dashboards.';