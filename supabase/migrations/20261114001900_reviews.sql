-- CAL-106: avaliação após o atendimento. O cliente avalia pelo link (código do agendamento);
-- quem grava é o servidor. O dono decide o que aparece na página (is_published).
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  author_name text not null check (char_length(author_name) between 1 and 80),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index reviews_business_idx on public.reviews (business_id, created_at desc);

alter table public.reviews enable row level security;
create policy reviews_owner_select on public.reviews
  for select to authenticated using ((select public.is_business_owner(business_id)));
create policy reviews_owner_update on public.reviews
  for update to authenticated
  using ((select public.is_business_owner(business_id)))
  with check ((select public.is_business_owner(business_id)));
-- O dono só publica/despublica; nota e texto são do cliente.
revoke update on public.reviews from authenticated;
grant update (is_published) on public.reviews to authenticated;
