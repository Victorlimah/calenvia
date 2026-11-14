-- CAL-112: equipe com acessos e papéis (dono, gerente, recepção, profissional).
-- A matriz de permissões espelha src/lib/permissions.ts. Toda policy passa a usar o papel do
-- membro em vez de só businesses.owner_id.

-- ---------------------------------------------------------------------------------------------
-- Membros
-- ---------------------------------------------------------------------------------------------
create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'reception', 'staff')),
  staff_member_id uuid,
  status text not null default 'active' check (status in ('active', 'removed')),
  display_name text check (char_length(display_name) <= 120),
  email text check (char_length(email) <= 320),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (business_id, user_id),
  foreign key (staff_member_id, business_id)
    references public.staff_members (id, business_id) on delete set null (staff_member_id),
  constraint business_members_staff_has_link check (role <> 'staff' or staff_member_id is not null or status = 'removed')
);

-- Exatamente um dono por negócio; um cadastro de profissional ligado a no máximo um login ativo.
create unique index business_members_one_owner on public.business_members (business_id)
  where role = 'owner';
create unique index business_members_one_login_per_staff on public.business_members (business_id, staff_member_id)
  where staff_member_id is not null and status = 'active';
create index business_members_user_idx on public.business_members (user_id) where status = 'active';

-- O dono não pode ser removido, rebaixado nem apagado (só junto com o negócio ou a conta).
create or replace function public.protect_owner_member()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' and pg_trigger_depth() <= 1 then
      raise exception 'owner cannot be removed' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.role = 'owner' and (new.role <> 'owner' or new.status <> 'active' or new.user_id <> old.user_id) then
    raise exception 'owner cannot be changed' using errcode = '42501';
  end if;
  if old.role <> 'owner' and new.role = 'owner' then
    raise exception 'owner cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger business_members_protect_owner
  before update or delete on public.business_members
  for each row execute function public.protect_owner_member();

-- Dono vira membro `owner` ao criar o negócio.
create or replace function public.create_owner_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.business_members (business_id, user_id, role, display_name, email)
  select new.id, new.owner_id, 'owner',
         nullif(u.raw_user_meta_data ->> 'name', ''), u.email
  from auth.users u where u.id = new.owner_id
  on conflict (business_id, user_id) do nothing;
  return new;
end;
$$;

create trigger businesses_owner_member
  after insert on public.businesses
  for each row execute function public.create_owner_member();

-- Migração dos negócios existentes.
insert into public.business_members (business_id, user_id, role, display_name, email)
select b.id, b.owner_id, 'owner', nullif(u.raw_user_meta_data ->> 'name', ''), u.email
from public.businesses b
join auth.users u on u.id = b.owner_id
on conflict (business_id, user_id) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Convites (só o hash do token fica no banco; 7 dias; uso único)
-- ---------------------------------------------------------------------------------------------
create table public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text check (char_length(email) <= 320),
  role text not null check (role in ('manager', 'reception', 'staff')),
  staff_member_id uuid,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (staff_member_id, business_id)
    references public.staff_members (id, business_id) on delete cascade,
  constraint business_invitations_staff_has_link check (role <> 'staff' or staff_member_id is not null)
);
create index business_invitations_business_idx on public.business_invitations (business_id);

-- ---------------------------------------------------------------------------------------------
-- Quem criou/alterou cada agendamento
-- ---------------------------------------------------------------------------------------------
alter table public.appointments
  add column created_by_user_id uuid references auth.users (id) on delete set null,
  add column updated_by_user_id uuid references auth.users (id) on delete set null;

create or replace function public.stamp_appointment_actor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by_user_id := coalesce(new.created_by_user_id, (select auth.uid()));
    new.updated_by_user_id := coalesce(new.updated_by_user_id, new.created_by_user_id);
  else
    new.created_by_user_id := old.created_by_user_id;
    new.updated_by_user_id := coalesce((select auth.uid()), new.updated_by_user_id);
  end if;
  return new;
end;
$$;

create trigger appointments_stamp_actor
  before insert or update on public.appointments
  for each row execute function public.stamp_appointment_actor();

-- ---------------------------------------------------------------------------------------------
-- Funções de acesso (security definer, search_path fixo)
-- ---------------------------------------------------------------------------------------------
create or replace function public.member_role(p_business_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.business_members m
  where m.business_id = p_business_id and m.user_id = (select auth.uid()) and m.status = 'active';
$$;

create or replace function public.my_staff_member_id(p_business_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.staff_member_id from public.business_members m
  where m.business_id = p_business_id and m.user_id = (select auth.uid()) and m.status = 'active';
$$;

create or replace function public.is_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.member_role(p_business_id) is not null;
$$;

-- Matriz de permissões (igual a src/lib/permissions.ts).
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

-- O dono agora vem de business_members (continua igual a businesses.owner_id).
create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.member_role(p_business_id) = 'owner';
$$;

revoke execute on function public.member_role(uuid) from public, anon;
revoke execute on function public.my_staff_member_id(uuid) from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.has_perm(uuid, text) from public, anon;
grant execute on function public.member_role(uuid) to authenticated, service_role;
grant execute on function public.my_staff_member_id(uuid) to authenticated, service_role;
grant execute on function public.is_member(uuid) to authenticated, service_role;
grant execute on function public.has_perm(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- RLS das tabelas novas (escrita só pelo servidor, depois de checar a permissão)
-- ---------------------------------------------------------------------------------------------
alter table public.business_members enable row level security;
alter table public.business_invitations enable row level security;

create policy business_members_member_select on public.business_members
  for select to authenticated using ((select public.is_member(business_id)) or user_id = (select auth.uid()));
create policy business_invitations_team_select on public.business_invitations
  for select to authenticated using ((select public.has_perm(business_id, 'team.manage')));

revoke all on public.business_members from anon;
revoke all on public.business_invitations from anon;
revoke insert, update, delete on public.business_members from authenticated;
revoke insert, update, delete on public.business_invitations from authenticated;
-- O hash do token não sai pela API (nem para quem gerencia a equipe).
revoke select on public.business_invitations from authenticated;
grant select (id, business_id, email, role, staff_member_id, expires_at, accepted_at, accepted_by,
              revoked_at, invited_by, created_at)
  on public.business_invitations to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Policies por papel
-- ---------------------------------------------------------------------------------------------

-- businesses: membros leem; ajustes do negócio com settings.manage (colunas já limitadas por grant).
drop policy businesses_owner_select on public.businesses;
drop policy businesses_owner_update on public.businesses;
create policy businesses_member_select on public.businesses
  for select to authenticated using ((select public.is_member(id)));
create policy businesses_settings_update on public.businesses
  for update to authenticated
  using ((select public.has_perm(id, 'settings.manage')))
  with check ((select public.has_perm(id, 'settings.manage')));

-- Configuração do negócio: todo membro lê; settings.manage escreve.
do $$
declare
  t text;
begin
  foreach t in array array['business_hours', 'business_breaks', 'services', 'staff_members',
                           'staff_services', 'business_photos', 'business_testimonials'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.is_member(business_id)))',
      t || '_member_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.has_perm(business_id, ''settings.manage'')))',
      t || '_settings_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.has_perm(business_id, ''settings.manage''))) with check ((select public.has_perm(business_id, ''settings.manage'')))',
      t || '_settings_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.has_perm(business_id, ''settings.manage'')))',
      t || '_settings_delete', t);
  end loop;
end;
$$;

-- staff_hours: todos leem; settings.manage ou o próprio profissional escreve.
drop policy staff_hours_owner_all on public.staff_hours;
create policy staff_hours_member_select on public.staff_hours
  for select to authenticated using ((select public.is_member(business_id)));
create policy staff_hours_write on public.staff_hours
  for all to authenticated
  using ((select public.has_perm(business_id, 'settings.manage'))
         or staff_member_id = (select public.my_staff_member_id(business_id)))
  with check ((select public.has_perm(business_id, 'settings.manage'))
              or staff_member_id = (select public.my_staff_member_id(business_id)));

-- appointments: agenda de todos ou só a própria; criar/remarcar/cancelar com manage_all.
-- Concluído/faltou do profissional passa pela função set_appointment_status.
drop policy appointments_owner_all on public.appointments;
create policy appointments_select on public.appointments
  for select to authenticated
  using ((select public.has_perm(business_id, 'appointments.view_all'))
         or staff_member_id = (select public.my_staff_member_id(business_id)));
create policy appointments_insert on public.appointments
  for insert to authenticated
  with check ((select public.has_perm(business_id, 'appointments.manage_all')));
create policy appointments_update on public.appointments
  for update to authenticated
  using ((select public.has_perm(business_id, 'appointments.manage_all')))
  with check ((select public.has_perm(business_id, 'appointments.manage_all')));
create policy appointments_delete on public.appointments
  for delete to authenticated
  using ((select public.has_perm(business_id, 'appointments.manage_all')));

-- Valor do agendamento: nenhum papel lê a coluna direto pela API; quem tem finance.view lê por
-- appointment_prices(). Assim recepção e profissional não recebem o valor nem chamando a API.
revoke select on public.appointments from authenticated;
grant select (id, business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, status,
              source, notes, customer_name, customer_whatsapp, manage_code, created_at, canceled_at,
              messages_enabled, created_by_user_id, updated_by_user_id)
  on public.appointments to authenticated;

create or replace function public.appointment_prices(p_business_id uuid, p_ids uuid[])
returns table (id uuid, price_cents integer)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.price_cents from public.appointments a
  where a.business_id = p_business_id and a.id = any (p_ids)
    and public.has_perm(p_business_id, 'finance.view');
$$;
revoke execute on function public.appointment_prices(uuid, uuid[]) from public, anon;
grant execute on function public.appointment_prices(uuid, uuid[]) to authenticated, service_role;

create or replace function public.set_appointment_status(p_appointment_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.appointments%rowtype;
begin
  if p_status not in ('confirmed', 'completed', 'no_show') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  select * into a from public.appointments where id = p_appointment_id;
  if a.id is null
     or not (public.has_perm(a.business_id, 'appointments.manage_all')
             or (public.has_perm(a.business_id, 'appointments.status_own')
                 and a.staff_member_id = public.my_staff_member_id(a.business_id))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if a.status = 'canceled' then
    raise exception 'canceled' using errcode = 'P0001';
  end if;
  update public.appointments set status = p_status, canceled_at = null where id = a.id;
  if p_status = 'completed' then
    update public.customers
       set last_visit_at = a.starts_at
     where id = a.customer_id and (last_visit_at is null or last_visit_at < a.starts_at);
  end if;
end;
$$;
revoke execute on function public.set_appointment_status(uuid, text) from public, anon;
grant execute on function public.set_appointment_status(uuid, text) to authenticated, service_role;

-- time_blocks: bloqueios do negócio todo e de todos com blocks.manage_all; o profissional vê os
-- gerais e os próprios, e cria/apaga só os próprios.
drop policy time_blocks_owner_all on public.time_blocks;
create policy time_blocks_select on public.time_blocks
  for select to authenticated
  using ((select public.has_perm(business_id, 'appointments.view_all'))
         or ((select public.is_member(business_id))
             and (staff_member_id is null
                  or staff_member_id = (select public.my_staff_member_id(business_id)))));
create policy time_blocks_write on public.time_blocks
  for all to authenticated
  using ((select public.has_perm(business_id, 'blocks.manage_all'))
         or (staff_member_id is not null
             and staff_member_id = (select public.my_staff_member_id(business_id))))
  with check ((select public.has_perm(business_id, 'blocks.manage_all'))
              or (staff_member_id is not null
                  and staff_member_id = (select public.my_staff_member_id(business_id))));

-- customers: lista completa com customers.view_all; profissional só os dos próprios atendimentos.
drop policy customers_owner_all on public.customers;
create policy customers_select on public.customers
  for select to authenticated
  using ((select public.has_perm(business_id, 'customers.view_all'))
         or exists (select 1 from public.appointments a
                    where a.customer_id = customers.id and a.business_id = customers.business_id
                      and a.staff_member_id = (select public.my_staff_member_id(customers.business_id))));
create policy customers_insert on public.customers
  for insert to authenticated
  with check ((select public.has_perm(business_id, 'appointments.manage_all')));
create policy customers_update on public.customers
  for update to authenticated
  using ((select public.has_perm(business_id, 'appointments.manage_all')))
  with check ((select public.has_perm(business_id, 'appointments.manage_all')));
create policy customers_delete on public.customers
  for delete to authenticated using ((select public.has_perm(business_id, 'customers.erase')));

-- Resumo de clientes: deixa de ser security_invoker (precisa somar price_cents, que nenhum papel
-- lê direto). O filtro de acesso fica na própria view, e o total gasto só vai para finance.view.
drop view public.customer_summaries;
create view public.customer_summaries as
  select c.id,
    c.business_id,
    c.name,
    c.whatsapp,
    c.opted_out_at,
    c.created_at,
    (count(a.id) filter (where a.status = 'completed'))::integer as visits,
    (count(a.id) filter (where a.status = 'no_show'))::integer as no_shows,
    (count(a.id) filter (where a.status = 'confirmed' and a.starts_at > now()))::integer as upcoming,
    case when public.has_perm(c.business_id, 'finance.view')
      then (coalesce(sum(a.price_cents) filter (where a.status = 'completed'), 0))::integer
    end as total_spent_cents,
    greatest(c.last_visit_at, max(a.starts_at) filter (where a.status = 'completed')) as last_visit_at,
    max(a.starts_at) filter (where a.status <> 'canceled') as last_appointment_at
  from public.customers c
  left join public.appointments a on a.customer_id = c.id and a.business_id = c.business_id
  where auth.role() = 'service_role'
     or public.has_perm(c.business_id, 'customers.view_all')
     or exists (select 1 from public.appointments o
                where o.customer_id = c.id and o.business_id = c.business_id
                  and o.staff_member_id = public.my_staff_member_id(c.business_id))
  group by c.id;
revoke all on public.customer_summaries from anon;
grant select on public.customer_summaries to authenticated, service_role;

-- messages: quem vê o agendamento vê as mensagens dele.
drop policy messages_owner_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using ((select public.has_perm(business_id, 'appointments.view_all'))
         or exists (select 1 from public.appointments a
                    where a.id = messages.appointment_id
                      and a.staff_member_id = (select public.my_staff_member_id(messages.business_id))));

-- Uso de mensagens, ajustes de mensagens, domínio, suporte, avaliações: settings.manage.
drop policy message_usage_owner_select on public.message_usage;
create policy message_usage_select on public.message_usage
  for select to authenticated using ((select public.has_perm(business_id, 'settings.manage')));
drop policy business_message_settings_owner_select on public.business_message_settings;
create policy business_message_settings_select on public.business_message_settings
  for select to authenticated using ((select public.is_member(business_id)));
drop policy custom_domains_owner_select on public.custom_domains;
create policy custom_domains_select on public.custom_domains
  for select to authenticated using ((select public.has_perm(business_id, 'settings.manage')));
drop policy support_requests_owner_select on public.support_requests;
create policy support_requests_select on public.support_requests
  for select to authenticated using ((select public.has_perm(business_id, 'settings.manage')));
drop policy reviews_owner_select on public.reviews;
drop policy reviews_owner_update on public.reviews;
create policy reviews_select on public.reviews
  for select to authenticated using ((select public.has_perm(business_id, 'settings.manage')));
create policy reviews_update on public.reviews
  for update to authenticated
  using ((select public.has_perm(business_id, 'settings.manage')))
  with check ((select public.has_perm(business_id, 'settings.manage')));

-- Assinatura: só o dono.
drop policy subscriptions_owner_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select to authenticated using ((select public.has_perm(business_id, 'billing.manage')));

-- Lista de espera: quem agenda para todos.
drop policy waitlist_owner_select on public.waitlist_entries;
drop policy waitlist_owner_update on public.waitlist_entries;
drop policy waitlist_owner_delete on public.waitlist_entries;
create policy waitlist_select on public.waitlist_entries
  for select to authenticated using ((select public.has_perm(business_id, 'appointments.manage_all')));
create policy waitlist_update on public.waitlist_entries
  for update to authenticated
  using ((select public.has_perm(business_id, 'appointments.manage_all')))
  with check ((select public.has_perm(business_id, 'appointments.manage_all')));
create policy waitlist_delete on public.waitlist_entries
  for delete to authenticated using ((select public.has_perm(business_id, 'appointments.manage_all')));

-- Dinheiro (financeiro e pacotes): finance.view.
drop policy finance_entries_owner_all on public.finance_entries;
create policy finance_entries_all on public.finance_entries
  for all to authenticated
  using ((select public.has_perm(business_id, 'finance.view')))
  with check ((select public.has_perm(business_id, 'finance.view')));
drop policy service_packages_owner_all on public.service_packages;
create policy service_packages_all on public.service_packages
  for all to authenticated
  using ((select public.has_perm(business_id, 'finance.view')))
  with check ((select public.has_perm(business_id, 'finance.view')));
drop policy customer_packages_owner_select on public.customer_packages;
drop policy customer_packages_owner_update on public.customer_packages;
drop policy customer_packages_owner_insert on public.customer_packages;
create policy customer_packages_select on public.customer_packages
  for select to authenticated using ((select public.has_perm(business_id, 'finance.view')));
create policy customer_packages_insert on public.customer_packages
  for insert to authenticated with check ((select public.has_perm(business_id, 'finance.view')));
create policy customer_packages_update on public.customer_packages
  for update to authenticated
  using ((select public.has_perm(business_id, 'finance.view')))
  with check ((select public.has_perm(business_id, 'finance.view')));
drop policy package_usages_owner_insert on public.package_usages;
drop policy package_usages_owner_select on public.package_usages;
create policy package_usages_select on public.package_usages
  for select to authenticated using ((select public.has_perm(business_id, 'finance.view')));
create policy package_usages_insert on public.package_usages
  for insert to authenticated with check ((select public.has_perm(business_id, 'finance.view')));

-- use_package_session lê appointments.* (inclui o valor): passa a ser security definer com checagem.
create or replace function public.use_package_session(p_customer_package_id uuid, p_appointment_id uuid)
returns integer
language plpgsql
security definer
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
  if not public.has_perm(cp.business_id, 'finance.view') and auth.role() <> 'service_role' then
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

-- Funções que checavam "é o dono" passam a checar a permissão.
create or replace function public.save_business_hours(p_business_id uuid, p_days jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  d jsonb;
  b jsonb;
begin
  if not public.has_perm(p_business_id, 'settings.manage') and auth.role() <> 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.business_breaks where business_id = p_business_id;

  for d in select * from jsonb_array_elements(p_days) loop
    insert into public.business_hours (business_id, weekday, is_open, opens_at, closes_at)
    values (
      p_business_id,
      (d->>'weekday')::smallint,
      (d->>'is_open')::boolean,
      case when (d->>'is_open')::boolean then (d->>'opens_at')::time end,
      case when (d->>'is_open')::boolean then (d->>'closes_at')::time end
    )
    on conflict (business_id, weekday) do update
      set is_open = excluded.is_open, opens_at = excluded.opens_at, closes_at = excluded.closes_at;

    if (d->>'is_open')::boolean then
      for b in select * from jsonb_array_elements(coalesce(d->'breaks', '[]'::jsonb)) loop
        insert into public.business_breaks (business_id, weekday, starts_at, ends_at)
        values (p_business_id, (d->>'weekday')::smallint, (b->>'starts_at')::time, (b->>'ends_at')::time);
      end loop;
    end if;
  end loop;
end;
$$;

create or replace function public.save_staff_hours(p_staff_member_id uuid, p_days jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_business uuid;
  d jsonb;
begin
  select business_id into v_business from public.staff_members where id = p_staff_member_id;
  if v_business is null
     or (not public.has_perm(v_business, 'settings.manage')
         and not (public.has_perm(v_business, 'hours.manage_own')
                  and public.my_staff_member_id(v_business) = p_staff_member_id)
         and auth.role() <> 'service_role') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.staff_hours where staff_member_id = p_staff_member_id;

  if p_days is null then
    return;
  end if;

  for d in select * from jsonb_array_elements(p_days) loop
    insert into public.staff_hours (business_id, staff_member_id, weekday, is_open, opens_at, closes_at)
    values (
      v_business,
      p_staff_member_id,
      (d->>'weekday')::smallint,
      (d->>'is_open')::boolean,
      case when (d->>'is_open')::boolean then (d->>'opens_at')::time end,
      case when (d->>'is_open')::boolean then (d->>'closes_at')::time end
    );
  end loop;
end;
$$;

create or replace function public.erase_customer(p_customer_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_business uuid;
  v_phone text;
  -- "55 00 …": DDD 00 não existe, então nunca coincide com um número real.
  v_fake text := '5500' || lpad((abs(hashtext(p_customer_id::text)) % 1000000000)::text, 9, '0');
begin
  select business_id, whatsapp into v_business, v_phone
  from public.customers where id = p_customer_id;
  if v_business is null
     or (not public.has_perm(v_business, 'customers.erase') and auth.role() <> 'service_role') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.appointments
     set status = 'canceled', canceled_at = now()
   where customer_id = p_customer_id and status = 'confirmed' and starts_at > now();

  update public.appointments
     set customer_name = 'Cliente removido', customer_whatsapp = v_fake, notes = null
   where customer_id = p_customer_id;

  update public.customers
     set name = 'Cliente removido', whatsapp = v_fake, opted_out_at = coalesce(opted_out_at, now()),
         erased_at = now()
   where id = p_customer_id;
end;
$$;

-- Fotos do Storage: quem cuida dos ajustes.
create or replace function public.owns_media_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^[0-9a-f-]{36}$'
      then public.has_perm(((storage.foldername(p_name))[1])::uuid, 'settings.manage')
    else false
  end;
$$;

revoke execute on function public.create_owner_member() from public, anon, authenticated;
