-- BrazilProxy: saldo, pedidos e RLS.
-- Rode este script inteiro no SQL Editor do Supabase, com a role postgres.
-- Depois grave SUPABASE_SERVICE_ROLE_KEY apenas no ambiente do servidor.
-- Não use o prefixo VITE_. Essa chave nunca pode ir para o browser.
--
-- O script é idempotente: pode ser executado de novo.
-- Ele substitui as policies de profiles, proxies, transactions e orders.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'client',
  balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists role text not null default 'client';
alter table public.profiles add column if not exists balance numeric(14, 2) not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  order_id uuid,
  amount numeric(14, 2) not null,
  payment_method text not null,
  status text not null default 'pending',
  description text,
  external_id text,
  created_at timestamptz not null default now()
);

alter table public.transactions add column if not exists order_id uuid;
alter table public.transactions add column if not exists amount numeric(14, 2);
alter table public.transactions add column if not exists payment_method text;
alter table public.transactions add column if not exists status text not null default 'pending';
alter table public.transactions add column if not exists description text;
alter table public.transactions add column if not exists external_id text;
alter table public.transactions add column if not exists created_at timestamptz not null default now();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  external_id text not null,
  upstream_order_id text,
  service_id text not null,
  plan_id text not null,
  quantity integer not null,
  country text not null,
  protocol text,
  amount numeric(14, 2) not null,
  status text not null default 'pending',
  fulfillment_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check check (status in ('pending', 'paid', 'failed')),
  constraint orders_quantity_check check (quantity >= 1 and quantity <= 500),
  constraint orders_amount_check check (amount > 0)
);

alter table public.orders add column if not exists external_id text;
alter table public.orders add column if not exists upstream_order_id text;
alter table public.orders add column if not exists service_id text;
alter table public.orders add column if not exists plan_id text;
alter table public.orders add column if not exists quantity integer;
alter table public.orders add column if not exists country text;
alter table public.orders add column if not exists protocol text;
alter table public.orders add column if not exists amount numeric(14, 2);
alter table public.orders add column if not exists status text not null default 'pending';
alter table public.orders add column if not exists fulfillment_claimed_at timestamptz;
alter table public.orders add column if not exists created_at timestamptz not null default now();
alter table public.orders add column if not exists updated_at timestamptz not null default now();

create table if not exists public.proxies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid,
  upstream_order_id text,
  host text not null,
  port integer not null,
  username text not null,
  password text not null,
  gb_limit numeric not null default 0,
  gb_used numeric not null default 0,
  status text not null default 'active',
  protocol text,
  proxy_type text,
  country text,
  city text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.proxies add column if not exists order_id uuid;
alter table public.proxies add column if not exists upstream_order_id text;
alter table public.proxies add column if not exists host text;
alter table public.proxies add column if not exists port integer;
alter table public.proxies add column if not exists username text;
alter table public.proxies add column if not exists password text;
alter table public.proxies add column if not exists gb_limit numeric not null default 0;
alter table public.proxies add column if not exists gb_used numeric not null default 0;
alter table public.proxies add column if not exists status text not null default 'active';
alter table public.proxies add column if not exists protocol text;
alter table public.proxies add column if not exists proxy_type text;
alter table public.proxies add column if not exists country text;
alter table public.proxies add column if not exists city text;
alter table public.proxies add column if not exists expires_at timestamptz;
alter table public.proxies add column if not exists created_at timestamptz not null default now();

alter table public.proxies drop constraint if exists proxies_order_id_fkey;
alter table public.proxies
  add constraint proxies_order_id_fkey
  foreign key (order_id) references public.orders (id) on delete cascade;

alter table public.transactions drop constraint if exists transactions_order_id_fkey;
alter table public.transactions
  add constraint transactions_order_id_fkey
  foreign key (order_id) references public.orders (id) on delete restrict;

update public.transactions
set external_id = null
where external_id is not null and btrim(external_id) = '';

update public.transactions
set status = case
  when lower(coalesce(status, '')) in ('paid', 'pago', 'completed', 'approved') then 'paid'
  when lower(coalesce(status, '')) in ('failed', 'falhou', 'canceled', 'cancelled', 'refunded') then 'failed'
  else 'pending'
end
where status is null or lower(status) not in ('pending', 'paid', 'failed');

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'transactions'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.transactions drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.transactions
  add constraint transactions_status_check
  check (status in ('pending', 'paid', 'failed'));

do $$
begin
  alter table public.profiles
    add constraint profiles_balance_nonnegative check (balance >= 0);
exception
  when duplicate_object then null;
  when check_violation then
    raise notice 'profiles.balance tem valores negativos. A restrição não foi aplicada.';
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_role_check check (role in ('client', 'reseller', 'admin'));
exception
  when duplicate_object then null;
  when check_violation then
    raise notice 'profiles.role tem valores fora de client, reseller e admin. A restrição não foi aplicada.';
end $$;

create unique index if not exists orders_external_id_key on public.orders (external_id);
create unique index if not exists transactions_external_id_key on public.transactions (external_id);
create index if not exists orders_user_id_idx on public.orders (user_id, created_at desc);
create index if not exists transactions_user_created_idx on public.transactions (user_id, created_at desc);
create index if not exists proxies_user_id_idx on public.proxies (user_id);
create index if not exists proxies_order_id_idx on public.proxies (order_id);
create index if not exists proxies_upstream_order_id_idx on public.proxies (upstream_order_id);

create or replace function public.purchase_proxy_payload(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'host', pr.host,
          'port', pr.port,
          'username', pr.username,
          'password', pr.password,
          'expires_at', pr.expires_at
        )
        order by pr.id
      )
      from public.proxies pr
      where pr.order_id = p_order_id
    ),
    '[]'::jsonb
  );
$fn$;

create or replace function public.ledger_snapshot(p_order_id uuid, p_already boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_order public.orders%rowtype;
  v_tx_id uuid;
  v_balance numeric;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;

  select id into v_tx_id
  from public.transactions
  where order_id = p_order_id and amount < 0
  order by id
  limit 1;

  select balance into v_balance from public.profiles where id = v_order.user_id;

  return jsonb_build_object(
    'order_id', v_order.id,
    'transaction_id', v_tx_id,
    'balance', v_balance,
    'status', v_order.status,
    'already_exists', coalesce(p_already, false),
    'upstream_order_id', v_order.upstream_order_id,
    'proxies', public.purchase_proxy_payload(p_order_id)
  );
end;
$fn$;

create or replace function public.debit_purchase_balance(
  p_user_id uuid,
  p_amount numeric,
  p_external_id text,
  p_description text,
  p_service_id text,
  p_plan_id text,
  p_quantity integer,
  p_country text,
  p_protocol text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_amount numeric(14, 2);
  v_balance numeric;
  v_order_id uuid;
  v_owner uuid;
begin
  if p_user_id is null
    or p_external_id is null
    or char_length(btrim(p_external_id)) < 8
    or char_length(btrim(p_external_id)) > 128
    or btrim(p_external_id) !~ '^[A-Za-z0-9:_-]+$'
    or coalesce(btrim(p_service_id), '') = ''
    or coalesce(btrim(p_plan_id), '') = ''
    or coalesce(btrim(p_country), '') = ''
    or p_quantity is null
    or p_quantity < 1
    or p_quantity > 500
  then
    raise exception 'invalid_request' using errcode = 'P0001';
  end if;

  v_amount := round(p_amount, 2);
  if v_amount is null or v_amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  select o.id into v_order_id
  from public.transactions t
  join public.orders o on o.id = t.order_id
  where t.external_id = btrim(p_external_id);

  if v_order_id is not null then
    perform 1 from public.orders where id = v_order_id for update;
    select user_id into v_owner from public.orders where id = v_order_id;
    if v_owner is distinct from p_user_id then
      raise exception 'idempotency_conflict' using errcode = 'P0001';
    end if;
    return public.ledger_snapshot(v_order_id, true);
  end if;

  update public.profiles
  set balance = round(balance - v_amount, 2)
  where id = p_user_id and round(balance, 2) >= v_amount
  returning balance into v_balance;

  if v_balance is null then
    raise exception 'insufficient_balance' using errcode = 'P0001';
  end if;

  insert into public.orders (
    user_id, external_id, service_id, plan_id, quantity, country, protocol, amount, status
  ) values (
    p_user_id,
    btrim(p_external_id),
    btrim(p_service_id),
    btrim(p_plan_id),
    p_quantity,
    upper(btrim(p_country)),
    nullif(btrim(coalesce(p_protocol, '')), ''),
    v_amount,
    'pending'
  )
  returning id into v_order_id;

  insert into public.transactions (
    user_id, order_id, amount, payment_method, status, description, external_id
  ) values (
    p_user_id,
    v_order_id,
    -v_amount,
    'balance',
    'pending',
    coalesce(nullif(btrim(coalesce(p_description, '')), ''), 'Compra de proxy'),
    btrim(p_external_id)
  );

  return public.ledger_snapshot(v_order_id, false);
exception
  when unique_violation then
    raise exception 'idempotency_conflict' using errcode = 'P0001';
end;
$fn$;

create or replace function public.claim_purchase_fulfillment(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id uuid;
  v_status text;
  v_upstream text;
  v_claimed_at timestamptz;
begin
  select user_id into v_user_id from public.orders where id = p_order_id;
  if v_user_id is null then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id = v_user_id for update;

  select status, upstream_order_id, fulfillment_claimed_at
  into v_status, v_upstream, v_claimed_at
  from public.orders
  where id = p_order_id
  for update;

  if v_status = 'paid' then
    return jsonb_build_object('claimed', false, 'reason', 'paid', 'upstream_order_id', v_upstream);
  end if;
  if v_status = 'failed' then
    return jsonb_build_object('claimed', false, 'reason', 'failed', 'upstream_order_id', v_upstream);
  end if;
  if v_upstream is not null then
    return jsonb_build_object('claimed', false, 'reason', 'upstream_known', 'upstream_order_id', v_upstream);
  end if;
  if v_claimed_at is not null and v_claimed_at > now() - interval '2 minutes' then
    return jsonb_build_object('claimed', false, 'reason', 'in_progress', 'upstream_order_id', null);
  end if;

  update public.orders
  set fulfillment_claimed_at = now(), updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('claimed', true, 'reason', 'claimed', 'upstream_order_id', null);
end;
$fn$;

create or replace function public.record_upstream_order(p_order_id uuid, p_upstream_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id uuid;
  v_status text;
  v_upstream text;
  v_next text;
begin
  v_next := btrim(coalesce(p_upstream_order_id, ''));
  if v_next = '' then
    raise exception 'invalid_request' using errcode = 'P0001';
  end if;

  select user_id into v_user_id from public.orders where id = p_order_id;
  if v_user_id is null then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id = v_user_id for update;

  select status, upstream_order_id
  into v_status, v_upstream
  from public.orders
  where id = p_order_id
  for update;

  if v_status = 'failed' then
    raise exception 'order_failed' using errcode = 'P0001';
  end if;
  if v_upstream is not null and v_upstream is distinct from v_next then
    raise exception 'upstream_conflict' using errcode = 'P0001';
  end if;

  update public.orders
  set upstream_order_id = v_next, updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('order_id', p_order_id, 'upstream_order_id', v_next, 'status', v_status);
end;
$fn$;

create or replace function public.complete_purchase(
  p_order_id uuid,
  p_upstream_order_id text,
  p_proxies jsonb,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id uuid;
  v_status text;
  v_upstream text;
  v_next text;
  item jsonb;
begin
  v_next := btrim(coalesce(p_upstream_order_id, ''));
  if v_next = '' or p_proxies is null or jsonb_typeof(p_proxies) <> 'array' or jsonb_array_length(p_proxies) = 0 then
    raise exception 'proxies_required' using errcode = 'P0001';
  end if;

  select user_id into v_user_id from public.orders where id = p_order_id;
  if v_user_id is null then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id = v_user_id for update;

  select status, upstream_order_id
  into v_status, v_upstream
  from public.orders
  where id = p_order_id
  for update;

  if v_status = 'paid' then
    if v_upstream is not null and v_upstream is distinct from v_next then
      raise exception 'upstream_conflict' using errcode = 'P0001';
    end if;
    return public.ledger_snapshot(p_order_id, true);
  end if;
  if v_status = 'failed' then
    raise exception 'order_failed' using errcode = 'P0001';
  end if;
  if v_upstream is not null and v_upstream is distinct from v_next then
    raise exception 'upstream_conflict' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.proxies where order_id = p_order_id) then
    for item in select value from jsonb_array_elements(p_proxies) as proxy_item(value)
    loop
      if coalesce(item->>'host', '') = ''
        or coalesce(item->>'username', '') = ''
        or coalesce(item->>'password', '') = ''
        or coalesce(item->>'port', '') !~ '^[0-9]+$'
      then
        raise exception 'invalid_proxy' using errcode = 'P0001';
      end if;

      insert into public.proxies (
        user_id,
        order_id,
        upstream_order_id,
        host,
        port,
        username,
        password,
        gb_limit,
        gb_used,
        status,
        protocol,
        proxy_type,
        country,
        expires_at
      ) values (
        v_user_id,
        p_order_id,
        v_next,
        item->>'host',
        (item->>'port')::integer,
        item->>'username',
        item->>'password',
        coalesce(nullif(item->>'gb_limit', '')::numeric, 0),
        coalesce(nullif(item->>'gb_used', '')::numeric, 0),
        coalesce(nullif(item->>'status', ''), 'active'),
        nullif(item->>'protocol', ''),
        nullif(item->>'proxy_type', ''),
        nullif(item->>'country', ''),
        nullif(item->>'expires_at', '')::timestamptz
      );
    end loop;
  end if;

  update public.orders
  set status = 'paid', upstream_order_id = v_next, updated_at = now()
  where id = p_order_id;

  update public.transactions
  set status = 'paid',
      description = coalesce(nullif(btrim(coalesce(p_description, '')), ''), description)
  where order_id = p_order_id and amount < 0 and status = 'pending';

  return public.ledger_snapshot(p_order_id, false);
end;
$fn$;

create or replace function public.refund_purchase(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id uuid;
  v_amount numeric(14, 2);
  v_status text;
  v_upstream text;
  v_external_id text;
  v_balance numeric;
begin
  select user_id into v_user_id from public.orders where id = p_order_id;
  if v_user_id is null then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id = v_user_id for update;

  select amount, status, upstream_order_id, external_id
  into v_amount, v_status, v_upstream, v_external_id
  from public.orders
  where id = p_order_id
  for update;

  if v_status = 'failed' then
    select balance into v_balance from public.profiles where id = v_user_id;
    return jsonb_build_object('refunded', true, 'already', true, 'balance', v_balance);
  end if;

  if v_status = 'paid' or v_upstream is not null then
    raise exception 'refund_blocked' using errcode = 'P0001';
  end if;

  update public.profiles
  set balance = round(balance + v_amount, 2)
  where id = v_user_id
  returning balance into v_balance;

  update public.orders
  set status = 'failed', updated_at = now()
  where id = p_order_id;

  update public.transactions
  set status = 'failed'
  where order_id = p_order_id and amount < 0 and status = 'pending';

  insert into public.transactions (
    user_id, order_id, amount, payment_method, status, description, external_id
  ) values (
    v_user_id,
    p_order_id,
    v_amount,
    'balance',
    'paid',
    'Estorno automático: pedido upstream não concluído',
    v_external_id || ':refund'
  );

  return jsonb_build_object('refunded', true, 'already', false, 'balance', v_balance);
end;
$fn$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  privileged boolean;
begin
  privileged := coalesce(auth.role(), '') = 'service_role'
    or (coalesce(auth.role(), '') = '' and current_user in ('postgres', 'supabase_admin'));

  if tg_op = 'INSERT' then
    if not privileged then
      if new.id is distinct from auth.uid() then
        raise exception 'profile_forbidden' using errcode = 'P0001';
      end if;
      new.balance := 0;
      new.role := 'client';
    end if;
    if new.balance < 0 then
      raise exception 'invalid_amount' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if not privileged and (new.balance is distinct from old.balance or new.role is distinct from old.role) then
    raise exception 'balance_locked' using errcode = 'P0001';
  end if;
  if new.balance < 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  return new;
end;
$fn$;

drop trigger if exists profiles_lock_balance_and_role on public.profiles;
create trigger profiles_lock_balance_and_role
before insert or update on public.profiles
for each row
execute function public.protect_profile_privileges();

alter table public.profiles enable row level security;
alter table public.proxies enable row level security;
alter table public.transactions enable row level security;
alter table public.orders enable row level security;

do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'proxies', 'transactions', 'orders')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy proxies_select_own
on public.proxies
for select
to authenticated
using (user_id = auth.uid());

create policy transactions_select_own
on public.transactions
for select
to authenticated
using (user_id = auth.uid());

create policy orders_select_own
on public.orders
for select
to authenticated
using (user_id = auth.uid());

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.proxies from public, anon, authenticated;
revoke all on table public.transactions from public, anon, authenticated;
revoke all on table public.orders from public, anon, authenticated;

grant select on table public.profiles, public.proxies, public.transactions, public.orders to authenticated;
grant insert on table public.profiles to authenticated;
grant all on table public.profiles, public.proxies, public.transactions, public.orders to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke all on function public.purchase_proxy_payload(uuid) from public, anon, authenticated;
revoke all on function public.ledger_snapshot(uuid, boolean) from public, anon, authenticated;
revoke all on function public.debit_purchase_balance(uuid, numeric, text, text, text, text, integer, text, text) from public, anon, authenticated;
revoke all on function public.claim_purchase_fulfillment(uuid) from public, anon, authenticated;
revoke all on function public.record_upstream_order(uuid, text) from public, anon, authenticated;
revoke all on function public.complete_purchase(uuid, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.refund_purchase(uuid) from public, anon, authenticated;

grant execute on function public.purchase_proxy_payload(uuid) to service_role;
grant execute on function public.ledger_snapshot(uuid, boolean) to service_role;
grant execute on function public.debit_purchase_balance(uuid, numeric, text, text, text, text, integer, text, text) to service_role;
grant execute on function public.claim_purchase_fulfillment(uuid) to service_role;
grant execute on function public.record_upstream_order(uuid, text) to service_role;
grant execute on function public.complete_purchase(uuid, text, jsonb, text) to service_role;
grant execute on function public.refund_purchase(uuid) to service_role;

notify pgrst, 'reload schema';
