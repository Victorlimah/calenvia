-- CAL-136: convite de negócio pelo /admin.
-- O admin pré-cadastra o negócio (já ativo, assinatura manual) sem o dono ter conta ainda e
-- gera um link de convite. O dono abre o link, cria a senha e vira dono do negócio (CAL-137).
--
-- Nome da tabela: `owner_invitations` (o backlog fala em `invitations`; `business_invitations`
-- já existe para os convites da equipe, CAL-112).

-- O negócio convidado nasce sem dono; o aceite do convite preenche owner_id.
alter table public.businesses alter column owner_id drop not null;

create table public.owner_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320 and email = lower(email)),
  owner_name text not null check (char_length(owner_name) between 2 and 80),
  whatsapp text check (whatsapp is null or whatsapp ~ '^55[0-9]{10,11}$'),
  -- Só o hash (SHA-256 em hex) do token: quem lê o banco não consegue usar o convite.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default now() + interval '7 days',
  opened_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  canceled_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owner_invitations_not_both check (accepted_at is null or canceled_at is null)
);
create index owner_invitations_business_idx on public.owner_invitations (business_id);
create index owner_invitations_email_idx on public.owner_invitations (email);
-- No máximo um convite em aberto por negócio ("gerar novo link" troca o token da mesma linha).
create unique index owner_invitations_one_open
  on public.owner_invitations (business_id)
  where accepted_at is null and canceled_at is null;

-- Só o servidor (service role, depois de conferir platform_admins) lê e grava.
alter table public.owner_invitations enable row level security;
revoke all on public.owner_invitations from anon, authenticated;
