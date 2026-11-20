# Calenvia — Backlog

Ordem de implementação para o Claude Code. Cada item tem ID, prioridade (P0 essencial · P1 importante · P2 desejável · P3 futuro), estimativa em dias e critério de aceite.
Marque `[x]` quando concluir. Itens **(fora do código)** são tarefas do dono do projeto.

Planilha completa (com status e resumo): https://claude.ai/artifact/PFjjXxdtk9Lh8z35axBj1S

---

## M1 · MVP — o sistema funcionando de ponta a ponta

### Sprint 1 — Fundação
- [x] **CAL-020** · Repositório e projeto Next.js · P0 · 0,5d — Next.js + TypeScript strict + Tailwind, estrutura de pastas do CLAUDE.md, scripts `dev`, `lint`, `typecheck`, `test`.
- [x] **CAL-028** · Lint, formatação e CI · P1 · 0,5d — ESLint, Prettier, Vitest e GitHub Actions rodando lint + typecheck + testes em todo PR.
- [x] **CAL-021** · Projeto Supabase (dev e produção) · P0 · 0,5d — Supabase CLI configurado, migrations versionadas, clients server/browser/service role em `src/lib/supabase`.
- [x] **CAL-023** · Modelagem do banco de dados · P0 · 2d — Tabelas da seção 4 do CLAUDE.md, com índices e a constraint anti-conflito em `appointments`.
- [x] **CAL-024** · Multi-tenant com RLS · P0 · 2d — `business_id` em todas as tabelas de negócio. Dono só lê e escreve o próprio negócio. Testes de policy.
- [x] **CAL-027** · Datas e fuso horário · P0 · 1d — `src/lib/dates.ts`: UTC no banco, fuso do negócio na exibição, formatação pt-BR, testes de virada de dia.
- [x] **CAL-030** · Dados de demonstração (seed) · P1 · 0,5d — 2 negócios de exemplo (barbearia e manicure) com serviços, profissionais, horários e agendamentos.
- [x] **CAL-025** · Subdomínio por negócio · P0 · 1,5d — `middleware.ts` + `src/lib/hosts.ts` separando site, painel e negócio. Funciona com `*.localhost:3000` em dev.
- [x] **CAL-026** · Autenticação do dono · P0 · 1d — E-mail e senha + Google, recuperação de senha, rotas do painel protegidas.
- [ ] **CAL-022** · Deploy na Vercel · P0 · 0,5d — Preview e produção, domínio curinga configurado. *(Plano pago da Vercel antes de cobrar clientes.)*

### Sprint 2 — Cadastro e configuração do negócio
- [x] **CAL-017** · Design system básico · P1 · 2d — Tokens (cores, fontes Bricolage + Inter, espaçamentos), botões, inputs, cards, estados de erro e vazio.
- [x] **CAL-031** · Onboarding: criar o negócio · P0 · 2d — Passo a passo: nome, segmento, endereço, WhatsApp, slug → serviços → profissionais → horários → link pronto para copiar.
- [x] **CAL-032** · Validação e reserva do slug · P0 · 0,5d — Único, minúsculas e números (e hífen), sem nomes reservados, sugestão automática a partir do nome.
- [x] **CAL-033** · Cadastro de serviços · P0 · 1,5d — Nome, descrição, duração, preço, ativo, "mais pedido", ordenação.
- [x] **CAL-034** · Cadastro de profissionais · P0 · 1,5d — Nome, foto, cargo e serviços que cada um faz.
- [x] **CAL-035** · Horário de funcionamento · P0 · 1,5d — Por dia da semana: aberto/fechado, abertura, fechamento e intervalos.
- [x] **CAL-039** · Regras da agenda · P0 · 1d — Antecedência mínima, dias à frente, intervalo entre horários (15/30/60).
- [x] **CAL-038** · Upload de imagens · P1 · 1d — Supabase Storage, compressão, limite de tamanho, logo/capa/fotos.
- [x] **CAL-037** · Aparência da página · P1 · 2d — Logo, capa, cor de destaque, título e subtítulo, com prévia ao vivo.
- [x] **CAL-062** · Link da página nos ajustes · P0 · 0,5d — Copiar link, ver página, dica para a bio do Instagram.

### Sprint 3 — Motor de disponibilidade
- [x] **CAL-041** · Motor de horários disponíveis · P0 · 3d — Regras da seção 5 do CLAUDE.md. Funções puras em `src/lib/availability`.
- [x] **CAL-042** · Opção "Sem preferência" · P0 · 1d — Livre se algum profissional apto estiver livre. Atribui ao que tem menos agendamentos no dia.
- [x] **CAL-043** · Proteção contra agendamento duplo · P0 · 1,5d — Revalidação no servidor + constraint no banco + mensagem amigável.
- [x] **CAL-044** · Testes automatizados do motor · P0 · 1,5d — Serviço que não cabe antes de fechar, almoço, bloqueio, conflito, sem preferência, antecedência, dia fechado, fuso.

### Sprint 4 — Página pública e agendamento
- [x] **CAL-045** · Landing pública do negócio · P0 · 3d — Seções da seção 6 do CLAUDE.md, CTA único e barra fixa, cor de destaque do negócio.
- [x] **CAL-046** · Agendamento: escolher serviço · P0 · 1d — Lista com duração e preço, progresso de 4 passos, resumo fixo no rodapé.
- [x] **CAL-047** · Agendamento: escolher profissional · P0 · 0,5d — "Sem preferência" como padrão + profissionais aptos.
- [x] **CAL-048** · Agendamento: data e horário · P0 · 2d — Faixa de dias, grade Manhã/Tarde/Noite, dias fechados desabilitados, atalho para o próximo dia livre.
- [x] **CAL-049** · Agendamento: dados do cliente · P0 · 1d — Nome e WhatsApp com máscara `(00) 0 0000-0000` e validação. Lembra os dados no navegador.
- [x] **CAL-051** · Cadastro automático do cliente · P0 · 0,5d — Busca por negócio + WhatsApp normalizado. Cria ou atualiza o nome.
- [x] **CAL-050** · Tela de confirmação · P0 · 1d — Resumo, prévia da mensagem do WhatsApp, botão "Adicionar ao calendário" (.ics).
- [x] **CAL-072** · Plano B pelo link wa.me · P0 · 0,5d — No Básico ou sem cota: botão com a mensagem pronta para o dono enviar.

### Sprint 5 — Painel do dono
- [x] **CAL-055** · Agenda do dia · P0 · 3d — Linha do tempo com agendamentos, horários livres (clicáveis para criar), bloqueios e status.
- [x] **CAL-056** · Filtro por profissional e navegação de dias · P0 · 1d — Chips por profissional, setas, seletor de data e visão de semana.
- [x] **CAL-057** · Detalhe do agendamento · P0 · 2d — Concluído, faltou, remarcar, cancelar (com confirmação) e "Chamar no WhatsApp".
- [x] **CAL-058** · Novo agendamento manual · P0 · 1,5d — Só horários livres, busca de cliente existente, opção de enviar confirmação.
- [x] **CAL-059** · Bloquear horário · P0 · 1d — Profissional ou todos, início, fim e motivo.

---

## M2 · Beta — WhatsApp, cobrança e pilotos

### Sprint 6 — WhatsApp
- [ ] **CAL-066** · Conta Meta Business e número da Calenvia · P0 · 2d **(fora do código)** — Verificação na Meta pode levar dias. O Claude Code pode guiar e usar o MCP da Meta para configurar.
- [x] **CAL-067** · Templates de mensagem · P0 · 1d — Confirmação, lembrete e cancelamento (categoria utilidade). Textos versionados no código.
- [x] **CAL-068** · Envio da confirmação ao agendar · P0 · 2d — `sendWhatsApp()` com modo `mock` e `live`, gravação em `messages`.
- [x] **CAL-071** · Contador de mensagens e limites por plano · P0 · 1,5d — `message_usage` por mês, 300 no Pro, uso justo no Pro+, aviso ao dono perto do limite.
- [x] **CAL-069** · Lembrete automático · P0 · 2d — Vercel Cron a cada 10 min, sem duplicar, ignora cancelados.
- [x] **CAL-070** · Webhook de status das mensagens · P1 · 1,5d — Entregue, lida, falhou. Verificação do token da Meta.
- [x] **CAL-112** · Equipe com acessos e papéis · P0 · 4–5d — Dono, gerente, recepção e profissional com login; convites; RLS por papel. Plano em `docs/planos/CAL-112.md`.
- [x] **CAL-113** · Limites por cliente no banco · P1 · 0,5d — Padrão Básico 3 / Pro 10 / Pro+ ilimitado pessoas; `member_limit_override` e `message_limit_override` em `businesses` sobrescrevem o plano para um negócio (mensagens em qualquer plano). Como usar: `docs/LIMITES.md`.
- [x] **CAL-114** · Administração da Calenvia · P1 · 3d — `/admin` para a equipe da Calenvia: negócios e limites com histórico, métricas, suporte e mensagens com falha, ver o painel do cliente só para leitura. Fases em `docs/planos/CAL-114.md` (4 de 4 feitas).
- [x] **CAL-111** · Ajustes de mensagens automáticas · P0 · 1d — Ligar/desligar confirmação, lembrete (24 h e/ou 2 h) e cancelamento por negócio; desligar mensagens de um agendamento; envios bloqueados ficam como `skipped`.
- [x] **CAL-073** · Opt-out do cliente · P1 · 0,5d — Respeitar quem pede para não receber mensagens.

### Sprint 7 — Assinatura e cobrança
- [x] **CAL-075** · Escolher o gateway de pagamento · P0 · 0,5d **(fora do código — decisão)** — Asaas, Mercado Pago ou Stripe. **Decidido (2026-11-15): Stripe.** Plano em `docs/planos/CAL-076.md`.
- [x] **CAL-076** · Checkout dos planos · P0 · 3d — Pix e cartão, cobrança recorrente mensal, a partir de `/cadastro?plano=...`. **Feito (2026-11-15):** checkout com pagamento simulado e Stripe (cartão) prontos; falta testar com a conta Stripe do Victor (`docs/STRIPE.md`). Pix: conferir na conta.
- [x] **CAL-077** · Webhooks de pagamento · P0 · 2d — Ativar, renovar, atraso, cancelamento. Suspender recursos após X dias de atraso.
- [x] **CAL-078** · Recursos liberados por plano · P0 · 1,5d — `src/lib/plans.ts`, upgrade e downgrade.
- [x] **CAL-080** · Tela de assinatura no painel · P1 · 1,5d — Plano atual, faturas, uso de mensagens no mês, trocar e cancelar.
- [ ] **CAL-079** · Teste grátis · P1 · 0,5d **(decisão)** — Definir se terá (ex.: 14 dias sem cartão) e implementar se sim.
- [x] **CAL-115** · Extras pagos no plano (add-ons) · P1 · 2d — Catálogo de extras (+mensagens, +pessoas, valor livre) cobrados como itens da assinatura; preços versionados e editáveis no `/admin`. Plano em `docs/planos/CAL-076.md` (fases 1 e 5).
- [x] **CAL-116** · Registrar atendimento (agora ou passado) · P1 · 0,5d — Botão "Registrar" na agenda: lança direto como concluído quem chegou sem marcar ou não foi anotado na hora, com valor editável; cliente sem WhatsApp vira "cliente avulso" (nunca recebe mensagem).

### Sprint 8 — Pronto para o beta
- [x] **CAL-083** · Site calenvia.com.br · P0 · 0,5d — Converter `docs/referencias/landing-calenvia.html` para a rota `(site)`.
- [x] **CAL-084** · Botões dos planos → cadastro · P0 · 0,5d — `/cadastro?plano=basic|pro|pro_plus` → onboarding → checkout.
- [x] **CAL-012** · Páginas de Termos e Privacidade · P1 · 2d — Rotas `/termos` e `/privacidade`. *(Texto jurídico: fora do código.)*
- [x] **CAL-052** · Remarcar e cancelar pelo link · P1 · 2d — `/{slug}/gerenciar/{manage_code}`, respeitando o prazo mínimo do negócio.
- [x] **CAL-040** · Política de remarcação e cancelamento · P1 · 0,5d — Prazo mínimo configurável.
- [x] **CAL-036** · Horário próprio por profissional · P1 · 1d — Opcional, sobrescreve o do negócio.
- [x] **CAL-060** · Atualização em tempo real · P1 · 1d — Supabase Realtime na agenda.
- [x] **CAL-061** · Resumo do dia · P1 · 0,5d — Agendamentos, horários livres e faturamento previsto.
- [x] **CAL-063** · Lista de clientes · P1 · 1,5d — Visitas, faltas, última visita, total gasto, busca.
- [x] **CAL-053** · Acessibilidade e performance · P1 · 1d — Lighthouse ≥ 90 no celular.
- [x] **CAL-029** · Monitoramento de erros · P1 · 0,5d — Sentry ou similar.
- [x] **CAL-085** · Métricas de uso · P1 · 1d — Visita, cadastro, primeiro serviço, primeiro agendamento, assinatura.
- [x] **CAL-088** · Testes ponta a ponta · P1 · 2d — Playwright: agendar, cancelar, agendamento manual, assinatura.
- [x] **CAL-089** · Proteção contra spam · P1 · 1d — Rate limit por IP e captcha invisível no agendamento público.
- [x] **CAL-090** · Revisão de segurança das regras de acesso · P0 · 1d — Testes provando que um negócio nunca vê dados de outro.
- [x] **CAL-091** · LGPD dos clientes finais · P1 · 1,5d — Consentimento no agendamento, exportar e apagar dados de um cliente.
- [x] **CAL-092** · Backups e recuperação · P1 · 0,5d — Backup diário e teste de restauração.

---

## M3 · Lançamento
- [x] **CAL-054** · SEO e prévia de link por negócio · P2 · 1d — Meta tags e imagem Open Graph com nome e logo.
- [x] **CAL-064** · Aviso ao dono de novo agendamento · P2 · 1,5d — Notificação no navegador ou e-mail.
- [x] **CAL-065** · Painel instalável (PWA) · P2 · 1d
- [x] **CAL-086** · Demonstração pública · P1 · 1d — Negócio de exemplo para o visitante testar.
- [ ] **CAL-081** · Emissão de nota fiscal · P1 · 1d — Pelo gateway ou emissor da prefeitura.
- [ ] **CAL-082** · Régua de cobrança · P2 · 1d — Avisos de vencimento e atraso.

## M4 · Evolução
- [x] **CAL-099** · Domínio próprio (Pro+) · P2 · 3d — Tabela `custom_domains`, API da Vercel, SSL, middleware.
- [x] **CAL-100** · Relatórios de faturamento e faltas (Pro+) · P2 · 3d
- [x] **CAL-074** · Editor de mensagens por negócio · P2 · 2d
- [x] **CAL-101** · Suporte prioritário (Pro+) · P2 · 0,5d
- [x] **CAL-102** · Controle financeiro simples · P3 · 4d
- [ ] **CAL-103** · Sinal ou pagamento antecipado via Pix · P3 · 4d
- [x] **CAL-104** · Lista de espera · P3 · 2d
- [x] **CAL-105** · Pacotes de serviços · P3 · 3d
- [x] **CAL-106** · Avaliação após o atendimento · P3 · 2d
- [x] **CAL-107** · Integração com Google Agenda · P3 · 3d
- [ ] **CAL-108** · Número próprio do negócio no WhatsApp (Embedded Signup) · P3 · 5d
- [x] **CAL-109** · Programa de indicação · P3 · 2d
- [x] **CAL-110** · Avaliar app nativo · P3 · 1d

---

## M5 · Painel melhor — organização, agenda, métricas e admin

Pedido do Victor (2026-11-16): a interface do painel do dono e do `/admin` está confusa. Objetivo: navegação clara, agenda com calendário grande, dashboard com métricas e gráficos, e um admin organizado. **Ordem sugerida: Sprint 9 → 10 → 11 → 12 → 13.** Uma tarefa = um item; um item grande = uma fase por sessão (`docs/planos/CAL-xxx.md`).

**Regras para todos os itens deste marco**
- Mobile-first (390 px) **e** bom no computador: no desktop usar a largura (menu lateral, grades, tabelas), não uma coluna estreita.
- Português simples, sem termos técnicos (`past_due`, `override` etc. viram "Pagamento atrasado", "Limite personalizado").
- Gráficos em **SVG próprio, sem biblioteca nova** (CLAUDE.md: confirmar antes de dependência pesada). Cada gráfico precisa de tabela/texto alternativo (acessibilidade AA) e estado vazio.
- Cálculos de métricas em **funções puras com testes** (Vitest), em `src/lib/metrics-owner/` ou similar; telas só exibem.
- Valores em dinheiro só para quem tem `finance.view`; profissional comum vê só o que é dele.
- Rotas antigas que mudarem de lugar ganham redirecionamento (links salvos e e-mails não podem quebrar). Atualizar os testes E2E afetados.

### Sprint 9 — Estrutura do painel do dono
- [x] **CAL-117** · Novo menu do painel · P0 · 1d — Menu enxuto e previsível.
  - Desktop (menu lateral): **Início · Agenda · Clientes · Financeiro · Meu negócio · Ajustes**.
  - Celular (barra inferior, 5 itens): **Início · Agenda · Clientes · Meu negócio · Ajustes**; o Financeiro vira uma aba dentro do Início no celular.
  - Cada item aparece só se o papel tem permissão (`src/lib/permissions.ts`). Item ativo destacado, ícone + texto.
  - Aceite: nenhuma tela existente fica inacessível; teste E2E de navegação por papel (dono, gerente, recepção, profissional).
- [x] **CAL-118** · Aba "Meu negócio" · P0 · 2d — Tudo que é do negócio num lugar só, com **abas**: **Dados e página** (nome, endereço, link, aparência, QR code) · **Serviços e valores** · **Equipe** (profissionais, convites e acessos) · **Horários** (funcionamento, almoço, folgas) · **Pacotes**.
  - Move o que hoje está espalhado em `/ajustes/*` (negócio, serviços, profissionais, equipe, horários, pacotes, aparência, link).
  - Serviços: lista com preço, duração, ativo/inativo e "mais pedido" visíveis de uma vez; editar em painel lateral/modal sem sair da lista.
  - Aceite: onboarding continua funcionando; redirecionamentos das rotas antigas; E2E dos fluxos de serviço/equipe atualizados.
- [x] **CAL-119** · Aba "Ajustes" (plataforma e conta) · P1 · 1d — Só o que é geral: **Conta** (nome, e-mail, senha, **sair**) · **Notificações** · **Mensagens automáticas** · **Assinatura e cobrança** · **Domínio próprio** · **Google Agenda** · **Ajuda e suporte** · indicação.
  - Aceite: nada do negócio fica aqui; textos curtos explicando cada opção.

### Sprint 10 — Agenda
- [x] **CAL-120** · Corrigir a agenda: filtros rápidos e navegação na visão semana · P0 · 1d — Bugs relatados: (1) os filtros rápidos (profissional, Dia/Semana) se comportam errado; (2) na visão **Semana**, os botões de trocar de dia andam 1 dia em vez de 1 semana e/ou perdem `visao`/`profissional` da URL.
  - Primeiro: reproduzir e escrever o teste que falha (E2E em `tests/e2e/agenda.spec.ts`), depois corrigir. Suspeita: `q()` e os links "Dia anterior/Próximo dia" em `(main)/page.tsx` e `week-view.tsx`.
  - Regras: em **Semana**, anterior/próximo = ±7 dias e o título mostra o intervalo ("10 a 16 de nov"); em **Dia**, ±1 dia; filtros e visão persistem ao navegar; "Hoje" volta para o dia atual mantendo a visão.
  - Aceite: testes de navegação (dia, semana, mês, filtro de profissional) passando.
- [x] **CAL-121** · Calendário mensal estilo Google Agenda · P1 · 3d — Nova visão **Mês**: grade com todos os dias do mês, agendamentos como chips ("14:00 Fulano · Corte"), "+3 mais" quando não cabe, hoje destacado, dias fechados/bloqueados esmaecidos.
  - Seletor de visão: **Lista (como hoje) · Dia · Semana · Mês**, lembrando a última escolhida (preferência por usuário). **No computador, abre em Mês/Semana por padrão; no celular, em Lista.**
  - Clicar num dia abre o dia; clicar num agendamento abre o detalhe; botão "+" em cada dia leva ao "Novo" com a data preenchida. Filtro por profissional vale em todas as visões; respeita `appointments.view_all`.
  - Celular: grade compacta com pontos/contagem por dia e a lista do dia selecionado embaixo.
  - Navegação por teclado e leitor de tela (grade com `aria-label` por dia). Carregar só o intervalo visível do mês.
  - Aceite: E2E nas visões Dia, Semana e Mês; função pura que monta a grade do mês (semanas começando no domingo ou segunda, a definir) com testes.
- [x] **CAL-122** · Visão Semana no computador (colunas por hora) · P2 · 2d — Grade de 7 colunas com eixo de horas e blocos proporcionais à duração, linha do "agora", arrastar não é necessário nesta versão.
  - Aceite: usável de 1024 px para cima; no celular continua a lista da semana atual.

### Sprint 11 — Início (dashboard), métricas e financeiro
- [x] **CAL-123** · Início com resumo do negócio (dashboard) · P1 · 3d — Primeira tela do painel: faturamento de hoje/semana/mês (com comparação ao período anterior), agendamentos de hoje e próximos, taxa de falta, taxa de ocupação, clientes novos x que voltaram, avisos (cota de mensagens, assinatura). Cartões de número + 2 gráficos.
  - Profissional vê só os próprios números; sem `finance.view` os valores em R$ não aparecem.
  - Aceite: estados vazios para negócio novo ("assim que você tiver atendimentos, os números aparecem aqui"); carrega em < 1 s com 5 mil agendamentos (consulta agregada no banco, view/função SQL com RLS).
- [x] **CAL-124** · Métricas de retorno dos clientes · P1 · 2d — **Tempo médio entre uma visita e a próxima** (geral e por cliente), **taxa de retorno** (voltou em 30/60/90 dias), **clientes sumidos** (passaram do tempo médio dele sem voltar) com botão "Chamar no WhatsApp" (link `wa.me` com mensagem pronta; sem envio automático).
  - Funções puras com testes (casos: 1 visita só, visitas no mesmo dia, cancelados e faltas não contam, cliente avulso fora da conta).
  - Aceite: aparece no Início e em Clientes (filtro "Sumidos").
- [x] **CAL-125** · Ranking de clientes · P1 · 1d — **Mais frequentes** (nº de visitas) e **que mais gastam**, por período (30 dias, 90 dias, ano, sempre), com ligação para o cliente. Cliente avulso não entra.
- [x] **CAL-126** · Faturamento por dia, semana e mês, com gráficos · P1 · 2d — Seletor de período (dia/semana/mês + intervalo personalizado); gráfico de barras por dia/semana/mês, **por serviço** e **por profissional**; ticket médio; comparação com o período anterior.
  - Considera só atendimentos `completed` (inclui os do "Registrar atendimento") + entradas manuais do financeiro.
  - Aceite: números batem com o relatório e o financeiro atuais (teste cruzando as três fontes); gráfico acessível.
- [x] **CAL-127** · Aba "Financeiro" unificada · P1 · 2d — Junta Relatórios (CAL-100) e Controle financeiro (CAL-102) numa aba com sub-abas: **Resumo** (faturamento, despesas, saldo) · **Entradas e despesas** (lançamentos) · **Relatórios** (faltas, por serviço, por profissional) · **Exportar** (CSV do mês).
  - Visível só com `finance.view`. Decisão de plano (padrão proposto): Resumo e faturamento básico em **todos os planos**; comparativos e exportação em **Pro+**, como hoje.
  - Aceite: `/relatorios` e `/financeiro` redirecionam para a nova aba.
- [x] **CAL-128** · Forma de pagamento no atendimento · P2 · 1d — Campo dinheiro/Pix/cartão/outro ao concluir ou registrar atendimento; resumo do caixa do dia por forma de pagamento no Financeiro. *(Migration + RLS na mesma migration.)*

### Sprint 12 — Administração da Calenvia (`/admin`)
- [x] **CAL-129** · Sair no admin e menu organizado · P0 · 1d — Botão **Sair** sempre visível (o admin hoje não tem) e menu lateral agrupado: **Clientes** (Negócios, Suporte) · **Dinheiro** (Assinaturas, Preços) · **Saúde** (Métricas, Mensagens). No celular, menu recolhível; contador de pendências ao lado de cada item.
  - Aceite: logout limpa a sessão e volta para `/entrar`; E2E.
- [x] **CAL-130** · Home do admin: o que fazer agora + lista de negócios de verdade · P0 · 2d — Topo com **pendências** (negócios aguardando liberação com botão "Ativar", pagamentos atrasados, contas suspensas, suporte aberto, mensagens com falha). Abaixo, a **lista completa de negócios**: busca, filtros (plano, status, cidade/segmento), ordenação, paginação, colunas **negócio · dono · plano · status · valor/mês · cadastro · último acesso · agendamentos no mês**; no celular, cartões.
  - Aceite: nenhum negócio fica fora da lista (inclui `pending`, suspensos e cancelados, com rótulo); busca por nome, slug, e-mail do dono ou WhatsApp.
- [ ] **CAL-131** · Tela do negócio em abas · P1 · 2d — Cabeçalho fixo com nome, plano, status e ações principais (**Ativar cortesia · Entrar como o negócio · Suspender/Reativar**). Abas: **Resumo** · **Plano e cobrança** · **Extras e limites** · **Equipe** · **Atividade** (histórico de ações do admin). Ações perigosas pedem confirmação explicando o efeito; textos sem jargão.
  - Aceite: nenhuma ação atual se perde; E2E dos fluxos de cortesia, limites e extras (`admin.spec.ts`) atualizados.
- [ ] **CAL-132** · Métricas claras do admin · P1 · 2d — Reescrever `/admin/metricas` com poucos números que importam e gráficos: **MRR** (e variação), **assinantes por plano**, **novos cadastros por semana**, **ativação** (cadastro → 1º agendamento em 7 dias), **cancelamentos/churn**, **inadimplência**, **mensagens enviadas x falhas**, **negócios mais ativos e menos ativos**. Período selecionável; cada número com uma frase explicando o que significa.
  - Aceite: funções puras testadas; MRR confere com as assinaturas ativas (manuais/cortesia aparecem separados, com R$ 0).
- [ ] **CAL-133** · Acesso master ("Entrar como o negócio") · P1 · 2d · **plano em `docs/planos/CAL-133.md` antes de codar** — Do admin, abrir o painel de um negócio **como se fosse o dono**, para ajudar o cliente.
  - Hoje existe só a visão somente leitura (`/admin/negocios/[id]/visao`). Esta tarefa adiciona o modo **com edição**, com estas regras (seguras por padrão): só `platform_admin`; **começa em leitura** e pede um clique em "Permitir editar" com **motivo** obrigatório; **faixa fixa no topo** ("Você está no painel de {negócio} · Sair do modo suporte"); **expira em 30 min**; **auditoria** de início, fim e de **cada gravação** (quem, quando, o quê); **bloqueado** nesse modo: trocar e-mail/senha do dono, apagar conta, cancelar assinatura, ver ou exportar dados pessoais de clientes sem necessidade (LGPD). Nunca expor a senha do dono e **nunca usar `service_role` no navegador**: a sessão de suporte vive no servidor.
  - Aceite: testes de banco/E2E provando que um admin comum de negócio não consegue ativar o modo; que o modo expira; que cada gravação gera auditoria; que o dono vê no histórico de acessos quando houve suporte (transparência).

### Sprint 13 — Acabamento de UI/UX
- [ ] **CAL-134** · Revisão de UI/UX do painel e do admin · P1 · 3d — Passada geral depois dos sprints 9–12: layout para computador (menu lateral, tabelas, largura útil), estados vazios/carregando/erro em toda tela, **esqueletos de carregamento** (`loading.tsx`) onde a página demora, textos revisados em português simples, consistência de botões, espaçamentos e ícones, foco e contraste AA.
  - Performance: medir no build de produção (o modo dev é lento por compilar a página na primeira visita); metas: troca de tela < 500 ms com cache; consultas pesadas do Início/Financeiro agregadas no banco.
  - Aceite: `acessibilidade.spec.ts` cobre todas as telas novas; lista "antes e depois" no `docs/PROGRESSO.md`; teste de usabilidade rápido com 2 donos reais (CAL-093) antes de fechar.

**Decisões em aberto (padrão adotado se o Victor não disser nada):** semana começa na segunda-feira · dashboard/faturamento básico em todos os planos, comparativos e exportação só Pro+ · gráficos em SVG próprio · modo suporte do admin começa em leitura e expira em 30 min.

---

## M6 · Acesso por convite e biblioteca de temas

Pedido do Victor (2026-11-20): (1) enquanto a integração com o Stripe não sai, **desligar cobrança e cadastro aberto**; as contas são **por convite**, pré-cadastradas no `/admin`, e a pessoa termina a configuração do negócio; (2) o visual ficou **masculino demais**: criar uma **biblioteca de temas e templates** de página pública, de estilos bem variados, com **preview** antes de escolher, **paleta de cores editável** e **logo opcional**. **Ordem: Sprint 14 → 15 → 16 → 17.** A Sprint 14 é urgente (P0) e independente das demais.

**Regras para todos os itens deste marco**
- **Não apagar o código de cobrança** (`src/lib/billing`, checkout, Stripe): só esconder atrás de chaves de configuração, para religar quando o Stripe estiver pronto.
- Mobile-first (390 px), contraste AA **garantido pelo sistema** (o dono não consegue montar uma combinação ilegível), português simples.
- Tudo que for escolha visual do negócio fica em **dados** (`businesses.theme`, JSON validado com Zod), nunca em código por negócio. Templates e paletas ficam em `src/lib/themes/` como dados + componentes, com testes das funções puras (contraste, derivação de cores).
- Mudou tabela: migration com RLS na mesma migration. Páginas públicas continuam lendo pelo servidor.
- Fontes novas só via `next/font` (Google Fonts, gratuitas); nada de serviço pago ou dependência pesada sem confirmar.

### Sprint 14 — Acesso por convite (sem cobrança e sem cadastro aberto)
- [x] **CAL-135** · Chaves de modo: cadastro e cobrança desligáveis · P0 · 1d — Duas variáveis em `.env.example` e leitura centralizada em `src/lib/config/access.ts`: `SIGNUP_MODE=invite|open` (padrão **`invite`**) e `BILLING_ENABLED=false|true` (padrão **`false`**).
  - Com `SIGNUP_MODE=invite`: `/cadastro` (e `?plano=`) deixa de criar conta; mostra "A Calenvia está em acesso por convite" com botão para pedir acesso (WhatsApp/lista de espera) e link "Já tenho convite" (entrar). A action de cadastro **recusa no servidor** também (não basta esconder a tela). Login com Google, se ligado, não cria conta nova.
  - Com `BILLING_ENABLED=false`: some o checkout, o "Assinar e ativar", faixas de cobrança e a tela `/assinatura` mostra só o plano atual e "Cortesia" (sem cartão); webhooks de cobrança continuam respondendo 200 sem agir. Contas convidadas entram `active` (assinatura `manual`, como a cortesia do admin).
  - Aceite: testes provando que, no modo convite, **não existe caminho** para criar conta sem convite (rota, action e callback do Google); ligar `open`/`true` restaura o comportamento atual; E2E ajustados.
- [x] **CAL-136** · Convite de negócio pelo `/admin` · P0 · 2d — Em `/admin` → **"Convidar negócio"**: o admin pré-cadastra **nome do negócio, segmento, nome e e-mail do dono, WhatsApp, plano e extras/limites** (opcional). O sistema cria o negócio já `active`, **sem o dono ter conta ainda**, e gera um **link de convite** (token aleatório, de uso único, validade 7 dias, guardado só como hash) para copiar e mandar no WhatsApp, com texto pronto (`wa.me`) e botão "Enviar por e-mail" se houver e-mail transacional.
  - Lista de convites com estado: **Enviado · Aberto · Aceito · Expirado · Cancelado**; ações: **reenviar/gerar novo link**, **cancelar**, **editar dados pré-cadastrados**. Convite aceito leva ao negócio na lista de negócios (CAL-130).
  - Admin pode pré-cadastrar tudo que ajude: serviços iniciais a partir do segmento (reaproveitar o catálogo de CAL-035/segmentos, se existir), sem inventar dados do negócio.
  - Migration `invitations` (business_id, email, token_hash, status, expires_at, accepted_at, created_by) com RLS: só `platform_admin` lê/escreve; auditoria de criação/cancelamento.
  - Aceite: testes de banco (RLS, token de uso único, expiração, hash) e E2E do fluxo criar → copiar link → listar.
- [x] **CAL-137** · Aceitar convite e terminar a configuração · P0 · 2d — Página `/convite/{token}`: valida o token no servidor, mostra "Você foi convidado para a **{negócio}**", pede **senha** (e confirma o e-mail já preenchido, travado), cria o usuário como **dono** do negócio pré-cadastrado e cai no **onboarding** com os dados do convite já preenchidos.
  - Onboarding ajustado: mostra só o que falta (endereço, horários, serviços, equipe, **escolher o tema da página** quando a Sprint 15 existir), com barra de progresso e "continuar depois"; **nada de checkout** nem escolha de plano.
  - Casos de erro com mensagem clara: link expirado ("peça um novo ao suporte" + botão WhatsApp), já usado (leva ao login), e-mail já existente no Auth (vincula ao negócio **só** se o convite foi criado para aquele e-mail e a pessoa confirma a senha dessa conta).
  - Aceite: E2E convite → senha → onboarding → página pública no ar; token usado duas vezes é recusado; token adulterado/expirado é recusado; limite de tentativas por IP.
- [x] **CAL-138** · Site (home) sem preços e sem "criar conta" · P0 · 1d — Home `(site)`: **remover a seção de planos/preços e todos os botões "Assinar/Criar conta/Começar grátis"**; trocar por **"Pedir meu acesso"** (WhatsApp da Calenvia, **5583986479932**, guardado em variável `NEXT_PUBLIC_SUPPORT_WHATSAPP` no `.env.example`, com mensagem pronta e/ou formulário de lista de espera gravado em tabela `waitlist` com RLS) e "Já sou cliente → Entrar". Texto curto explicando "acesso por convite enquanto montamos a nova fase".
  - Cabeçalho/rodapé e `opengraph-image` sem menção a preço; `/cadastro?plano=` redireciona para a home. Termos/privacidade intactos (revisar menções a pagamento se houver).
  - Com `SIGNUP_MODE=open` + `BILLING_ENABLED=true`, a seção de planos volta (componente guardado, não apagado).
  - Aceite: nenhuma página pública mostra preço enquanto `BILLING_ENABLED=false`; `acessibilidade.spec.ts` do site passando; lista de espera recebe o contato e o admin vê em `/admin` (lista simples, exportar CSV).
- [x] **CAL-139** · Admin: tratar contas sem cobrança · P1 · 1d — No `/admin`, com cobrança desligada: esconder simulação de pagamento e Stripe; "Ativar cortesia" vira o estado padrão; filtros e pendências (CAL-130) deixam de contar `pending` por falta de pagamento. Mostrar **"Convites pendentes"** nas pendências do topo.
  - Aceite: `admin.spec.ts` atualizado; nenhuma ação do admin leva a tela de pagamento.

### Sprint 15 — Fundação da biblioteca de temas
- [x] **CAL-140** · Modelo de tema, tokens e leitura no servidor · P0 · 2d · **plano em `docs/planos/CAL-140.md` antes de codar** — Hoje a página pública tem um único visual (escuro, estilo página de vendas) com só `accent_color`. Criar o **contrato de tema**:
  - `businesses.theme` (jsonb, validado por Zod, versionado): `{ templateId, palette: { mode: "claro"|"escuro", primary, secondary?, background, surface, text }, paletteId?, fontPairId, radius, density, logo: { mostrar, formato }, sections: { id, visivel, ordem }[] }`. Migration + RLS; `accent_color` continua funcionando (migra para `palette.primary`).
  - Camada de **tokens CSS** (`--c-primary`, `--c-bg`, `--c-surface`, `--c-text`, `--radius`, `--font-display`, `--font-body`) aplicada na raiz da página pública; os componentes das seções só usam tokens, nunca cor fixa.
  - Funções puras em `src/lib/themes/`: **contraste WCAG** (razão), **escolha automática de cor de texto** sobre uma cor, **derivação de tons** (hover, borda, fundo suave) a partir de 1–2 cores, **ajuste para AA** (escurece/clareia até passar) e validação do JSON.
  - Aceite: testes das funções puras (casos: branco sobre amarelo reprova e é corrigido, cor inválida, tema antigo sem `theme` cai no padrão atual); página atual continua idêntica por padrão (screenshot/E2E sem regressão).
- [ ] **CAL-141** · Paletas prontas e editor de cores · P0 · 2d — **Biblioteca de ~16 paletas** com nome em português e prévia em bolinhas, cobrindo gostos variados (nada de só preto/dourado): *Nude rosado · Lavanda suave · Verde sálvia · Terracota · Azul-petróleo · Vinho e creme · Pêssego · Menta fresca · Grafite e dourado · Preto e vermelho · Azul-marinho · Areia e oliva · Rosa chiclete · Café com leite · Oceano · Monocromático claro*, em versões **claras e escuras**.
  - **Editor**: escolher paleta pronta **ou** ajustar cor principal (seletor + campo hexadecimal) e, opcional, cor secundária; modo claro/escuro; botão "Voltar à paleta original". O sistema **corrige sozinho** combinações abaixo de AA e avisa em português ("Ajustamos o texto do botão para ficar legível").
  - Sugestão de paleta pela **cor do logo** quando houver logo (CAL-143), usando só funções puras (sem serviço externo).
  - Aceite: toda paleta pronta passa AA em texto, botão e links (teste automatizado percorrendo todas); cor digitada inválida mostra erro claro; salvar atualiza a página pública na hora.
- [ ] **CAL-142** · Pares de fontes e formas · P1 · 1d — **6–8 pares de fontes** carregados com `next/font` (títulos + texto), ex.: elegante serifada, geométrica moderna, arredondada amigável, editorial, manuscrita só em destaques, clássica. Opções de **cantos** (retos · suaves · bem arredondados) e **densidade** (compacta · confortável).
  - Aceite: fontes só carregadas quando o tema as usa (sem peso extra para os demais); `font-display: swap`; nenhuma quebra de layout no celular de 390 px com os nomes longos.
- [ ] **CAL-143** · Logo opcional (e fallback bonito sem logo) · P0 · 1d — Upload de **logo** em "Meu negócio → Dados e página" (PNG/JPG/SVG/WebP, até 2 MB, validado no servidor; SVG sanitizado ou convertido; bucket do Storage com policy por `business_id`). **Totalmente opcional:** sem logo, a página mostra o **nome do negócio em tipografia do tema** (ou monograma com as iniciais) e fica tão boa quanto com logo.
  - Opções: onde aparece (cabeçalho, abertura, rodapé), formato (quadrado, redondo, livre), versão para fundo escuro/claro (campo opcional de segunda logo). Recorte/zoom simples antes de salvar.
  - Logo também em `og` (compartilhamento), `manifest`/ícone e e-mails.
  - Aceite: página sem logo passa nos testes de aparência/acessibilidade; logo grande é redimensionada; `alt` com o nome do negócio.

### Sprint 16 — Templates (a biblioteca)
> Cada template é um **conjunto completo** (estrutura das seções, tipografia, formas, fotos, ritmo de espaçamento e paleta padrão), não só uma troca de cor. Todos usam o mesmo conteúdo do negócio e as mesmas seções, mantendo **uma única ação** ("Agendar meu horário") e a barra fixa no rodapé. Mobile-first.
- [ ] **CAL-144** · Arquitetura de templates e seções · P0 · 2d — Refatorar a página pública `(negocio)/[slug]/page.tsx` em **seções independentes** (abertura, como funciona, serviços, equipe, fotos, depoimentos, onde fica, dúvidas, chamada final) que recebem **dados + tema**. Cada template = `src/lib/themes/templates/{id}/` com `meta` (nome, descrição, segmentos indicados, paleta padrão, fonte padrão), variantes das seções que quiser sobrescrever e `index`. Registro central em `src/lib/themes/registry.ts`.
  - O dono pode **ligar/desligar e reordenar seções** (menos a abertura e a chamada final) sem mudar de template.
  - Aceite: o template atual vira o **"Noturno"** (primeiro da lista) sem mudar nada visualmente; testes de snapshot/E2E; template desconhecido cai no padrão sem quebrar.
- [ ] **CAL-145** · Templates da primeira leva (6) · P0 · 5d (uma fase por template, uma por sessão) — Estilos **bem diferentes entre si**, com público feminino, masculino e neutro bem representados:
  1. **Noturno** (atual: escuro, ousado, títulos enormes) — barbearia, tattoo, academia.
  2. **Delicado** — fundo claro quente, serifada elegante, cantos suaves, ornamentos finos — salão, manicure, estética, sobrancelha.
  3. **Clínico** — branco e azul/verde-água, limpo, muito respiro, ícones simples e selos de confiança — clínica, consultório, psicólogo, fisioterapia.
  4. **Vitrine** — grade de fotos grande (estilo portfólio/Instagram), texto enxuto — nail designer, maquiagem, fotógrafo, tattoo.
  5. **Natureza** — tons terrosos/verdes, formas orgânicas, tipografia calma — spa, massagem, yoga, pilates, nutrição.
  6. **Alegre** — cores vivas, cantos bem arredondados, adesivos/ícones divertidos, tom informal — pet shop, lava-jato, estúdio infantil, personal.
  - Cada um com: capa/abertura própria, estilo de cartão de serviço, equipe e depoimentos próprios, paleta padrão e **2 paletas alternativas recomendadas**.
  - Aceite por template: passa `acessibilidade.spec.ts` em claro e escuro quando houver, sem rolagem horizontal em 390 px, Lighthouse mobile ≥ 90 em desempenho e acessibilidade.
- [ ] **CAL-146** · Templates da segunda leva (6) · P1 · 5d — Mais variedade: **Editorial** (revista, tipografia grande, preto e branco com um toque de cor) · **Boutique** (luxo discreto, serifada fina, muito espaço, cor única) · **Pop** (colorido, blocos e formas geométricas, jovem) · **Minimalista** (só tipografia e linhas) · **Retrô** (anos 70/80, texturas e cores quentes, ótimo para barbearia clássica e tattoo) · **Floral/Romântico** (pastéis e detalhes botânicos, noivas, estética, buffet de beleza).
  - Mesmos critérios de aceite do CAL-145. Se algum não ficar bom, é melhor **entregar menos templates** do que um fraco.
- [ ] **CAL-147** · Estilos de imagem e capas padrão · P1 · 2d — O visual não pode depender de o dono ter boas fotos: cada template tem **capas padrão** (gradientes, padrões geométricos/ilustrações SVG próprias, sem banco de imagens pago nem direitos de terceiros), **tratamento de foto** (sem filtro · duotone com a cor do tema · cantos/máscaras do template) e **molduras** para fotos de baixa qualidade. Ilustrações próprias ou de licença livre registrada em `docs/LICENCAS.md`.
  - Aceite: negócio sem nenhuma foto continua com página bonita em todos os templates; foto vertical/horizontal/pequena não quebra a abertura.

### Sprint 17 — Escolher, pré-visualizar e aplicar
- [ ] **CAL-148** · Galeria de temas com preview ao vivo "como vai ficar o seu time" · P0 · 4d · **plano em `docs/planos/CAL-148.md` antes de codar** — Tela **"Meu negócio → Aparência"** (e passo do onboarding): galeria de templates em cartões com miniatura; ao tocar, abre o **preview em tela cheia do SEU negócio** — nome, logo (se houver), serviços e preços, **profissionais e fotos da equipe**, horários e endereço reais — renderizado com o template escolhido, sem salvar.
  - Controles no preview, sempre visíveis (rodapé fixo no celular, painel lateral no computador): **trocar paleta** (galeria de bolinhas + cor personalizada), **claro/escuro**, **par de fontes**, **mostrar/ocultar seções**, **logo** (subir/remover) — tudo atualiza o preview na hora, sem recarregar. Alternar **celular ↔ computador** no preview.
  - Se o negócio ainda **não tem dados** (recém-convidado), o preview usa **dados de exemplo** do segmento ("Studio Exemplo", serviços e equipe fictícios) com faixa "Exemplo — seus dados entram aqui".
  - Botões: **"Usar este tema"** (salva e publica), **"Voltar"** (descarta), e **"Ver como o cliente vê"** (abre a página pública real em outra aba). Aviso se há alterações não salvas.
  - Preview implementado reaproveitando os **mesmos componentes** da página real (renderização cliente com o `theme` em memória), para nunca divergir do resultado publicado. Sem iframe com cookies/estado do painel.
  - Aceite: E2E escolhe template → muda paleta → sobe logo → salva → página pública igual ao preview; descartar não altera nada; usável a 390 px; teclado e leitor de tela (cartões são botões, foco visível, `aria-live` ao trocar).
- [ ] **CAL-149** · Sugestão de tema pelo segmento e "tema aleatório" · P2 · 1d — No onboarding, o segmento escolhido ordena a galeria (os mais indicados primeiro, com selo "Combina com {segmento}"). Botão **"Surpreenda-me"** sorteia template + paleta compatíveis (sempre AA).
  - Aceite: teste da função pura de ordenação por segmento; sorteio nunca gera tema reprovado em contraste.
- [ ] **CAL-150** · Tema nas demais páginas do cliente e nas comunicações · P1 · 2d — Aplicar o tema (cores, fonte, logo, cantos) também no **fluxo de agendamento** (`/agendar`), **confirmado**, **gerenciar** e **avaliar**, no **cartão de compartilhamento (Open Graph)**, no QR code e no **e-mail transacional** (quando existir). A barra de progresso e o resumo fixo continuam como no CLAUDE.md.
  - Aceite: nenhuma tela do cliente final fica com a marca antiga/índigo quando o negócio tem tema; contraste AA em todas as combinações das paletas prontas (teste percorrendo template × paleta).
- [ ] **CAL-151** · Site da Calenvia menos masculino · P1 · 3d — Revisar a **landing da própria Calenvia** (`(site)` e `docs/referencias/landing-calenvia.html`) e o painel para um visual **acolhedor e neutro**: paleta que mantenha o índigo da marca mas com tons quentes de apoio (pêssego, lavanda, verde-menta), fotos/ilustrações com **mulheres e homens de vários tipos de negócio** (salão, manicure, clínica, pet, personal), exemplos e textos que citem **todos os segmentos** (não só barbearia), cantos mais suaves e mockups com templates variados (Delicado, Clínico, Alegre, Noturno) na seção "veja como fica".
  - A seção "veja como fica" usa os **templates reais** (miniaturas da galeria) para vender a personalização.
  - Aceite: revisão visual lado a lado com a versão anterior no `docs/PROGRESSO.md`; contraste AA e `acessibilidade.spec.ts` do site passando; nenhum exemplo/depoimento exclusivamente masculino.
- [ ] **CAL-152** · Demo, seed e testes com todos os temas · P1 · 1d — O seed e o `/demo` ganham negócios de exemplo em **vários templates** (um por segmento: barbearia, salão, clínica, pet, pilates), para olhar e testar. Teste E2E/Playwright que **percorre todos os templates** com screenshot em 390 px e 1280 px (guardar como referência visual) e confere ausência de rolagem horizontal e erros de console.
  - Aceite: `npm run test:e2e -- temas` passa; adicionar um template novo ao registro o inclui automaticamente na varredura.

**Decisões em aberto (padrão adotado se o Victor não disser nada):** todos os templates e paletas disponíveis em **todos os planos** (sem trava por plano, por enquanto) · logo opcional, nunca obrigatória · pedido de acesso pela home via **WhatsApp da Calenvia + lista de espera** · convites valem 7 dias e são de uso único · o negócio convidado nasce `active` com assinatura `manual` (cortesia), sem cobrança, até o Stripe entrar · template atual vira o "Noturno" e continua o padrão para quem não escolher.

---

## Fora do código (tarefas do dono do projeto)
- [x] CAL-001 Nome e identidade (Calenvia)
- [ ] CAL-002 Registrar calenvia.com.br
- [ ] CAL-003 Criar @calenvia.app no Instagram
- [ ] CAL-004 Busca de marca no INPI
- [x] CAL-005 Planos e preços
- [x] CAL-006 Simulação de custos e lucro
- [ ] CAL-007 Entrevistar 10 donos de negócio
- [ ] CAL-008 Fechar 3 a 5 negócios piloto
- [ ] CAL-009 Analisar concorrentes
- [ ] CAL-010 Uso justo do Pro+, cancelamento e fidelidade
- [ ] CAL-011 Enquadramento fiscal e nota fiscal
- [x] CAL-013 Wireframes
- [x] CAL-014 Landing do negócio (design)
- [x] CAL-015 Landing da Calenvia (HTML)
- [ ] CAL-016 Rodar a POC no Gemini Canvas
- [ ] CAL-018 Telas de alta fidelidade do painel *(opcional: o Claude Code pode desenhar direto no código)*
- [ ] CAL-019 Telas de onboarding *(idem)*
- [ ] CAL-087 Conteúdo e material de venda
- [ ] CAL-093 Beta fechado com os pilotos
- [ ] CAL-094 Ajustes com o feedback do beta
- [ ] CAL-095 Central de ajuda e tutorial
- [ ] CAL-096 Canal de suporte
- [ ] CAL-097 Coletar depoimentos reais
- [ ] CAL-098 Lançamento público
