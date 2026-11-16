-- M5 · Sprint 12 (CAL-129/130): lista completa de negócios e pendências do admin.
-- Só service_role executa (as telas do /admin checam platform_admins antes).

-- Valor mensal da assinatura aberta: plano + extras. Cortesia (provider 'manual') = R$ 0.
create or replace function public.admin_business_monthly_cents(p_business_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case when s.provider = 'manual' then 0 else
      coalesce(p.amount_cents, 0)
      + coalesce((
          select sum(coalesce(a.custom_amount_cents, ap.amount_cents, 0) * a.quantity)
            from public.business_addons a
            left join public.billing_prices ap on ap.id = a.price_id
           where a.business_id = s.business_id and a.removed_at is null
        ), 0)
    end
      from public.subscriptions s
      left join public.billing_prices p on p.id = s.price_id
     where s.business_id = p_business_id and s.status <> 'canceled'
     order by s.created_at desc
     limit 1
  ), 0)::integer;
$$;
revoke execute on function public.admin_business_monthly_cents(uuid) from public, anon, authenticated;
grant execute on function public.admin_business_monthly_cents(uuid) to service_role;

create or replace function public.admin_business_directory(
  p_search text default null,
  p_plan text default null,
  p_status text default null,
  p_segment text default null,
  p_city text default null,
  p_sort text default 'recentes',
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  segment text,
  address text,
  whatsapp text,
  plan text,
  plan_status text,
  member_limit_override int,
  message_limit_override int,
  created_at timestamptz,
  onboarding_completed_at timestamptz,
  owner_email text,
  owner_last_sign_in_at timestamptz,
  monthly_cents integer,
  is_courtesy boolean,
  appointments_this_month bigint,
  members bigint,
  messages_this_month int,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select b.*,
           u.email::text as owner_email,
           u.last_sign_in_at as owner_last_sign_in_at,
           public.admin_business_monthly_cents(b.id) as monthly_cents,
           exists (select 1 from public.subscriptions s
                    where s.business_id = b.id and s.status <> 'canceled'
                      and s.provider = 'manual') as is_courtesy,
           (select count(*) from public.appointments a
             where a.business_id = b.id and a.status <> 'canceled'
               and a.starts_at >= date_trunc('month', now() at time zone b.timezone) at time zone b.timezone
               and a.starts_at < (date_trunc('month', now() at time zone b.timezone) + interval '1 month')
                                 at time zone b.timezone) as appointments_this_month
      from public.businesses b
      left join auth.users u on u.id = b.owner_id
     where (p_plan is null or p_plan = '' or b.plan = p_plan)
       and (p_status is null or p_status = '' or b.plan_status = p_status)
       and (p_segment is null or p_segment = '' or b.segment = p_segment)
       and (p_city is null or p_city = '' or b.address ilike '%' || p_city || '%')
       and (
         p_search is null or p_search = ''
         or b.name ilike '%' || p_search || '%'
         or b.slug ilike '%' || p_search || '%'
         or u.email ilike '%' || p_search || '%'
         or (regexp_replace(p_search, '\D', '', 'g') <> ''
             and length(regexp_replace(p_search, '\D', '', 'g')) >= 4
             and b.whatsapp like '%' || regexp_replace(p_search, '\D', '', 'g') || '%')
       )
  )
  select
    f.id, f.slug, f.name, f.segment, f.address, f.whatsapp, f.plan, f.plan_status,
    f.member_limit_override, f.message_limit_override, f.created_at, f.onboarding_completed_at,
    f.owner_email, f.owner_last_sign_in_at, f.monthly_cents, f.is_courtesy,
    f.appointments_this_month,
    (select count(*) from public.business_members m
      where m.business_id = f.id and m.status = 'active'),
    coalesce((select mu.count from public.message_usage mu
      where mu.business_id = f.id and mu.period = to_char(now(), 'YYYY-MM')), 0),
    count(*) over ()
  from base f
  order by
    case when p_sort = 'nome' then lower(f.name) end asc,
    case when p_sort = 'valor' then f.monthly_cents end desc nulls last,
    case when p_sort = 'agendamentos' then f.appointments_this_month end desc nulls last,
    case when p_sort = 'acesso' then f.owner_last_sign_in_at end desc nulls last,
    f.created_at desc
  limit least(greatest(p_limit, 1), 200)
  offset greatest(p_offset, 0);
$$;
revoke execute on function public.admin_business_directory(text, text, text, text, text, text, int, int)
  from public, anon, authenticated;
grant execute on function public.admin_business_directory(text, text, text, text, text, text, int, int)
  to service_role;

-- Pendências do topo da home do admin e contadores do menu.
create or replace function public.admin_pending_counts()
returns table (
  pending_activation bigint,
  past_due bigint,
  suspended bigint,
  support_open bigint,
  failed_messages_7d bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.businesses where plan_status = 'pending'),
    (select count(*) from public.businesses where plan_status = 'past_due'),
    (select count(*) from public.businesses where plan_status = 'suspended'),
    (select count(*) from public.support_requests where status = 'open'),
    (select count(*) from public.messages
      where status = 'failed' and created_at >= now() - interval '7 days');
$$;
revoke execute on function public.admin_pending_counts() from public, anon, authenticated;
grant execute on function public.admin_pending_counts() to service_role;
