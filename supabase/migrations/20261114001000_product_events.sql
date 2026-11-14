-- CAL-085: métricas de uso do produto (funil). Sem dados pessoais: só o nome do evento,
-- o negócio (quando houver) e propriedades simples. Só o servidor (service_role) grava e lê.
create table public.product_events (
  id bigint generated always as identity primary key,
  name text not null check (name in (
    'site_visit', 'signup', 'business_created', 'first_service',
    'onboarding_completed', 'first_appointment', 'subscription_started'
  )),
  business_id uuid references public.businesses (id) on delete set null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index product_events_name_time_idx on public.product_events (name, created_at);

-- Eventos "primeiro X" acontecem uma vez por negócio.
create unique index product_events_once_idx on public.product_events (name, business_id)
  where name in ('business_created', 'first_service', 'onboarding_completed',
                 'first_appointment', 'subscription_started');

alter table public.product_events enable row level security;
-- Nenhuma policy para anon/authenticated: só o service_role (que ignora RLS) acessa.
revoke all on public.product_events from anon, authenticated;

-- Funil do período: quantos eventos de cada etapa (visitas contam todas; o resto, negócios únicos).
create or replace function public.metrics_funnel(p_from timestamptz, p_to timestamptz)
returns table (step text, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.step, coalesce(c.total, 0)
  from unnest(array[
    'site_visit', 'signup', 'business_created', 'first_service',
    'onboarding_completed', 'first_appointment', 'subscription_started'
  ]) with ordinality as s(step, ord)
  left join (
    select name,
           case when name in ('site_visit', 'signup') then count(*)
                else count(distinct business_id) end as total
    from public.product_events
    where created_at >= p_from and created_at < p_to
    group by name
  ) c on c.name = s.step
  order by s.ord;
$$;

revoke execute on function public.metrics_funnel(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.metrics_funnel(timestamptz, timestamptz) to service_role;
