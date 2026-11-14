-- CAL-063: lista de clientes com visitas, faltas, última visita e total gasto.
-- security_invoker: a view roda com as permissões de quem consulta, então o RLS de
-- customers/appointments continua valendo (cada dono só vê os próprios clientes).
create or replace view public.customer_summaries
with (security_invoker = true)
as
select
  c.id,
  c.business_id,
  c.name,
  c.whatsapp,
  c.opted_out_at,
  c.created_at,
  count(a.id) filter (where a.status = 'completed')::int as visits,
  count(a.id) filter (where a.status = 'no_show')::int as no_shows,
  count(a.id) filter (where a.status = 'confirmed' and a.starts_at > now())::int as upcoming,
  coalesce(sum(a.price_cents) filter (where a.status = 'completed'), 0)::int as total_spent_cents,
  greatest(
    c.last_visit_at,
    max(a.starts_at) filter (where a.status = 'completed')
  ) as last_visit_at,
  max(a.starts_at) filter (where a.status <> 'canceled') as last_appointment_at
from public.customers c
left join public.appointments a
  on a.customer_id = c.id and a.business_id = c.business_id
group by c.id;

revoke all on public.customer_summaries from anon;
grant select on public.customer_summaries to authenticated, service_role;
