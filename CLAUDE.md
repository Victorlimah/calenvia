# Calenvia — contexto do projeto para o Claude Code

> Leia este arquivo inteiro antes de qualquer tarefa. O backlog está em `docs/BACKLOG.md`.

## 1. O produto

A **Calenvia** é um SaaS de agendamento online para **qualquer negócio que trabalha com horário marcado**: barbearias, salões, manicures, estética, clínicas, consultórios, psicólogos, fisioterapia, personal trainers, studios de pilates, estúdios de tatuagem, pet shops, lava-jatos etc.

O dono do negócio assina um plano e ganha:

1. **Uma página pública própria** (`{slug}.calenvia.com.br`), em estilo de página de vendas, com **uma única ação**: "Agendar meu horário".
2. **Um fluxo de agendamento** em que o cliente final escolhe serviço → profissional → data e horário → informa nome e WhatsApp → confirma. **O cliente final não cria conta.**
3. **Confirmação e lembrete automáticos no WhatsApp** do cliente final (nos planos pagos com mensagens).
4. **Um painel** (`app.calenvia.com.br`) com a agenda do dia, detalhe dos agendamentos, agendamento manual, bloqueio de horários, clientes e configurações.

Público: pequenos negócios do Brasil, com dono não técnico, que usa principalmente **o celular**. Todo texto da interface é em **português do Brasil**, simples e direto.

### Planos

| Plano | Preço/mês | Mensagens automáticas no WhatsApp | Extras |
|---|---|---|---|
| Básico | R$ 29,90 | Nenhuma. O dono envia a confirmação por um link `wa.me` com a mensagem pronta | Página, agenda, bloqueios, clientes |
| Pro | R$ 44,90 | Até **300 por mês** (≈ 150 agendamentos com confirmação + lembrete) | Remarcar/cancelar pelo link |
| Pro+ | R$ 74,90 | Ilimitadas com **uso justo** (limite configurável, padrão 800/mês) | Domínio próprio, relatórios, suporte prioritário |

Quando o Pro passa da cota: os agendamentos continuam normalmente e a confirmação volta a ser pelo link `wa.me` até o mês seguinte. O dono recebe um aviso para fazer upgrade.

## 2. Stack e decisões

- **Next.js (App Router) + TypeScript (strict) + Tailwind CSS**
- **Supabase**: Postgres, Auth, Storage, Realtime. Migrations versionadas em `supabase/migrations` (Supabase CLI).
- **Vercel** para hospedagem (preview + produção) e Vercel Cron para jobs.
- **Zod** para validação, **React Hook Form** para formulários.
- **date-fns + date-fns-tz** para datas (nada de `moment`).
- **Vitest** para testes unitários, **Playwright** para testes ponta a ponta.
- **WhatsApp Cloud API (Meta)**, oficial. **Nunca** usar bibliotecas não oficiais (Baileys, whatsapp-web.js, Evolution API): risco de banimento.
- **Gateway de pagamento**: a definir (CAL-075). Candidatos: Asaas, Mercado Pago, Stripe. Isolar atrás de uma interface em `src/lib/billing`.
- Componentes: pode usar shadcn/ui como base, customizando para o visual da marca.

Peça confirmação antes de adicionar qualquer serviço pago ou dependência pesada que não esteja nesta lista.

## 3. Arquitetura

**Um repositório e um app Next.js** servem tudo, separados pelo host:

| Host | O que é | Grupo de rotas |
|---|---|---|
| `calenvia.com.br` | Site/landing da Calenvia com os planos | `src/app/(site)` |
| `app.calenvia.com.br` | Painel do dono (login obrigatório) | `src/app/(painel)` |
| `{slug}.calenvia.com.br` | Página pública + agendamento do negócio | `src/app/(negocio)/[slug]` |

- `src/middleware.ts` lê o host e faz *rewrite* para o grupo certo. O slug vem do subdomínio.
- Em desenvolvimento, use `localhost:3000` (site), `app.localhost:3000` (painel) e `{slug}.localhost:3000` (negócio). Centralize a lógica de host em `src/lib/hosts.ts`, com o domínio raiz vindo de `NEXT_PUBLIC_ROOT_DOMAIN`.
- Slugs reservados (não podem ser usados por negócios): `www`, `app`, `api`, `admin`, `painel`, `site`, `blog`, `ajuda`, `suporte`, `status`, `mail`.
- No futuro (Pro+), domínios próprios dos negócios também passam pelo middleware, procurando o domínio na tabela `custom_domains`.

### Estrutura de pastas

```
src/
  app/
    (site)/                 landing, planos, termos, privacidade, cadastro
    (painel)/               agenda, agendamento/[id], novo, clientes, ajustes, assinatura
    (negocio)/[slug]/       página pública, agendar, confirmado/[code], gerenciar/[code]
    api/
      webhooks/whatsapp/    status das mensagens (Meta)
      webhooks/billing/     eventos do gateway
      cron/reminders/       envio de lembretes (Vercel Cron)
  components/               UI compartilhada
  lib/
    availability/           motor de horários (funções puras + testes)
    whatsapp/               cliente da Cloud API, templates, cotas
    billing/                interface do gateway + implementação
    supabase/               clients (server, browser, service role)
    dates.ts                helpers de fuso e formatação pt-BR
    phone.ts                normalização de WhatsApp
    hosts.ts                regras de host/subdomínio
  middleware.ts
supabase/
  migrations/
  seed.sql
tests/                      Playwright
docs/
  BACKLOG.md
  referencias/              landing da Calenvia em HTML (referência visual)
```

## 4. Modelo de dados

Código e banco em **inglês**. Interface em **português**. Glossário: estabelecimento = `business`, serviço = `service`, profissional = `staff_member`, agendamento = `appointment`, bloqueio = `time_block`, cliente final = `customer`.

Toda tabela de dados de negócio tem `business_id` e **RLS ligado**. Datas e horas em `timestamptz` (UTC no banco); o fuso do negócio fica em `businesses.timezone` (ex.: `America/Fortaleza`).

- **businesses**: id, owner_id (auth.users), slug (único), name, segment, address, address_reference, whatsapp, instagram, timezone, accent_color, logo_url, cover_url, headline, subheadline, slot_interval_min (15/30/60), min_notice_min, max_days_ahead, cancel_notice_min, plan (`basic` | `pro` | `pro_plus`), plan_status, created_at
- **business_hours**: id, business_id, weekday (0–6), is_open, opens_at (time), closes_at (time)
- **business_breaks**: id, business_id, weekday, starts_at, ends_at (ex.: almoço)
- **services**: id, business_id, name, description, duration_min, price_cents, is_active, is_featured, sort_order
- **staff_members**: id, business_id, name, role, photo_url, is_active
- **staff_services**: staff_member_id, service_id
- **staff_hours** (opcional, sobrescreve o horário do negócio para aquele profissional): mesmo formato de business_hours
- **customers**: id, business_id, name, whatsapp (só dígitos, com 55), opted_out_at, created_at, last_visit_at — **UNIQUE (business_id, whatsapp)**
- **appointments**: id, business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, status (`confirmed` | `completed` | `no_show` | `canceled`), source (`link` | `manual`), notes, price_cents (cópia no momento), customer_name e customer_whatsapp (cópia no momento), manage_code (6 caracteres, para remarcar/cancelar), created_at, canceled_at
  - **Constraint anti-conflito**: `EXCLUDE USING gist (staff_member_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status <> 'canceled')` (extensão `btree_gist`).
- **time_blocks**: id, business_id, staff_member_id (null = todos), starts_at, ends_at, reason
- **messages**: id, business_id, appointment_id, type (`confirmation` | `reminder` | `cancellation`), to_number, template, status (`queued` | `sent` | `delivered` | `read` | `failed`), provider_message_id, error, sent_at
- **message_usage**: business_id, period (YYYY-MM), count
- **subscriptions**: id, business_id, plan, status, provider, provider_customer_id, provider_subscription_id, current_period_end
- **custom_domains** (Pro+, depois): business_id, domain, verified_at

Leitura pública (página do negócio e horários disponíveis) acontece **pelo servidor**, nunca expondo tabelas inteiras ao cliente anônimo. Criação de agendamento pelo cliente final também passa por uma rota/ação de servidor que valida tudo de novo.

## 5. Regras de negócio

### Horários disponíveis (`src/lib/availability`)
Funções **puras**, sem acesso ao banco, 100% testadas.

1. Gerar inícios candidatos a cada `slot_interval_min` dentro do horário de funcionamento do dia (do profissional, se ele tiver horário próprio; senão, do negócio).
2. O serviço precisa **caber inteiro** antes do fechamento e **não pode atravessar** um intervalo (almoço).
3. Descartar slots que conflitam com agendamentos **não cancelados** ou com bloqueios (do profissional ou gerais). Há conflito quando `inicioA < fimB && inicioB < fimA`.
4. Descartar slots no passado ou antes de `agora + min_notice_min`, e dias além de `max_days_ahead`.
5. O profissional precisa fazer o serviço (`staff_services`).
6. **"Sem preferência"**: o slot está livre se **ao menos um** profissional apto estiver livre. Ao confirmar, atribuir ao profissional livre com **menos agendamentos naquele dia** (empate: ordem alfabética).
7. Dia fechado → lista vazia com motivo `closed`.
8. Retornar agrupado em **Manhã** (< 12h), **Tarde** (12h–18h) e **Noite** (≥ 18h), no fuso do negócio.
9. Ao confirmar, **revalidar** no servidor. A constraint do banco é a última barreira: se der conflito, mostrar "Esse horário acabou de ser reservado. Escolha outro."

### Clientes finais
- Normalizar o WhatsApp para **só dígitos com 55** (`src/lib/phone.ts`). Celular brasileiro: 55 + DDD + 9 dígitos.
- Ao agendar: buscar por `business_id + whatsapp`. Se existir, reaproveitar e atualizar o nome para o mais recente. Se não, criar.

### WhatsApp
- Toda mensagem automática passa por `sendWhatsApp()` em `src/lib/whatsapp`, que: verifica o plano e a cota do mês, respeita opt-out, chama a Cloud API com um **template de utilidade** aprovado, grava em `messages` e incrementa `message_usage`.
- Sem cota, plano Básico ou erro: não enviar e oferecer o **link `wa.me`** com o texto pronto (`https://wa.me/{numero}?text={texto codificado}`).
- Lembrete: Vercel Cron a cada 10 minutos procura agendamentos `confirmed` que começam dentro da janela do lembrete e ainda não têm lembrete enviado.
- Template de confirmação (texto de referência): "Olá, {{nome}}! Aqui é da *{{negocio}}*. Seu horário de *{{servico}}* com {{profissional}} está confirmado para *{{dia_semana}}, {{data}} às {{hora}}*. Para remarcar ou cancelar: {{link}}"
- Em desenvolvimento, use um modo simulado (`WHATSAPP_MODE=mock`) que só registra a mensagem no banco e no log.

### Planos e limites
Centralize em `src/lib/plans.ts`: preço, cota de mensagens, uso justo e recursos de cada plano. Nunca espalhe `if (plan === 'pro')` pela interface; use helpers como `canSendAutomaticMessages(business)`.

## 6. Design

- **Mobile-first** (referência: 390 px). Áreas de toque de no mínimo 44 px, contraste AA, `label` em todo input, botões reais.
- **Marca Calenvia**: índigo `#4B3FD9`, tinta `#14161A`, fundo `#FBFAF7`. Títulos em **Bricolage Grotesque** (700/800), textos em **Inter**.
- **Página pública do negócio**: estilo página de vendas, **fundo escuro**, títulos grandes, **cor de destaque do negócio** (`accent_color`). Seções: abertura com foto e CTA, como funciona (3 passos), serviços (com selo "mais pedido"), fotos do trabalho + equipe, depoimentos, onde fica + horários, dúvidas, chamada final. **Uma única ação** em toda a página ("Agendar meu horário"), repetida numa **barra fixa no rodapé**.
- **Fluxo de agendamento**: barra de progresso de 4 passos, botão voltar, resumo fixo no rodapé com o botão "Continuar".
- **Painel do dono**: claro e limpo, navegação inferior no celular (Agenda · Clientes · Ajustes) e menu lateral no desktop.
- Referência visual da landing da Calenvia: `docs/referencias/landing-calenvia.html`.
- Estados vazios, de carregamento e de erro sempre tratados. Nada de lorem ipsum.

## 7. Como trabalhar neste projeto

1. **Uma tarefa = um item do backlog** (`CAL-xxx`). Siga a ordem dos sprints em `docs/BACKLOG.md`, a menos que eu peça outra coisa.
2. Antes de codar, **leia o item, planeje** em poucos passos e confira se as dependências já estão prontas.
3. Commits pequenos, com o ID no início: `CAL-041: motor de horários disponíveis`.
4. Lógica de negócio (disponibilidade, telefone, planos, cotas) **sempre com testes** no Vitest.
5. Antes de dizer que terminou: rode `lint`, `typecheck` e `test`. Corrija o que quebrar.
6. Ao concluir, **marque o item como `[x]`** em `docs/BACKLOG.md` e escreva no fim da resposta o que foi feito, o que ficou pendente e como testar.
7. Toda migration nova: RLS ligado e policies escritas na mesma migration. Nunca use a chave `service_role` em código que roda no navegador.
8. Nunca commitar segredos. Novas variáveis vão para `.env.example` com descrição.
9. Se algo no backlog estiver ambíguo ou conflitar com este arquivo, **pergunte** antes de decidir sozinho.
10. Itens marcados como **(fora do código)** no backlog são tarefas do dono do projeto: não tente implementá-los.

## 8. Variáveis de ambiente (`.env.example`)

```
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WHATSAPP_MODE=mock                 # mock | live
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
BILLING_PROVIDER=                  # asaas | mercadopago | stripe (a definir)
BILLING_API_KEY=
BILLING_WEBHOOK_SECRET=
CRON_SECRET=
```

## 9. Comandos

```
npm run dev               # site em localhost:3000, painel em app.localhost:3000, negócio em {slug}.localhost:3000
npm run lint
npm run typecheck
npm run test              # Vitest
npm run test:e2e          # Playwright
npm run build
npx supabase start        # Supabase local (precisa do Docker)
npx supabase db reset     # aplica migrations + seed localmente
```

## 10. Sessões curtas (economia de tokens)

Cada card roda numa **sessão nova** (`/clear` entre cards). Nada de depender do histórico da conversa: o contexto vive nos arquivos.

**Ao começar uma sessão**, leia só isto, nesta ordem:
1. Este `CLAUDE.md`.
2. O bloco **Status** e **Próxima sessão** no topo de `docs/PROGRESSO.md` (não leia o histórico inteiro).
3. O item do card em `docs/BACKLOG.md` e, se existir, o plano em `docs/planos/CAL-xxx.md`.

**Ao terminar (ou parar no meio)**, antes de encerrar:
- Commit do que está verificado (mesmo parcial, com o ID do card).
- Atualize **Status** e **Próxima sessão** em `docs/PROGRESSO.md`: o que falta, decisões pendentes, comandos para retomar.
- Card grande (vários dias): divida em fases no `docs/planos/CAL-xxx.md` e faça **uma fase por sessão**.

**Para gastar pouco:**
- Leia trechos de arquivo (`offset`/`limit`, `grep`), não arquivos inteiros sem necessidade.
- Rode só os testes do que mudou; a suíte E2E completa só no fechamento do card.
- Teste E2E instável: não fique em loop. Commite o que passou e registre o problema em **Próxima sessão**.
- Não use subagentes sem pedido explícito.
