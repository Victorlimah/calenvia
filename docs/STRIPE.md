# Stripe — passo a passo (CAL-076 fase 6)

O código do Stripe está pronto (`src/lib/billing/stripe*.ts`), mas **nunca rodou contra uma conta
de verdade**. Siga na ordem, primeiro no **modo de teste**. Enquanto `BILLING_PROVIDER` não for
`stripe`, tudo usa o pagamento simulado.

## 1. Conta

1. Crie a conta em <https://dashboard.stripe.com/register> com os dados da empresa (Brasil, BRL).
2. Fique no **modo de teste** (chave no canto do painel) até o passo 6.
3. Ative **cartão** como forma de pagamento. A Calenvia cobra assinatura mensal no cartão.
4. **Pix**: confira em *Configurações › Formas de pagamento* se a sua conta oferece Pix para
   **assinaturas recorrentes**. Se só houver Pix para pagamento avulso, ele pode entrar depois
   como forma de pagar uma fatura em aberto (decisão 11 do `docs/planos/CAL-076.md`). Hoje o
   checkout pede só cartão (`payment_method_types: ["card"]` em `src/lib/billing/stripe.ts`).

## 2. Chaves

Em *Desenvolvedores › Chaves de API*, copie a **chave secreta** (`sk_test_...`). Na Vercel
(Preview primeiro) e no `.env.local`:

```
BILLING_PROVIDER=stripe
BILLING_API_KEY=sk_test_...
```

## 3. Produtos e preços

Os preços ficam no banco (`billing_prices`) e são criados no Stripe pelo script:

```
npm run billing:sync     # usa BILLING_API_KEY, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
```

Ele cria um produto por plano/extra (ids `calenvia_plan_pro`, `calenvia_addon_extra_messages_100`,
…, e `calenvia_addon_custom` para os combinados) e um preço mensal em BRL para cada linha de
`billing_prices` sem `provider_price_id` (com `lookup_key = calenvia_<id>`; rodar de novo não
duplica). Mudar preço ou criar extra no `/admin/precos` chama a mesma sincronização.

## 4. Webhook

Em *Desenvolvedores › Webhooks › Adicionar destino*:

- URL: `https://app.calenvia.com.br/api/webhooks/billing` (no Preview, a URL do Preview).
- Eventos: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`,
  `customer.subscription.updated`, `customer.subscription.deleted`.
- Copie o **segredo de assinatura** (`whsec_...`) para `BILLING_WEBHOOK_SECRET`.

Localmente, com a [Stripe CLI](https://docs.stripe.com/stripe-cli):

```
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/billing   # mostra o whsec_ para o .env.local
```

Todo evento é gravado em `billing_events` antes de ser aplicado; repetido é ignorado. Evento que
falhou fica com `error` preenchido e a rota responde 500, então o Stripe tenta de novo.

## 5. Customer Portal (atualizar cartão)

Em *Configurações › Billing › Customer portal*: ative atualizar forma de pagamento e ver faturas.
**Desligue** cancelar e trocar de plano no portal (isso é feito na tela Assinatura da Calenvia,
que aplica as regras de upgrade/downgrade). Se criar uma configuração específica, coloque o id em
`STRIPE_PORTAL_CONFIGURATION_ID`.

## 6. Roteiro de teste (modo de teste)

Cartões de teste: `4242 4242 4242 4242` (aprova), `4000 0000 0000 0341` (falha ao renovar),
qualquer data futura e CVC.

1. Criar conta nova em `/cadastro?plano=pro`, concluir o onboarding, "Assinar e ativar", escolher
   um extra, pagar com 4242 → volta para `/assinatura?ativado=1`, página pública abre, fatura
   aparece com o link "Ver fatura".
2. Trocar para Pro+ (upgrade): cobra a diferença na hora; extra de pessoa sai.
3. Trocar para Básico (downgrade): fica "troca agendada"; a próxima fatura (veja em *Faturas
   futuras* no Stripe) já vem no preço do Básico. Use um *test clock* para avançar o tempo.
4. Cancelar e "Continuar com a assinatura": `cancel_at_period_end` liga/desliga no Stripe.
5. Atualizar cartão para o 0341 pelo portal e avançar o test clock: fatura falha → faixa
   "Não conseguimos cobrar"; depois de 7 dias o cron `/api/cron/billing` suspende.
6. `/admin` › negócio › Extras: adicionar/remover extra → a assinatura no Stripe muda com
   cobrança proporcional.
7. `/admin/precos`: mudar o preço do Pro → aparece preço novo no Stripe; com "aplicar a quem já
   assina", a próxima fatura vem no preço novo.

Só depois de tudo certo: repetir os passos 2–5 no **modo de produção** (chaves `sk_live_...`,
webhook novo, `npm run billing:sync` contra o banco de produção).

## Como o código está organizado

- `stripe.ts`: provedor (checkout, itens, troca de plano, cancelar, portal, webhook).
- `stripe-map.ts`: converte eventos do Stripe em eventos normalizados (testado em
  `stripe-map.test.ts`, sem rede).
- `stripe-catalog.ts` / `stripe-sync.ts`: produtos e preços. `stripe-client.ts`: client
  (API `2025-08-27.basil`).
- Downgrade agendado: o preço do item já é trocado no Stripe sem proporcional (vale na próxima
  fatura) e a metadata `calenvia_pending_plan`/`calenvia_pending_from` faz a Calenvia manter o
  plano atual até o ciclo virar.
