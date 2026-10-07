create table public.paystack_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  reference text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (event, reference)
);
grant all on public.paystack_events to service_role;
grant select on public.paystack_events to authenticated;
alter table public.paystack_events enable row level security;
create policy "admin events read" on public.paystack_events for select to authenticated using (public.has_role(auth.uid(),'admin'));

create unique index if not exists transactions_reference_key2 on public.transactions(reference);

-- Idempotent deposit credit. Only callable by service role.
create or replace function public.apply_deposit(_reference text, _amount_kobo bigint, _provider_status text)
returns text language plpgsql security definer set search_path = public as $$
declare t record;
begin
  select * into t from transactions where reference=_reference and type='deposit' for update;
  if not found then return 'unknown_reference'; end if;
  if t.status <> 'pending' then return 'already_processed'; end if;
  if _provider_status = 'success' then
    if round(t.amount*100) <> _amount_kobo then
      update transactions set status='failed', metadata = metadata || jsonb_build_object('mismatch_kobo', _amount_kobo) where id=t.id;
      return 'amount_mismatch';
    end if;
    update transactions set status='successful', metadata = metadata || jsonb_build_object('paystack_status',_provider_status,'settled_at',now()) where id=t.id;
    update wallets set balance_ngn = balance_ngn + t.amount, updated_at=now() where user_id=t.user_id;
    insert into notifications(user_id,title,body) values (t.user_id,'Wallet funded','₦'||t.amount||' was added to your wallet.');
    return 'credited';
  else
    update transactions set status='failed', metadata = metadata || jsonb_build_object('paystack_status',_provider_status) where id=t.id;
    return 'failed';
  end if;
end; $$;

-- Debit wallet and create pending withdrawal.
create or replace function public.start_withdrawal(_user uuid, _amount numeric, _bank_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare bal numeric; b record; ref text;
begin
  if _amount < 100 then raise exception 'Minimum withdrawal is ₦100'; end if;
  select * into b from bank_accounts where id=_bank_id and user_id=_user;
  if not found then raise exception 'Bank account not found'; end if;
  select balance_ngn into bal from wallets where user_id=_user for update;
  if bal < _amount then raise exception 'Insufficient balance'; end if;
  update wallets set balance_ngn = balance_ngn - _amount, updated_at=now() where user_id=_user;
  ref := 'WD-' || replace(gen_random_uuid()::text,'-','');
  insert into transactions(user_id,type,status,currency,amount,description,reference,metadata)
    values (_user,'withdrawal','pending','NGN',_amount,'Withdrawal to '||b.bank_name||' ****'||right(b.account_number,4),ref,jsonb_build_object('bank_id',_bank_id));
  return ref;
end; $$;

-- Idempotent withdrawal settlement; refunds on failure.
create or replace function public.settle_withdrawal(_reference text, _success boolean, _provider_status text)
returns text language plpgsql security definer set search_path = public as $$
declare t record;
begin
  select * into t from transactions where reference=_reference and type='withdrawal' for update;
  if not found then return 'unknown_reference'; end if;
  if t.status <> 'pending' then return 'already_processed'; end if;
  if _success then
    update transactions set status='successful', metadata = metadata || jsonb_build_object('paystack_status',_provider_status) where id=t.id;
    insert into notifications(user_id,title,body) values (t.user_id,'Withdrawal sent','₦'||t.amount||' is on its way to your bank.');
    return 'settled';
  else
    update transactions set status='failed', metadata = metadata || jsonb_build_object('paystack_status',_provider_status) where id=t.id;
    update wallets set balance_ngn = balance_ngn + t.amount, updated_at=now() where user_id=t.user_id;
    insert into notifications(user_id,title,body) values (t.user_id,'Withdrawal failed','₦'||t.amount||' was returned to your wallet.');
    return 'refunded';
  end if;
end; $$;

revoke execute on function public.apply_deposit, public.start_withdrawal, public.settle_withdrawal from anon, authenticated, public;
grant execute on function public.apply_deposit, public.start_withdrawal, public.settle_withdrawal to service_role;