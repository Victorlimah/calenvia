-- CAL-114 (fase 3): resposta da equipe aos pedidos de suporte e resumo das mensagens com falha.

-- A resposta fica visível para quem já lê support_requests (dono e membros com settings.manage,
-- policy support_requests_select): de propósito, ela aparece em /ajuda.
-- Quem grava continua sendo só o servidor (insert/update/delete revogados de anon/authenticated).
alter table public.support_requests
  add column admin_reply text check (char_length(admin_reply) <= 4000),
  add column answered_at timestamptz,
  add column updated_at timestamptz not null default now();

create index support_requests_status_idx
  on public.support_requests (status, priority desc, created_at);

-- Índice para a lista de falhas (status failed/skipped, mais recentes primeiro).
create index messages_status_created_idx
  on public.messages (status, created_at desc)
  where status in ('failed', 'skipped');

-- Erros mais comuns das mensagens com falha desde p_since (opcionalmente de um negócio).
create or replace function public.admin_message_failures_summary(
  p_since timestamptz,
  p_business_id uuid default null,
  p_limit int default 5
)
returns table (error text, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(trim(m.error), ''), '(sem detalhe)') as error, count(*) as total
  from public.messages m
  where m.status = 'failed'
    and m.created_at >= p_since
    and (p_business_id is null or m.business_id = p_business_id)
  group by 1
  order by 2 desc, 1
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public.admin_message_failures_summary(timestamptz, uuid, int)
  from public, anon, authenticated;
grant execute on function public.admin_message_failures_summary(timestamptz, uuid, int)
  to service_role;
