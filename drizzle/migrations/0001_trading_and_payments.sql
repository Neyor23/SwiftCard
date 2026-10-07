create type public.sale_status as enum ('pending','approved','rejected');

create table public.gift_card_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  brand text not null,
  country text not null default 'US',
  card_type text not null,
  card_value numeric(10,2) not null check (card_value > 0),
  quantity int not null check (quantity between 1 and 50),
  payout_currency public.currency_code not null default 'NGN',
  expected_payout numeric(14,2) not null,
  card_codes text,
  image_paths text[] not null default '{}',
  status public.sale_status not null default 'pending',
  admin_note text,
  transaction_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.gift_card_sales to authenticated;
grant all on public.gift_card_sales to service_role;
alter table public.gift_card_sales enable row level security;
create policy "own sales read" on public.gift_card_sales for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create table public.gift_card_products (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  country text not null default 'US',
  denomination numeric(10,2) not null,
  price_ngn numeric(14,2) not null,
  price_usd numeric(10,2) not null,
  active boolean not null default true
);
grant select on public.gift_card_products to anon, authenticated;
grant insert, update, delete on public.gift_card_products to authenticated;
grant all on public.gift_card_products to service_role;
alter table public.gift_card_products enable row level security;
create policy "products read" on public.gift_card_products for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "products admin" on public.gift_card_products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.gift_card_codes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.gift_card_products(id) on delete cascade,
  code text not null,
  pin text,
  sold_to uuid,
  sold_at timestamptz,
  order_txn uuid,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.gift_card_codes to authenticated;
grant all on public.gift_card_codes to service_role;
alter table public.gift_card_codes enable row level security;
create policy "codes owner read" on public.gift_card_codes for select to authenticated using (sold_to = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "codes admin insert" on public.gift_card_codes for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "codes admin delete" on public.gift_card_codes for delete to authenticated using (public.has_role(auth.uid(),'admin') and sold_to is null);

create or replace function public.product_stock()
returns table(product_id uuid, available bigint) language sql stable security definer set search_path = public as $$
  select product_id, count(*) from gift_card_codes where sold_to is null group by product_id $$;
grant execute on function public.product_stock() to anon, authenticated;

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  bank_name text not null,
  bank_code text not null,
  account_number text not null,
  account_name text not null,
  recipient_code text,
  created_at timestamptz not null default now()
);
grant select, delete on public.bank_accounts to authenticated;
grant all on public.bank_accounts to service_role;
alter table public.bank_accounts enable row level security;
create policy "own banks read" on public.bank_accounts for select to authenticated using (auth.uid() = user_id);
create policy "own banks delete" on public.bank_accounts for delete to authenticated using (auth.uid() = user_id);

create table public.virtual_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'pending',
  provider_card_id text,
  last4 text,
  brand text default 'Visa',
  balance_usd numeric(10,2) not null default 0,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);
grant select on public.virtual_cards to authenticated;
grant all on public.virtual_cards to service_role;
alter table public.virtual_cards enable row level security;
create policy "own cards read" on public.virtual_cards for select to authenticated using (auth.uid() = user_id);

create table public.app_settings (
  key text primary key,
  value jsonb not null
);
grant select on public.app_settings to anon, authenticated;
grant insert, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "settings read" on public.app_settings for select to anon, authenticated using (true);
create policy "settings admin" on public.app_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.app_settings values ('usd_ngn_rate', '1550'::jsonb);

create policy "admin profile read" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.submit_sale(_brand text, _country text, _card_type text, _value numeric, _qty int, _currency public.currency_code, _codes text, _images text[])
returns uuid language plpgsql security definer set search_path = public as $$
declare r record; payout numeric; sid uuid; tid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if _value <= 0 or _value > 5000 or _qty < 1 or _qty > 50 then raise exception 'Invalid amount'; end if;
  select * into r from gift_card_rates where brand=_brand and country=_country and card_type=_card_type and active;
  if not found then raise exception 'No rate for this card'; end if;
  payout := case when _currency='NGN' then round(_value*_qty*r.rate_ngn,2) else round(_value*_qty*r.rate_usd,2) end;
  insert into transactions(user_id,type,status,currency,amount,description)
    values (auth.uid(),'sell','pending',_currency,payout,_brand||' '||_card_type||' $'||_value||' x'||_qty) returning id into tid;
  insert into gift_card_sales(user_id,brand,country,card_type,card_value,quantity,payout_currency,expected_payout,card_codes,image_paths,transaction_id)
    values (auth.uid(),_brand,_country,_card_type,_value,_qty,_currency,payout,left(_codes,4000),coalesce(_images,'{}'),tid) returning id into sid;
  insert into notifications(user_id,title,body) values (auth.uid(),'Card submitted','Your '||_brand||' card is under review.');
  return sid;
end; $$;

create or replace function public.review_sale(_sale_id uuid, _approve boolean, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if not has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  select * into s from gift_card_sales where id=_sale_id for update;
  if not found or s.status <> 'pending' then raise exception 'Not reviewable'; end if;
  update gift_card_sales set status = case when _approve then 'approved'::sale_status else 'rejected'::sale_status end, admin_note=_note where id=_sale_id;
  update transactions set status = case when _approve then 'successful'::txn_status else 'failed'::txn_status end where id=s.transaction_id;
  if _approve then
    if s.payout_currency='NGN' then update wallets set balance_ngn=balance_ngn+s.expected_payout, updated_at=now() where user_id=s.user_id;
    else update wallets set balance_usd=balance_usd+s.expected_payout, updated_at=now() where user_id=s.user_id; end if;
    insert into notifications(user_id,title,body) values (s.user_id,'Card approved','Your '||s.brand||' card was approved and your wallet was credited.');
  else
    insert into notifications(user_id,title,body) values (s.user_id,'Card rejected',coalesce(_note,'Your '||s.brand||' card could not be verified.'));
  end if;
end; $$;

create or replace function public.buy_gift_card(_product_id uuid, _qty int, _currency public.currency_code)
returns uuid language plpgsql security definer set search_path = public as $$
declare p record; total numeric; bal numeric; tid uuid; avail int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if _qty < 1 or _qty > 10 then raise exception 'Invalid quantity'; end if;
  select * into p from gift_card_products where id=_product_id and active;
  if not found then raise exception 'Product unavailable'; end if;
  select count(*) into avail from gift_card_codes where product_id=_product_id and sold_to is null;
  if avail < _qty then raise exception 'Only % in stock', avail; end if;
  total := case when _currency='NGN' then p.price_ngn*_qty else p.price_usd*_qty end;
  select case when _currency='NGN' then balance_ngn else balance_usd end into bal from wallets where user_id=auth.uid() for update;
  if bal < total then raise exception 'Insufficient wallet balance'; end if;
  if _currency='NGN' then update wallets set balance_ngn=balance_ngn-total, updated_at=now() where user_id=auth.uid();
  else update wallets set balance_usd=balance_usd-total, updated_at=now() where user_id=auth.uid(); end if;
  insert into transactions(user_id,type,status,currency,amount,description)
    values (auth.uid(),'buy','successful',_currency,total,p.brand||' $'||p.denomination||' x'||_qty) returning id into tid;
  update gift_card_codes set sold_to=auth.uid(), sold_at=now(), order_txn=tid
    where id in (select id from gift_card_codes where product_id=_product_id and sold_to is null order by created_at limit _qty for update skip locked);
  insert into notifications(user_id,title,body) values (auth.uid(),'Purchase complete','Your '||p.brand||' codes are ready.');
  return tid;
end; $$;

create or replace function public.fund_virtual_card(_card_id uuid, _amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare bal numeric;
begin
  if _amount <= 0 then raise exception 'Invalid amount'; end if;
  perform 1 from virtual_cards where id=_card_id and user_id=auth.uid() and status='active';
  if not found then raise exception 'Card not active yet'; end if;
  select balance_usd into bal from wallets where user_id=auth.uid() for update;
  if bal < _amount then raise exception 'Insufficient USD balance'; end if;
  update wallets set balance_usd=balance_usd-_amount where user_id=auth.uid();
  update virtual_cards set balance_usd=balance_usd+_amount where id=_card_id;
  insert into transactions(user_id,type,status,currency,amount,description) values (auth.uid(),'card_funding','successful','USD',_amount,'Virtual card top-up');
end; $$;

create or replace function public.request_virtual_card()
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into cid from virtual_cards where user_id=auth.uid() limit 1;
  if found then return cid; end if;
  insert into virtual_cards(user_id) values (auth.uid()) returning id into cid;
  insert into notifications(user_id,title,body) values (auth.uid(),'Virtual card requested','We will notify you when your USD card is issued.');
  return cid;
end; $$;

create or replace function public.convert_currency(_from public.currency_code, _amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare rate numeric; bal numeric;
begin
  if _amount <= 0 then raise exception 'Invalid amount'; end if;
  select (value)::text::numeric into rate from app_settings where key='usd_ngn_rate';
  select case when _from='NGN' then balance_ngn else balance_usd end into bal from wallets where user_id=auth.uid() for update;
  if bal < _amount then raise exception 'Insufficient balance'; end if;
  if _from='NGN' then update wallets set balance_ngn=balance_ngn-_amount, balance_usd=balance_usd+round(_amount/rate,2) where user_id=auth.uid();
  else update wallets set balance_usd=balance_usd-_amount, balance_ngn=balance_ngn+round(_amount*rate,2) where user_id=auth.uid(); end if;
  insert into transactions(user_id,type,status,currency,amount,description) values (auth.uid(),'deposit','successful',case when _from='NGN' then 'USD'::currency_code else 'NGN'::currency_code end,case when _from='NGN' then round(_amount/rate,2) else round(_amount*rate,2) end,'Currency conversion');
end; $$;

revoke execute on function public.submit_sale, public.review_sale, public.buy_gift_card, public.fund_virtual_card, public.convert_currency, public.request_virtual_card from anon, public;
grant execute on function public.submit_sale, public.review_sale, public.buy_gift_card, public.fund_virtual_card, public.convert_currency, public.request_virtual_card to authenticated;

create policy "card images upload own" on storage.objects for insert to authenticated with check (bucket_id='card-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "card images read own or admin" on storage.objects for select to authenticated using (bucket_id='card-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

insert into public.gift_card_products (brand, country, denomination, price_ngn, price_usd) values
('Amazon','US',25,41000,26.5),('Amazon','US',50,81500,52.5),('Amazon','US',100,162000,104),
('Apple','US',25,41500,27),('Apple','US',50,82500,53),('Apple','US',100,164000,105),
('Steam','US',20,33000,21.5),('Steam','US',50,81500,52.5),
('Google Play','US',25,41000,26.5),('Google Play','US',50,81500,52.5),
('Walmart','US',50,81000,52),('Sephora','US',50,82000,52.5),('Nordstrom','US',100,162000,104),('iTunes','UK',25,52000,33.5);