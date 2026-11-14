-- CAL-105: pacotes de serviços (ex.: 4 cortes por R$ 140).
create table public.service_packages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid not null,
  name text not null check (char_length(name) between 2 and 60),
  sessions int not null check (sessions between 2 and 50),
  price_cents int not null check (price_cents > 0),
  validity_days int check (validity_days is null or validity_days between 7 and 730),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, business_id),
  foreign key (service_id, business_id) references public.services (id, business_id) on delete cascade
);

create table public.customer_packages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  package_id uuid not null,
  service_id uuid not null,
  name text not null,
  sessions_total int not null check (sessions_total > 0),
  sessions_used int not null default 0 check (sessions_used >= 0 and sessions_used <= sessions_total),
  price_cents int not null check (price_cents >= 0),
  sold_at timestamptz not null default now(),
  expires_at timestamptz,
  foreign key (customer_id, business_id) references public.customers (id, business_id) on delete cascade,
  foreign key (package_id, business_id) references public.service_packages (id, business_id) on delete restrict
);
create index customer_packages_customer_idx on public.customer_packages (customer_id);

create table public.package_usages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_package_id uuid not null references public.customer_packages (id) on delete cascade,
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  used_at timestamptz not null default now()
);

alter table public.service_packages enable row level security;
alter table public.customer_packages enable row level security;
alter table public.package_usages enable row level security;

create policy service_packages_owner_all on public.service_packages for all to authenticated
  using ((select public.is_business_owner(business_id)))
  with check ((select public.is_business_owner(business_id)));
create policy customer_packages_owner_select on public.customer_packages for select to authenticated
  using ((select public.is_business_owner(business_id)));
create policy customer_packages_owner_insert on public.customer_packages for insert to authenticated
  with check ((select public.is_business_owner(business_id)));
create policy package_usages_owner_select on public.package_usages for select to authenticated
  using ((select public.is_business_owner(business_id)));

-- Desconta uma sessão do pacote no agendamento (atômico; confere cliente, serviço, validade e saldo).
create or replace function public.use_package_session(p_customer_package_id uuid, p_appointment_id uuid)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cp public.customer_packages%rowtype;
  a public.appointments%rowtype;
begin
  select * into cp from public.customer_packages where id = p_customer_package_id for update;
  select * into a from public.appointments where id = p_appointment_id;
  if cp.id is null or a.id is null or cp.business_id <> a.business_id then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if cp.customer_id <> a.customer_id or cp.service_id <> a.service_id then
    raise exception 'mismatch' using errcode = 'P0001';
  end if;
  if a.status = 'canceled' then raise exception 'canceled' using errcode = 'P0001'; end if;
  if cp.expires_at is not null and cp.expires_at < now() then
    raise exception 'expired' using errcode = 'P0001';
  end if;
  if cp.sessions_used >= cp.sessions_total then raise exception 'used_up' using errcode = 'P0001'; end if;

  insert into public.package_usages (business_id, customer_package_id, appointment_id)
  values (cp.business_id, cp.id, a.id);
  update public.customer_packages set sessions_used = sessions_used + 1 where id = cp.id;
  update public.appointments set price_cents = 0 where id = a.id;
  return cp.sessions_total - cp.sessions_used - 1;
end;
$$;

-- As escritas internas acima precisam passar pelo RLS do dono: libera insert/update só pela função.
create policy package_usages_owner_insert on public.package_usages for insert to authenticated
  with check ((select public.is_business_owner(business_id)));
create policy customer_packages_owner_update on public.customer_packages for update to authenticated
  using ((select public.is_business_owner(business_id)))
  with check ((select public.is_business_owner(business_id)));

revoke execute on function public.use_package_session(uuid, uuid) from public, anon;
grant execute on function public.use_package_session(uuid, uuid) to authenticated, service_role;
