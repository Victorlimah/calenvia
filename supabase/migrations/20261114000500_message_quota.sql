-- CAL-071: reserva atômica da cota mensal de mensagens.
-- consume_message_quota só incrementa se o uso do mês ainda estiver abaixo do limite
-- (duas mensagens simultâneas nunca passam da cota). Devolve o novo total ou null se esgotou.
-- release_message_quota devolve uma unidade quando o envio falha.
-- Nenhuma tabela nova: message_usage já tem RLS (dono só lê) desde a migration inicial.

create or replace function public.consume_message_quota(
  p_business_id uuid,
  p_period text,
  p_limit int
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if p_limit is null or p_limit <= 0 then
    return null;
  end if;

  insert into public.message_usage (business_id, period, count)
  values (p_business_id, p_period, 0)
  on conflict (business_id, period) do nothing;

  update public.message_usage
     set count = count + 1
   where business_id = p_business_id
     and period = p_period
     and count < p_limit
  returning count into v_count;

  return v_count;
end;
$$;

create or replace function public.release_message_quota(p_business_id uuid, p_period text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.message_usage
     set count = count - 1
   where business_id = p_business_id
     and period = p_period
     and count > 0;
$$;

revoke execute on function public.consume_message_quota(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.release_message_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_message_quota(uuid, text, int) to service_role;
grant execute on function public.release_message_quota(uuid, text) to service_role;
