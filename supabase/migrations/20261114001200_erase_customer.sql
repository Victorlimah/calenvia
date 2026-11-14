-- CAL-091 (LGPD): apagar os dados pessoais de um cliente final a pedido.
-- Anonimiza em vez de remover linhas: nome e WhatsApp somem do cliente, dos agendamentos
-- e das mensagens; horários futuros são cancelados; valores e datas ficam para o
-- faturamento do dono. security invoker: só funciona para clientes do próprio negócio (RLS).
alter table public.customers add column erased_at timestamptz;

create or replace function public.erase_customer(p_customer_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business uuid;
  v_phone text;
  -- "55 00 …": DDD 00 não existe, então nunca coincide com um número real.
  v_fake text := '5500' || lpad((abs(hashtext(p_customer_id::text)) % 1000000000)::text, 9, '0');
begin
  select business_id, whatsapp into v_business, v_phone
  from public.customers where id = p_customer_id;
  if v_business is null
     or (not public.is_business_owner(v_business) and auth.role() <> 'service_role') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.appointments
     set status = 'canceled', canceled_at = now()
   where customer_id = p_customer_id and status = 'confirmed' and starts_at > now();

  update public.appointments
     set customer_name = 'Cliente removido', customer_whatsapp = v_fake, notes = null
   where customer_id = p_customer_id;

  -- messages: o dono não tem permissão de escrita; esta parte roda só pelo servidor
  -- (a action chama a função com o client do dono e depois limpa as mensagens com service_role).
  update public.customers
     set name = 'Cliente removido', whatsapp = v_fake, opted_out_at = coalesce(opted_out_at, now()),
         erased_at = now()
   where id = p_customer_id;
end;
$$;

revoke execute on function public.erase_customer(uuid) from public, anon;
grant execute on function public.erase_customer(uuid) to authenticated, service_role;
