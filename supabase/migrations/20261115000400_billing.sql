-- CAL-076 / CAL-115 (fase 1): cobrança — catálogo de extras, preços versionados, assinatura,
-- extras por negócio, faturas, sessões de checkout e eventos do gateway.
-- Plano completo: docs/planos/CAL-076.md.
--
-- Regra geral: só o servidor (service role) grava. Dono e gerente leem o que é do próprio
-- negócio (permissão 'billing.view'). Catálogo e preços não são lidos direto pelo cliente:
-- o servidor usa current_prices().

-- ---------------------------------------------------------------------------
-- Permissão nova: billing.view (dono e gerente veem a assinatura; só o dono mexe).
-- Espelho de src/lib/permissions.ts.
-- ---------------------------------------------------------------------------
create or replace function public.has_perm(p_business_id uuid, p_perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.member_role(p_business_id) = any (
    case p_perm
      when 'billing.manage' then array['owner']
      when 'billing.view' then array['owner', 'manager']
      when 'team.manage' then array['owner', 'manager']
      when 'settings.manage' then array['owner', 'manager']
      when 'appointments.view_all' then array['owner', 'manager', 'reception']
      when 'appointments.manage_all' then array['owner', 'manager', 'reception']
      when 'appointments.status_own' then array['owner', 'manager', 'reception', 'staff']
      when 'hours.manage_own' then array['owner', 'manager', 'reception', 'staff']
      when 'blocks.manage_all' then array['owner', 'manager', 'reception']
      when 'finance.view' then array['owner', 'manager']
      when 'customers.view_all' then array['owner', 'manager', 'reception']
      when 'customers.erase' then array['owner', 'manager']
      else array[]::text[]
    end), false);
$$;

-- ---------------------------------------------------------------------------
-- Catálogo de extras
-- ---------------------------------------------------------------------------
create table public.billing_addons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  kind text not null check (kind in ('messages', 'members', 'custom')),
  -- Quanto cada unidade soma no limite (ex.: 100 mensagens, 1 pessoa). null em 'custom'.
  unit_amount int check (unit_amount is null or unit_amount > 0),
  plans text[] not null default array['basic', 'pro', 'pro_plus']
    check (plans <@ array['basic', 'pro', 'pro_plus']),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check ((kind = 'custom') = (unit_amount is null))
);
alter table public.billing_addons enable row level security;
revoke all on public.billing_addons from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Preços (imutáveis: mudar valor = linha nova com is_current)
-- ---------------------------------------------------------------------------
create table public.billing_prices (
  id uuid primary key default gen_random_uuid(),
  product text not null check (product in ('plan', 'addon')),
  plan text check (plan in ('basic', 'pro', 'pro_plus')),
  addon_id uuid references public.billing_addons (id) on delete restrict,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'brl' check (currency = 'brl'),
  "interval" text not null default 'month' check ("interval" = 'month'),
  provider_price_id text unique,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  check (
    (product = 'plan' and plan is not null and addon_id is null)
    or (product = 'addon' and addon_id is not null and plan is null)
  )
);
create unique index billing_prices_current_plan_idx on public.billing_prices (plan)
  where is_current and product = 'plan';
create unique index billing_prices_current_addon_idx on public.billing_prices (addon_id)
  where is_current and product = 'addon';
alter table public.billing_prices enable row level security;
revoke all on public.billing_prices from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Assinatura (já existia): campos novos
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  add column price_id uuid references public.billing_prices (id) on delete restrict,
  add column provider_item_id text,
  add column cancel_at_period_end boolean not null default false,
  add column pending_plan text check (pending_plan in ('basic', 'pro', 'pro_plus')),
  add column pending_price_id uuid references public.billing_prices (id) on delete restrict,
  add column trial_end timestamptz,
  add column past_due_since timestamptz,
  add column current_period_start timestamptz,
  add column canceled_at timestamptz;

alter table public.subscriptions
  add constraint subscriptions_provider_check check (provider in ('mock', 'stripe', 'manual')),
  add constraint subscriptions_status_check
    check (status in ('pending', 'active', 'past_due', 'suspended', 'canceled'));

create unique index subscriptions_one_open_idx on public.subscriptions (business_id)
  where status <> 'canceled';

drop policy subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select to authenticated using ((select public.has_perm(business_id, 'billing.view')));

-- ---------------------------------------------------------------------------
-- Extras contratados por cada negócio
-- ---------------------------------------------------------------------------
create table public.business_addons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  addon_id uuid not null references public.billing_addons (id) on delete restrict,
  -- Preço travado no momento da contratação (null em 'custom', que usa custom_amount_cents).
  price_id uuid references public.billing_prices (id) on delete restrict,
  quantity int not null default 1 check (quantity > 0 and quantity <= 1000),
  custom_amount_cents int check (custom_amount_cents is null or custom_amount_cents > 0),
  custom_label text check (custom_label is null or char_length(custom_label) between 1 and 80),
  is_custom boolean not null default false,
  provider_item_id text,
  note text check (note is null or char_length(note) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  check (
    (is_custom and custom_amount_cents is not null and custom_label is not null)
    or (not is_custom and price_id is not null and custom_amount_cents is null)
  )
);
create unique index business_addons_one_active_idx on public.business_addons (business_id, addon_id)
  where removed_at is null and not is_custom;
create index business_addons_business_idx on public.business_addons (business_id)
  where removed_at is null;
alter table public.business_addons enable row level security;
revoke all on public.business_addons from anon, authenticated;
grant select on public.business_addons to authenticated;
create policy business_addons_select on public.business_addons
  for select to authenticated using ((select public.has_perm(business_id, 'billing.view')));

-- ---------------------------------------------------------------------------
-- Faturas
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  provider text not null check (provider in ('mock', 'stripe', 'manual')),
  provider_invoice_id text not null unique,
  amount_cents int not null check (amount_cents >= 0),
  status text not null check (status in ('open', 'paid', 'failed', 'void')),
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  hosted_url text,
  -- [{ "description": "...", "quantity": 1, "amount_cents": 4490 }]
  lines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index invoices_business_idx on public.invoices (business_id, created_at desc);
alter table public.invoices enable row level security;
revoke all on public.invoices from anon, authenticated;
grant select on public.invoices to authenticated;
create policy invoices_select on public.invoices
  for select to authenticated using ((select public.has_perm(business_id, 'billing.view')));

-- ---------------------------------------------------------------------------
-- Sessões de checkout
-- ---------------------------------------------------------------------------
create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  provider text not null check (provider in ('mock', 'stripe')),
  provider_session_id text unique,
  plan text not null check (plan in ('basic', 'pro', 'pro_plus')),
  price_id uuid not null references public.billing_prices (id) on delete restrict,
  -- [{ "addon_id": "...", "price_id": "...", "quantity": 1 }]
  addons jsonb not null default '[]'::jsonb,
  amount_cents int not null check (amount_cents >= 0),
  status text not null default 'open' check (status in ('open', 'completed', 'expired')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index checkout_sessions_business_idx on public.checkout_sessions (business_id, created_at desc);
alter table public.checkout_sessions enable row level security;
revoke all on public.checkout_sessions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Eventos do gateway (idempotência)
-- ---------------------------------------------------------------------------
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('mock', 'stripe', 'manual')),
  provider_event_id text not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  business_id uuid references public.businesses (id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (provider, provider_event_id)
);
create index billing_events_business_idx on public.billing_events (business_id, received_at desc);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Limites que vêm dos extras (calculados; só o servidor escreve)
-- ---------------------------------------------------------------------------
alter table public.businesses
  add column addon_messages int not null default 0 check (addon_messages >= 0),
  add column addon_members int not null default 0 check (addon_members >= 0);

comment on column public.businesses.addon_messages is
  'Mensagens/mês somadas pelos extras ativos (business_addons). Calculado por recompute_business_addons().';
comment on column public.businesses.addon_members is
  'Pessoas na equipe somadas pelos extras ativos (business_addons). Calculado por recompute_business_addons().';

create or replace function public.recompute_business_addons(p_business_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.businesses b
  set addon_messages = coalesce(t.messages, 0),
      addon_members = coalesce(t.members, 0)
  from (
    select
      sum(case when a.kind = 'messages' then a.unit_amount * ba.quantity end)::int as messages,
      sum(case when a.kind = 'members' then a.unit_amount * ba.quantity end)::int as members
    from public.business_addons ba
    join public.billing_addons a on a.id = ba.addon_id
    where ba.business_id = p_business_id and ba.removed_at is null
  ) t
  where b.id = p_business_id;
$$;

-- Preço atual de cada plano e extra ativo.
create or replace function public.current_prices()
returns table (
  price_id uuid,
  product text,
  plan text,
  addon_id uuid,
  addon_code text,
  addon_name text,
  addon_description text,
  addon_kind text,
  addon_unit_amount int,
  addon_plans text[],
  addon_sort_order int,
  amount_cents int,
  provider_price_id text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.product, p.plan, a.id, a.code, a.name, a.description, a.kind, a.unit_amount,
    a.plans, a.sort_order, p.amount_cents, p.provider_price_id
  from public.billing_prices p
  left join public.billing_addons a on a.id = p.addon_id
  where p.is_current and (p.product = 'plan' or a.is_active)
  order by p.product desc, a.sort_order nulls first, p.plan;
$$;

revoke execute on function public.recompute_business_addons(uuid) from public, anon, authenticated;
revoke execute on function public.current_prices() from public, anon, authenticated;
grant execute on function public.recompute_business_addons(uuid) to service_role;
grant execute on function public.current_prices() to service_role;

-- ---------------------------------------------------------------------------
-- Dados iniciais do catálogo (valem em todo ambiente)
-- ---------------------------------------------------------------------------
insert into public.billing_prices (product, plan, amount_cents) values
  ('plan', 'basic', 2990),
  ('plan', 'pro', 4490),
  ('plan', 'pro_plus', 7490);

with a as (
  insert into public.billing_addons (code, name, description, kind, unit_amount, plans, sort_order)
  values
    ('extra_messages_100', '+100 mensagens/mês',
     'Mais 100 mensagens automáticas no WhatsApp por mês.', 'messages', 100,
     array['pro', 'pro_plus'], 10),
    ('extra_member_1', '+1 pessoa na equipe',
     'Mais uma pessoa com acesso ao painel.', 'members', 1, array['basic', 'pro'], 20),
    ('custom', 'Combinado à parte',
     'Valor e descrição livres, combinados com a Calenvia. Não muda limites.', 'custom', null,
     array['basic', 'pro', 'pro_plus'], 90)
  returning id, code
)
insert into public.billing_prices (product, addon_id, amount_cents)
select 'addon', a.id, case a.code when 'extra_messages_100' then 1000 else 500 end
from a where a.code <> 'custom';

-- Negócios que já existem e estão ativos ganham uma assinatura 'manual' (cortesia/legado).
insert into public.subscriptions (business_id, plan, status, provider, price_id, current_period_start)
select b.id, b.plan, b.plan_status, 'manual', p.id, now()
from public.businesses b
join public.billing_prices p on p.product = 'plan' and p.plan = b.plan and p.is_current
where b.plan_status <> 'pending' and b.plan_status <> 'canceled'
  and not exists (select 1 from public.subscriptions s where s.business_id = b.id);
