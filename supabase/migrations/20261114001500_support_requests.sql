-- CAL-101: pedidos de suporte do dono. Pro+ tem prioridade (definida pelo servidor).
create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  topic text not null check (topic in ('agenda', 'whatsapp', 'pagina', 'assinatura', 'outro')),
  message text not null check (char_length(message) between 10 and 2000),
  priority boolean not null default false,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

create index support_requests_business_idx on public.support_requests (business_id, created_at desc);
create index support_requests_open_idx on public.support_requests (priority desc, created_at)
  where status = 'open';

alter table public.support_requests enable row level security;
-- O dono vê os próprios pedidos; quem grava é o servidor (que define a prioridade pelo plano).
create policy support_requests_owner_select on public.support_requests
  for select to authenticated using ((select public.is_business_owner(business_id)));
revoke insert, update, delete on public.support_requests from anon, authenticated;
