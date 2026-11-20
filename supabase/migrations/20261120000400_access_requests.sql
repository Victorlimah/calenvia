-- CAL-138: lista de espera de quem pede acesso pela home (a Calenvia está em acesso por
-- convite). Nome `access_requests` porque `waitlist_entries` já é a lista de espera dos
-- clientes finais de cada negócio (CAL-104). Quem grava é o servidor (com limite por IP);
-- só a administração lê.
create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  business_name text not null check (char_length(business_name) between 2 and 80),
  whatsapp text not null check (whatsapp ~ '^55[0-9]{10,11}$'),
  segment text check (segment is null or char_length(segment) <= 40),
  city text check (city is null or char_length(city) <= 80),
  status text not null default 'new' check (status in ('new', 'contacted', 'invited', 'discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index access_requests_created_idx on public.access_requests (created_at desc);

alter table public.access_requests enable row level security;
revoke all on public.access_requests from anon, authenticated;
