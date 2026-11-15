-- CAL-113: limites por cliente, guardados no banco.
-- O padrão de cada plano fica em src/lib/plans.ts. Estas colunas sobrescrevem o padrão para
-- um negócio específico (ex.: Básico com 4 pessoas na equipe, Pro com 400 mensagens/mês),
-- combinado por fora com a Calenvia. null = usa o padrão do plano.
--
-- Só a Calenvia altera (service role / SQL no Supabase Studio): o dono não tem grant de
-- update nessas colunas (o update de businesses é liberado coluna a coluna desde a
-- migration inicial), então a RLS existente já basta e nenhuma policy nova é necessária.

alter table public.businesses
  add column member_limit_override int
    check (member_limit_override is null or member_limit_override >= 1);

comment on column public.businesses.member_limit_override is
  'Pessoas com login no painel (contando o dono e convites pendentes). null = padrão do plano.';
comment on column public.businesses.message_limit_override is
  'Mensagens automáticas por mês, em qualquer plano (no Básico, > 0 liga o envio automático). null = padrão do plano.';
