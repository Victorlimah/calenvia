# Limites por cliente (CAL-113)

O padrão de cada plano fica em `src/lib/plans.ts`:

| Plano | Pessoas com acesso ao painel | Mensagens automáticas por mês |
|---|---|---|
| Básico | 3 | nenhuma |
| Pro | 10 | 300 |
| Pro+ | ilimitado | 800 (uso justo) |

Para combinar um limite diferente com um cliente (ex.: cobrar um valor à parte), grave na
tabela `businesses`. Quando a coluna está `null`, vale o padrão do plano.

| Coluna | O que muda |
|---|---|
| `member_limit_override` | Pessoas com login no painel, contando o dono e os convites pendentes. Mínimo 1. Profissional sem login não conta. |
| `message_limit_override` | Mensagens automáticas por mês, **em qualquer plano**. No Básico, um valor maior que 0 liga a confirmação e o lembrete automáticos. `0` desliga o automático (volta para o link `wa.me`). |

O dono **não consegue** mudar essas colunas: só a Calenvia, pela administração
(`/admin` › negócio › Plano e limites, com histórico; ver `docs/ADMIN.md`) ou pelo SQL Editor do
Supabase. Os testes em `tests/db/rls.test.ts` conferem isso.

## Extras pagos (CAL-115)

Além do ajuste manual, o limite cresce com **extras cobrados na assinatura**
(`business_addons`, catálogo em `billing_addons`, preço em `billing_prices`):

```
limite = (override ?? padrão do plano) + extras
```

- Os extras ativos são somados em `businesses.addon_messages` e `businesses.addon_members` por
  `recompute_business_addons()`. Só o servidor grava; ninguém edita essas colunas à mão.
- Extras iniciais: **+100 mensagens/mês** (R$ 10,00, Pro e Pro+) e **+1 pessoa na equipe**
  (R$ 5,00, Básico e Pro). O tipo "combinado" tem valor e descrição livres e não muda limite.
- Pro+ tem equipe ilimitada: extra de pessoa não soma nada lá (nem aparece no catálogo).
- Adicionar/remover: `/admin` › negócio › **Extras** (ver `docs/ADMIN.md`). O dono também escolhe
  extras no checkout.
- Use o override para cortesia/caso especial (sem cobrança) e o extra para o que é cobrado.

## Exemplos (SQL Editor do Supabase)

```sql
-- Ver os limites de um negócio
select slug, plan, member_limit_override, message_limit_override
from public.businesses where slug = 'barbearia-do-ze';

-- Básico com 4 pessoas na equipe
update public.businesses set member_limit_override = 4 where slug = 'barbearia-do-ze';

-- Pro com 400 mensagens por mês
update public.businesses set message_limit_override = 400 where slug = 'barbearia-do-ze';

-- Básico com 200 mensagens automáticas por mês
update public.businesses set message_limit_override = 200 where slug = 'ana-nails';

-- Voltar ao padrão do plano
update public.businesses
set member_limit_override = null, message_limit_override = null
where slug = 'barbearia-do-ze';
```

A mudança vale na hora: o próximo envio, o cron de lembretes e a tela Ajustes › Equipe já
usam o novo limite. Baixar um limite não remove ninguém da equipe; só impede novos convites
até o número ficar abaixo do limite.

Os recursos que não são de limite (domínio próprio, relatórios, remarcar pelo link) continuam
seguindo o plano.
