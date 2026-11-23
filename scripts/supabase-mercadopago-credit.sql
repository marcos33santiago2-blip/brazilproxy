-- BrazilProxy: baixa automática de pagamentos do Mercado Pago.
-- Rode este script inteiro no SQL Editor do Supabase, depois do script de saldo.
-- As funções só podem ser executadas pela service_role.

create or replace function public.register_pending_payment(
  p_user_id uuid,
  p_external_id text,
  p_amount numeric,
  p_description text,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_amount numeric(14, 2);
  v_existing uuid;
  v_tx_id uuid;
begin
  if p_user_id is null
    or p_external_id is null
    or char_length(btrim(p_external_id)) < 4
    or char_length(btrim(p_external_id)) > 128
    or btrim(p_external_id) !~ '^[A-Za-z0-9:_-]+$'
    or p_payment_method not in ('pix', 'card')
  then
    raise exception 'invalid_request' using errcode = 'P0001';
  end if;

  v_amount := round(p_amount, 2);
  if v_amount is null or v_amount < 10 or v_amount > 20000 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  select id into v_existing
  from public.transactions
  where external_id = btrim(p_external_id);

  if v_existing is not null then
    return jsonb_build_object('transaction_id', v_existing, 'already_exists', true);
  end if;

  insert into public.transactions (
    user_id, amount, payment_method, status, description, external_id
  ) values (
    p_user_id,
    v_amount,
    p_payment_method,
    'pending',
    coalesce(nullif(btrim(coalesce(p_description, '')), ''), 'Recarga de saldo'),
    btrim(p_external_id)
  )
  returning id into v_tx_id;

  return jsonb_build_object('transaction_id', v_tx_id, 'already_exists', false);
exception
  when unique_violation then
    select id into v_existing from public.transactions where external_id = btrim(p_external_id);
    return jsonb_build_object('transaction_id', v_existing, 'already_exists', true);
end;
$fn$;

create or replace function public.settle_payment(
  p_external_id text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_tx public.transactions%rowtype;
  v_balance numeric;
begin
  if p_external_id is null or btrim(p_external_id) = '' or p_status not in ('paid', 'failed') then
    raise exception 'invalid_request' using errcode = 'P0001';
  end if;

  select * into v_tx
  from public.transactions
  where external_id = btrim(p_external_id)
  for update;

  if not found then
    raise exception 'payment_not_found' using errcode = 'P0001';
  end if;

  if v_tx.status = 'paid' then
    select balance into v_balance from public.profiles where id = v_tx.user_id;
    return jsonb_build_object('status', 'paid', 'already', true, 'balance', v_balance);
  end if;

  if v_tx.status = 'failed' then
    return jsonb_build_object('status', 'failed', 'already', true, 'balance', null);
  end if;

  if p_status = 'failed' then
    update public.transactions
    set status = 'failed'
    where id = v_tx.id;
    return jsonb_build_object('status', 'failed', 'already', false, 'balance', null);
  end if;

  perform 1 from public.profiles where id = v_tx.user_id for update;

  update public.profiles
  set balance = round(balance + v_tx.amount, 2)
  where id = v_tx.user_id
  returning balance into v_balance;

  update public.transactions
  set status = 'paid'
  where id = v_tx.id and status = 'pending';

  return jsonb_build_object('status', 'paid', 'already', false, 'balance', v_balance);
end;
$fn$;

revoke all on function public.register_pending_payment(uuid, text, numeric, text, text) from public, anon, authenticated;
revoke all on function public.settle_payment(text, text) from public, anon, authenticated;
grant execute on function public.register_pending_payment(uuid, text, numeric, text, text) to service_role;
grant execute on function public.settle_payment(text, text) to service_role;

notify pgrst, 'reload schema';
