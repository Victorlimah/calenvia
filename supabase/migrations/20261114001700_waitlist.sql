-- CAL-104: lista de espera. O cliente entra pela página quando não acha horário; o dono vê na
-- agenda do dia e avisa pelo WhatsApp quando abrir vaga. Quem grava a entrada é o servidor.
create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid not null,
  staff_member_id uuid,
  desired_date date not null,
  period text not null default 'any' check (period in ('any', 'morning', 'afternoon', 'evening')),
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  customer_whatsapp text not null check (customer_whatsapp ~ '^55[0-9]{10,11}$'),
  status text not null default 'waiting' check (status in ('waiting', 'notified', 'closed')),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (service_id, business_id)
    references public.services (id, business_id) on delete cascade,
  foreign key (staff_member_id, business_id)
    references public.staff_members (id, business_id) on delete cascade,
  unique (business_id, desired_date, service_id, customer_whatsapp)
);

create index waitlist_business_date_idx on public.waitlist_entries (business_id, desired_date)
  where status <> 'closed';

alter table public.waitlist_entries enable row level security;
create policy waitlist_owner_select on public.waitlist_entries
  for select to authenticated using ((select public.is_business_owner(business_id)));
create policy waitlist_owner_update on public.waitlist_entries
  for update to authenticated
  using ((select public.is_business_owner(business_id)))
  with check ((select public.is_business_owner(business_id)));
create policy waitlist_owner_delete on public.waitlist_entries
  for delete to authenticated using ((select public.is_business_owner(business_id)));
