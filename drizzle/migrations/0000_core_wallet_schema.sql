create type public.app_role as enum ('admin','user');
create type public.txn_type as enum ('buy','sell','deposit','withdrawal','card_funding');
create type public.txn_status as enum ('pending','successful','failed');
create type public.currency_code as enum ('NGN','USD');

create table public.profiles (
  id uuid primary key,
  full_name text,
  phone text,
  avatar_url text,
  preferred_currency public.currency_code not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.wallets (
  user_id uuid primary key,
  balance_ngn numeric(14,2) not null default 0,
  balance_usd numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.wallets to authenticated;
grant all on public.wallets to service_role;
alter table public.wallets enable row level security;
create policy "own wallet read" on public.wallets for select to authenticated using (auth.uid() = user_id);
create policy "admin wallet read" on public.wallets for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type public.txn_type not null,
  status public.txn_status not null default 'pending',
  currency public.currency_code not null default 'NGN',
  amount numeric(14,2) not null,
  description text,
  reference text unique default ('TXN-' || upper(substr(md5(random()::text),1,10))),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "own txn read" on public.transactions for select to authenticated using (auth.uid() = user_id);
create policy "admin txn read" on public.transactions for select to authenticated using (public.has_role(auth.uid(),'admin'));
create index on public.transactions (user_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notif read" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "own notif update" on public.notifications for update to authenticated using (auth.uid() = user_id);

create table public.gift_card_rates (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  country text not null default 'US',
  card_type text not null default 'ecode',
  rate_ngn numeric(10,2) not null,
  rate_usd numeric(6,4) not null,
  active boolean not null default true,
  unique (brand, country, card_type)
);
grant select on public.gift_card_rates to anon, authenticated;
grant insert, update, delete on public.gift_card_rates to authenticated;
grant all on public.gift_card_rates to service_role;
alter table public.gift_card_rates enable row level security;
create policy "rates public read" on public.gift_card_rates for select to anon, authenticated using (active);
create policy "admin rates manage" on public.gift_card_rates for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.gift_card_rates (brand, country, card_type, rate_ngn, rate_usd) values
('Apple','US','ecode',1150,0.78),('Apple','US','physical',1200,0.80),
('Amazon','US','ecode',1100,0.74),('Amazon','US','physical',1130,0.76),
('Steam','US','ecode',1180,0.79),('Steam','US','physical',1210,0.81),
('Google Play','US','ecode',980,0.66),('Google Play','US','physical',1000,0.67),
('iTunes','US','ecode',1140,0.77),('iTunes','US','physical',1190,0.79),
('Sephora','US','ecode',1050,0.70),('Sephora','US','physical',1080,0.72),
('Nordstrom','US','ecode',1020,0.68),('Nordstrom','US','physical',1060,0.71),
('Walmart','US','ecode',1070,0.72),('Walmart','US','physical',1100,0.74);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url');
  insert into public.wallets (user_id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  insert into public.notifications (user_id, title, body) values (new.id, 'Welcome to Vaultcard', 'Your wallet is ready. Start by selling a gift card or funding your wallet.');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();