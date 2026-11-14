-- CAL-102: controle financeiro simples. Receitas dos atendimentos vêm dos agendamentos
-- concluídos; aqui ficam as entradas avulsas e as despesas lançadas pelo dono.
create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  amount_cents int not null check (amount_cents > 0 and amount_cents <= 100000000),
  category text not null check (char_length(category) between 1 and 40),
  description text check (description is null or char_length(description) <= 200),
  occurred_on date not null,
  created_at timestamptz not null default now()
);

create index finance_entries_business_date_idx on public.finance_entries (business_id, occurred_on);

alter table public.finance_entries enable row level security;
create policy finance_entries_owner_all on public.finance_entries
  for all to authenticated
  using ((select public.is_business_owner(business_id)))
  with check ((select public.is_business_owner(business_id)));
