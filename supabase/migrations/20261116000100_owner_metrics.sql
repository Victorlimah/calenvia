-- M5 · Sprint 11 (CAL-123 a CAL-128): métricas do painel do dono agregadas no banco e forma de
-- pagamento do atendimento.
--
-- As funções são security definer porque os valores (price_cents) não podem ser lidos direto
-- pela API (CAL-112). Elas mesmas aplicam as regras de acesso:
--   * só membros ativos do negócio recebem algo;
--   * sem appointments.view_all, só os atendimentos do próprio profissional;
--   * sem finance.view, os valores em R$ voltam nulos.

-- CAL-128: forma de pagamento (dinheiro, Pix, cartão, outro) ao concluir ou registrar.
alter table public.appointments
  add column payment_method text
    check (payment_method is null or payment_method in ('cash', 'pix', 'card', 'other'));
grant select (payment_method) on public.appointments to authenticated;

-- Quem pode marcar concluído pode informar a forma de pagamento (mesma regra do status).
create or replace function public.set_appointment_payment(p_appointment_id uuid, p_method text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.appointments%rowtype;
begin
  if p_method is not null and p_method not in ('cash', 'pix', 'card', 'other') then
    raise exception 'invalid_method' using errcode = 'P0001';
  end if;
  select * into a from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if not (public.has_perm(a.business_id, 'appointments.manage_all')
          or (public.has_perm(a.business_id, 'appointments.status_own')
              and a.staff_member_id = public.my_staff_member_id(a.business_id))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.appointments set payment_method = p_method where id = a.id;
end;
$$;
revoke execute on function public.set_appointment_payment(uuid, text) from public, anon;
grant execute on function public.set_appointment_payment(uuid, text) to authenticated, service_role;

-- CAL-123/126: atendimentos agregados por dia (no fuso do negócio), serviço, profissional,
-- status, origem e forma de pagamento. A tela soma do jeito que precisar.
create or replace function public.appointment_stats(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  day date,
  service_id uuid,
  staff_member_id uuid,
  status text,
  source text,
  payment_method text,
  appointments integer,
  revenue_cents bigint,
  minutes bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select public.member_role(p_business_id) as role,
           public.has_perm(p_business_id, 'appointments.view_all') as view_all,
           public.has_perm(p_business_id, 'finance.view') as finance,
           public.my_staff_member_id(p_business_id) as my_staff
  )
  select (a.starts_at at time zone b.timezone)::date as day,
         a.service_id,
         a.staff_member_id,
         a.status,
         a.source,
         a.payment_method,
         count(*)::integer,
         case when me.finance then sum(a.price_cents)::bigint end,
         (sum(extract(epoch from (a.ends_at - a.starts_at))) / 60)::bigint
    from public.appointments a
    join public.businesses b on b.id = a.business_id
    cross join me
   where a.business_id = p_business_id
     and me.role is not null
     and a.starts_at >= p_from and a.starts_at < p_to
     and (me.view_all or a.staff_member_id = me.my_staff)
   group by 1, 2, 3, 4, 5, 6, me.finance;
$$;
revoke execute on function public.appointment_stats(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.appointment_stats(uuid, timestamptz, timestamptz)
  to authenticated, service_role;

-- CAL-123/124/125: visitas (atendimentos concluídos) de cada cliente, para retorno, clientes
-- novos x que voltaram e ranking. O cliente avulso ("Sem WhatsApp", CAL-116) fica de fora.
drop function if exists public.customer_visit_stats(uuid);
create or replace function public.customer_visit_stats(p_business_id uuid)
returns table (
  customer_id uuid,
  name text,
  whatsapp text,
  opted_out boolean,
  visit_days date[],
  visit_cents integer[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select public.member_role(p_business_id) as role,
           public.has_perm(p_business_id, 'appointments.view_all') as view_all,
           public.has_perm(p_business_id, 'finance.view') as finance,
           public.my_staff_member_id(p_business_id) as my_staff
  )
  select c.id,
         c.name,
         c.whatsapp,
         c.opted_out_at is not null,
         array_agg((a.starts_at at time zone b.timezone)::date order by a.starts_at),
         -- valor de cada visita, na mesma ordem (nulos sem finance.view)
         array_agg(case when me.finance then a.price_cents end order by a.starts_at)
    from public.appointments a
    join public.customers c on c.id = a.customer_id
    join public.businesses b on b.id = a.business_id
    cross join me
   where a.business_id = p_business_id
     and me.role is not null
     and a.status = 'completed'
     and c.whatsapp <> '5500000000000'
     and (me.view_all or a.staff_member_id = me.my_staff)
   group by c.id, me.finance;
$$;
revoke execute on function public.customer_visit_stats(uuid) from public, anon;
grant execute on function public.customer_visit_stats(uuid) to authenticated, service_role;

-- Entradas e despesas manuais por dia (CAL-126/127), só para quem vê o financeiro.
create or replace function public.finance_entry_stats(p_business_id uuid, p_from date, p_to date)
returns table (day date, kind text, category text, amount_cents bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select e.occurred_on, e.kind, e.category, sum(e.amount_cents)::bigint
    from public.finance_entries e
   where e.business_id = p_business_id
     and public.has_perm(p_business_id, 'finance.view')
     and e.occurred_on >= p_from and e.occurred_on < p_to
   group by 1, 2, 3;
$$;
revoke execute on function public.finance_entry_stats(uuid, date, date) from public, anon;
grant execute on function public.finance_entry_stats(uuid, date, date) to authenticated, service_role;
