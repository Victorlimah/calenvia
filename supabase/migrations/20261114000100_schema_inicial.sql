-- CAL-023 · Modelagem do banco de dados (seção 4 do CLAUDE.md)
-- Toda tabela de negócio tem business_id e RLS ligado. Datas em timestamptz (UTC).
-- Leitura pública e criação de agendamento pelo cliente final passam pelo servidor
-- (service_role), por isso não há policies para o papel anon.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------------

-- Código de 6 caracteres para remarcar/cancelar (sem 0/O/1/I para evitar confusão).
create or replace function public.gen_manage_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  result text := '';
  i int;
begin
  for i in 0..5 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  name text not null check (char_length(name) between 2 and 80),
  segment text,
  address text,
  address_reference text,
  whatsapp text check (whatsapp is null or whatsapp ~ '^55[0-9]{10,11}$'),
  instagram text,
  timezone text not null default 'America/Sao_Paulo',
  accent_color text not null default '#4B3FD9' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  cover_url text,
  headline text,
  subheadline text,
  slot_interval_min int not null default 30 check (slot_interval_min in (15, 30, 60)),
  min_notice_min int not null default 60 check (min_notice_min between 0 and 10080),
  max_days_ahead int not null default 30 check (max_days_ahead between 1 and 365),
  cancel_notice_min int not null default 120 check (cancel_notice_min between 0 and 10080),
  plan text not null default 'basic' check (plan in ('basic', 'pro', 'pro_plus')),
  plan_status text not null default 'pending'
    check (plan_status in ('pending', 'active', 'past_due', 'suspended', 'canceled')),
  -- Limite de uso justo do Pro+ (null = padrão de src/lib/plans.ts)
  message_limit_override int check (message_limit_override is null or message_limit_override >= 0),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index businesses_owner_id_idx on public.businesses (owner_id);

-- ---------------------------------------------------------------------------
-- Horários
-- ---------------------------------------------------------------------------
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  is_open boolean not null default true,
  opens_at time,
  closes_at time,
  unique (business_id, weekday),
  check (not is_open or (opens_at is not null and closes_at is not null and opens_at < closes_at))
);

create table public.business_breaks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  check (starts_at < ends_at)
);

create index business_breaks_business_id_idx on public.business_breaks (business_id, weekday);

-- ---------------------------------------------------------------------------
-- Serviços e profissionais
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  duration_min int not null check (duration_min between 5 and 720),
  price_cents int not null default 0 check (price_cents >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);

create index services_business_id_idx on public.services (business_id, sort_order);

create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  role text,
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);

create index staff_members_business_id_idx on public.staff_members (business_id);

create table public.staff_services (
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_member_id uuid not null,
  service_id uuid not null,
  primary key (staff_member_id, service_id),
  foreign key (staff_member_id, business_id)
    references public.staff_members (id, business_id) on delete cascade,
  foreign key (service_id, business_id)
    references public.services (id, business_id) on delete cascade
);

create index staff_services_service_id_idx on public.staff_services (service_id);

create table public.staff_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_member_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  is_open boolean not null default true,
  opens_at time,
  closes_at time,
  unique (staff_member_id, weekday),
  foreign key (staff_member_id, business_id)
    references public.staff_members (id, business_id) on delete cascade,
  check (not is_open or (opens_at is not null and closes_at is not null and opens_at < closes_at))
);

-- ---------------------------------------------------------------------------
-- Clientes finais
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  whatsapp text not null check (whatsapp ~ '^55[0-9]{10,11}$'),
  opted_out_at timestamptz,
  created_at timestamptz not null default now(),
  last_visit_at timestamptz,
  unique (business_id, whatsapp),
  unique (id, business_id)
);

-- ---------------------------------------------------------------------------
-- Agendamentos
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  service_id uuid not null,
  staff_member_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'completed', 'no_show', 'canceled')),
  source text not null default 'link' check (source in ('link', 'manual')),
  notes text,
  price_cents int not null default 0 check (price_cents >= 0),
  customer_name text not null,
  customer_whatsapp text not null,
  manage_code text not null default public.gen_manage_code(),
  created_at timestamptz not null default now(),
  canceled_at timestamptz,
  check (starts_at < ends_at),
  unique (business_id, manage_code),
  foreign key (customer_id, business_id)
    references public.customers (id, business_id) on delete restrict,
  foreign key (service_id, business_id)
    references public.services (id, business_id) on delete restrict,
  foreign key (staff_member_id, business_id)
    references public.staff_members (id, business_id) on delete restrict,
  -- Anti-conflito: um profissional nunca tem dois agendamentos ativos sobrepostos.
  constraint appointments_no_overlap exclude using gist (
    staff_member_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'canceled')
);

create index appointments_business_starts_idx on public.appointments (business_id, starts_at);
create index appointments_staff_starts_idx on public.appointments (staff_member_id, starts_at);
create index appointments_customer_idx on public.appointments (customer_id);
create index appointments_reminder_idx on public.appointments (starts_at) where status = 'confirmed';

-- ---------------------------------------------------------------------------
-- Bloqueios
-- ---------------------------------------------------------------------------
create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_member_id uuid, -- null = todos os profissionais
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  foreign key (staff_member_id, business_id)
    references public.staff_members (id, business_id) on delete cascade
);

create index time_blocks_business_starts_idx on public.time_blocks (business_id, starts_at);

-- ---------------------------------------------------------------------------
-- Mensagens de WhatsApp
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  type text not null check (type in ('confirmation', 'reminder', 'cancellation')),
  to_number text not null,
  template text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  provider_message_id text unique,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_business_idx on public.messages (business_id, created_at desc);
create index messages_appointment_idx on public.messages (appointment_id);
-- Nunca dois lembretes para o mesmo agendamento.
create unique index messages_one_reminder_idx on public.messages (appointment_id)
  where type = 'reminder' and status <> 'failed';

create table public.message_usage (
  business_id uuid not null references public.businesses (id) on delete cascade,
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  count int not null default 0 check (count >= 0),
  primary key (business_id, period)
);

-- ---------------------------------------------------------------------------
-- Assinaturas e domínios
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  plan text not null check (plan in ('basic', 'pro', 'pro_plus')),
  status text not null,
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_business_idx on public.subscriptions (business_id);

create table public.custom_domains (
  business_id uuid not null references public.businesses (id) on delete cascade,
  domain text primary key check (domain = lower(domain)),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index custom_domains_business_idx on public.custom_domains (business_id);

-- ---------------------------------------------------------------------------
-- Incremento atômico da cota de mensagens (chamado pelo servidor)
-- ---------------------------------------------------------------------------
create or replace function public.increment_message_usage(p_business_id uuid, p_period text)
returns int
language sql
security definer
set search_path = ''
as $$
  insert into public.message_usage (business_id, period, count)
  values (p_business_id, p_period, 1)
  on conflict (business_id, period) do update set count = public.message_usage.count + 1
  returning count;
$$;

revoke execute on function public.increment_message_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.increment_message_usage(uuid, text) to service_role;

-- ===========================================================================
-- RLS (CAL-024): o dono só lê e escreve o próprio negócio.
-- ===========================================================================

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.owner_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_business_owner(uuid) from public, anon;
grant execute on function public.is_business_owner(uuid) to authenticated, service_role;

alter table public.businesses enable row level security;
alter table public.business_hours enable row level security;
alter table public.business_breaks enable row level security;
alter table public.services enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_services enable row level security;
alter table public.staff_hours enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.time_blocks enable row level security;
alter table public.messages enable row level security;
alter table public.message_usage enable row level security;
alter table public.subscriptions enable row level security;
alter table public.custom_domains enable row level security;

-- businesses: o dono vê, cria e edita o próprio negócio.
create policy businesses_owner_select on public.businesses
  for select to authenticated using (owner_id = (select auth.uid()));
create policy businesses_owner_insert on public.businesses
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy businesses_owner_update on public.businesses
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Plano e status só mudam pelo servidor (webhook de pagamento).
revoke insert, update on public.businesses from authenticated;
grant insert (owner_id, slug, name, segment, address, address_reference, whatsapp, instagram,
  timezone, accent_color, logo_url, cover_url, headline, subheadline, slot_interval_min,
  min_notice_min, max_days_ahead, cancel_notice_min, onboarding_completed_at)
  on public.businesses to authenticated;
grant update (slug, name, segment, address, address_reference, whatsapp, instagram,
  timezone, accent_color, logo_url, cover_url, headline, subheadline, slot_interval_min,
  min_notice_min, max_days_ahead, cancel_notice_min, onboarding_completed_at)
  on public.businesses to authenticated;

-- Tabelas que o dono gerencia por completo.
do $$
declare
  t text;
begin
  foreach t in array array[
    'business_hours', 'business_breaks', 'services', 'staff_members', 'staff_services',
    'staff_hours', 'customers', 'appointments', 'time_blocks'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select public.is_business_owner(business_id)))
         with check ((select public.is_business_owner(business_id)))',
      t || '_owner_all', t
    );
  end loop;
end;
$$;

-- Tabelas que o dono só lê (escrita pelo servidor).
create policy messages_owner_select on public.messages
  for select to authenticated using ((select public.is_business_owner(business_id)));
create policy message_usage_owner_select on public.message_usage
  for select to authenticated using ((select public.is_business_owner(business_id)));
create policy subscriptions_owner_select on public.subscriptions
  for select to authenticated using ((select public.is_business_owner(business_id)));
create policy custom_domains_owner_select on public.custom_domains
  for select to authenticated using ((select public.is_business_owner(business_id)));

-- O anon não acessa nada diretamente.
revoke all on all tables in schema public from anon;
