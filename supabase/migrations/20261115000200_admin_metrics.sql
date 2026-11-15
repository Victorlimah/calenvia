-- CAL-114 (fase 2): números da administração em uma chamada só (service role).

create or replace function public.admin_metrics_overview()
returns table (
  businesses_total bigint,
  onboarding_completed_total bigint,
  -- { "basic": { "active": n, "pending": n, ... }, ... }
  by_plan_status jsonb,
  -- [{ "week": "2026-11-09", "total": n }], últimas 12 semanas (segunda-feira, Brasília)
  new_businesses_by_week jsonb,
  messages_this_month bigint,
  -- { "sent": n, "delivered": n, "read": n, "failed": n, "skipped": n, "queued": n }
  messages_by_status jsonb,
  -- { "link": n, "manual": n }
  appointments_last_30d jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with
    bounds as (
      select
        date_trunc('week', now() at time zone 'America/Sao_Paulo') as this_week,
        date_trunc('month', now() at time zone 'America/Sao_Paulo')
          at time zone 'America/Sao_Paulo' as month_start,
        to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM') as period
    ),
    plan_counts as (
      select plan, plan_status, count(*) as n
      from public.businesses
      group by plan, plan_status
    ),
    by_plan as (
      select coalesce(jsonb_object_agg(plan, statuses), '{}'::jsonb) as v
      from (
        select plan, jsonb_object_agg(plan_status, n) as statuses
        from plan_counts group by plan
      ) p
    ),
    weeks as (
      select generate_series(
        (select this_week from bounds) - interval '11 weeks',
        (select this_week from bounds),
        interval '1 week'
      ) as week
    ),
    weekly as (
      select jsonb_agg(
        jsonb_build_object('week', to_char(w.week, 'YYYY-MM-DD'), 'total', coalesce(c.n, 0))
        order by w.week
      ) as v
      from weeks w
      left join (
        select date_trunc('week', created_at at time zone 'America/Sao_Paulo') as week,
               count(*) as n
        from public.businesses
        group by 1
      ) c on c.week = w.week
    ),
    msg_status as (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) as v
      from (
        select status, count(*) as n
        from public.messages
        where created_at >= (select month_start from bounds)
        group by status
      ) m
    ),
    appt_source as (
      select coalesce(jsonb_object_agg(source, n), '{}'::jsonb) as v
      from (
        select source, count(*) as n
        from public.appointments
        where created_at >= now() - interval '30 days'
        group by source
      ) a
    )
  select
    (select count(*) from public.businesses),
    (select count(*) from public.businesses where onboarding_completed_at is not null),
    (select v from by_plan),
    (select v from weekly),
    (select coalesce(sum(mu.count), 0) from public.message_usage mu
      where mu.period = (select period from bounds)),
    (select v from msg_status),
    (select v from appt_source);
$$;

revoke execute on function public.admin_metrics_overview() from public, anon, authenticated;
grant execute on function public.admin_metrics_overview() to service_role;
