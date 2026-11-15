# Administração da Calenvia (CAL-114)

Tela interna da equipe da Calenvia em **`app.calenvia.com.br/admin`** (local:
`app.localhost:3000/admin`, login `admin@calenvia.dev` / `calenvia123`). Plano e fases em
`docs/planos/CAL-114.md`.

## Quem entra

Quem está na tabela `platform_admins`. Para os outros, `/admin` responde 404. Quem é admin e não
tem negócio próprio cai direto em `/admin` depois do login.

Para dar acesso a alguém em produção (a pessoa precisa ter criado a conta antes, em
`/cadastro`), no SQL Editor do Supabase:

```sql
insert into public.platform_admins (user_id, note)
select id, 'Victor' from auth.users where email = 'seu-email@exemplo.com';

-- Tirar o acesso
delete from public.platform_admins
where user_id = (select id from auth.users where email = 'seu-email@exemplo.com');
```

## O que tem

- **Negócios** (`/admin`): busca por nome, link ou e-mail do dono; filtro por plano e status;
  equipe e mensagens do mês de cada um.
- **Detalhe do negócio** (`/admin/negocios/{id}`): dados, uso, equipe; mudar plano, status da
  assinatura, limite de pessoas, cota de mensagens (ver `docs/LIMITES.md`) e observação interna.
- **Histórico**: toda alteração grava em `admin_audit_log` (quem, o quê, de → para, quando) e
  aparece no detalhe do negócio.
- **Métricas** (`/admin/metricas`): negócios ativos, receita mensal estimada (preço de tabela ×
  assinaturas ativas; não considera valores combinados por fora), receita em risco (pagamento
  atrasado), mensagens no mês, funil de 7/30/90 dias, negócios por plano × status, novos negócios
  por semana (12 semanas). Função `admin_metrics_overview()`.
- **Suporte** (`/admin/suporte`): pedidos de `/ajuda`, abertos primeiro (prioritários do Pro+ no
  topo, mais antigos antes). Responder e mudar o status grava no histórico do negócio. **A
  resposta aparece para o dono** em Ajuda › Seus pedidos. O item "Suporte" do menu mostra
  quantos pedidos estão abertos.
- **Mensagens** (`/admin/mensagens`): mensagens com falha (ou não enviadas) de todos os negócios
  ou de um (`?negocio={id}`, link "Ver mensagens com falha" no detalhe), 7 ou 30 dias, número
  mascarado, falhas da semana e os 5 erros mais comuns. Só leitura (reenvio depende da Meta).
- **Ver painel do cliente** (botão no detalhe → `/admin/negocios/{id}/visao`): agenda (por dia),
  clientes, serviços e profissionais, horários, equipe e convites, mensagens e ajustes do
  negócio, **só para leitura**. Não usa o login do dono nem troca a sessão; as telas não têm
  nenhuma ação. Telefones dos clientes aparecem mascarados. Cada aba aberta grava "Viu o painel
  (aba)" no histórico, no máximo uma vez a cada 10 minutos por admin, negócio e aba.

- **Cobrança no detalhe do negócio** (CAL-076): provedor (pagamento simulado, Stripe ou manual),
  status, fim do ciclo, troca/cancelamento agendados, últimas faturas e total do mês.
  - **Ativar sem cobrança (cortesia)**: aparece quando o negócio não tem assinatura ativa. Cria
    uma assinatura `manual` ativa (conta de teste, parceria). Não mexe em assinatura paga.
  - **Simular renovação / falha de pagamento / pagamento da fatura**: só com
    `BILLING_PROVIDER=mock`. Testam o ciclo (atraso → 7 dias de carência → suspensão pelo cron
    diário `/api/cron/billing` → volta ao pagar).
  - **Extras**: adicionar do catálogo (com quantidade) ou um combinado (valor e descrição livres),
    mudar quantidade e remover. Mensagens/pessoas extras somam no limite (`docs/LIMITES.md`). Com
    o Stripe, a assinatura é atualizada com cobrança proporcional.
- **Preços** (`/admin/precos`): preço atual de cada plano e extra, com os preços anteriores.
  "Mudar preço" cria uma versão nova (preço nunca é editado); quem já assina continua no preço
  antigo, a não ser que você marque "Aplicar também a quem já assina" (vale a partir do próximo
  ciclo, sem proporcional). Criar extra (mensagens ou pessoas, planos que aceitam, valor) e
  arquivar/voltar ao catálogo (quem já tem continua pagando). A landing lê o preço do banco
  (atualiza em até 5 minutos).
- Tudo de cobrança grava no histórico (`admin_audit_log`, ações `billing.*`).

## Segurança

- `platform_admins`, `admin_audit_log` e `admin_business_notes` têm RLS ligado e nenhum acesso
  para `anon`/`authenticated`; só o servidor (service role) lê e grava, depois de conferir
  `platform_admins`. As funções `admin_business_list()`, `admin_metrics_overview()` e
  `admin_message_failures_summary()` só podem ser chamadas pela service role.
- Testes: `tests/db/admin.test.ts` e `tests/e2e/admin.spec.ts`; cobrança em
  `tests/db/billing*.test.ts` e `tests/e2e/cobranca.spec.ts`.
