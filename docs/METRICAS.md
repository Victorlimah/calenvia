# Métricas de uso (CAL-085)

Eventos ficam na tabela `product_events` (só o servidor grava e lê; sem dados pessoais).

| Evento | Quando | Uma vez por negócio? |
|---|---|---|
| `site_visit` | Visita à landing (1 por sessão do navegador, robôs ignorados; `?utm_source=` vira `props.ref`) | não |
| `signup` | Conta criada (`props.plan` = plano escolhido no site) | não |
| `business_created` | Passo 1 do onboarding salvo | sim |
| `first_service` | Primeiro serviço cadastrado | sim |
| `onboarding_completed` | Onboarding concluído | sim |
| `first_appointment` | Primeiro agendamento (`props.source` = `link` ou `manual`) | sim |
| `subscription_started` | Primeira assinatura paga (entra com o checkout, CAL-076) | sim |

## Consultas (Supabase Studio › SQL)

```sql
-- Funil dos últimos 30 dias
select * from metrics_funnel(now() - interval '30 days', now());

-- Visitas por origem
select props->>'ref' as origem, count(*) from product_events
where name = 'site_visit' and created_at > now() - interval '30 days'
group by 1 order by 2 desc;

-- Tempo até o primeiro agendamento (mediana, em horas)
select percentile_cont(0.5) within group (
  order by extract(epoch from (fa.created_at - bc.created_at)) / 3600)
from product_events bc
join product_events fa on fa.business_id = bc.business_id and fa.name = 'first_appointment'
where bc.name = 'business_created';
```
