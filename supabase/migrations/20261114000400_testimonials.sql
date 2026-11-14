-- CAL-037 · Depoimentos exibidos na página pública (cadastrados pelo dono).
create table public.business_testimonials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 60),
  text text not null check (char_length(text) between 1 and 400),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index business_testimonials_business_idx on public.business_testimonials (business_id, sort_order);

alter table public.business_testimonials enable row level security;

create policy business_testimonials_owner_all on public.business_testimonials
  for all to authenticated
  using ((select public.is_business_owner(business_id)))
  with check ((select public.is_business_owner(business_id)));

revoke all on public.business_testimonials from anon;
