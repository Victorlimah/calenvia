-- CAL-099: domínio próprio (Pro+). Um domínio por negócio; o dono só lê (escrita pelo servidor,
-- que confere o plano). A busca pelo host é feita pelo middleware com o service_role.
alter table public.custom_domains
  add column last_checked_at timestamptz,
  add column last_error text;

create unique index custom_domains_one_per_business on public.custom_domains (business_id);
