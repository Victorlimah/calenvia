-- CAL-114 (fase 1): administração da Calenvia.
-- Só o servidor (service role) lê e grava estas tabelas, depois de conferir platform_admins.
-- Nada aqui é exposto a anon/authenticated, exceto o próprio admin saber que é admin.

-- Quem é da equipe da Calenvia.
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

-- Histórico de toda alteração feita pela administração.
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users (id) on delete set null,
  admin_email text not null,
  business_id uuid references public.businesses (id) on delete cascade,
  action text not null check (char_length(action) between 1 and 60),
  -- { campo: { "from": valor, "to": valor } }
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_business_idx on public.admin_audit_log (business_id, created_at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- Observação interna por negócio. Tabela separada porque os membros leem todas as colunas
-- de businesses.
create table public.admin_business_notes (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  notes text not null default '' check (char_length(notes) <= 4000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.admin_business_notes enable row level security;
revoke all on public.admin_business_notes from anon, authenticated;

-- Lista de negócios para a administração, com e-mail do dono, equipe e uso do mês.
create or replace function public.admin_business_list(
  p_search text default null,
  p_plan text default null,
  p_status text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  plan text,
  plan_status text,
  member_limit_override int,
  message_limit_override int,
  created_at timestamptz,
  onboarding_completed_at timestamptz,
  owner_email text,
  members bigint,
  messages_this_month int,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with filtered as (
    select b.*, u.email::text as owner_email
    from public.businesses b
    left join auth.users u on u.id = b.owner_id
    where (p_plan is null or b.plan = p_plan)
      and (p_status is null or b.plan_status = p_status)
      and (
        p_search is null or p_search = ''
        or b.name ilike '%' || p_search || '%'
        or b.slug ilike '%' || p_search || '%'
        or u.email ilike '%' || p_search || '%'
      )
  )
  select
    f.id, f.slug, f.name, f.plan, f.plan_status, f.member_limit_override,
    f.message_limit_override, f.created_at, f.onboarding_completed_at, f.owner_email,
    (select count(*) from public.business_members m
      where m.business_id = f.id and m.status = 'active'),
    coalesce((select mu.count from public.message_usage mu
      where mu.business_id = f.id and mu.period = to_char(now(), 'YYYY-MM')), 0),
    count(*) over ()
  from filtered f
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 200)
  offset greatest(p_offset, 0);
$$;
revoke execute on function public.admin_business_list(text, text, text, int, int)
  from public, anon, authenticated;
grant execute on function public.admin_business_list(text, text, text, int, int) to service_role;
