# Calenvia — Backlog

Ordem de implementação para o Claude Code. Cada item tem ID, prioridade (P0 essencial · P1 importante · P2 desejável · P3 futuro), estimativa em dias e critério de aceite.
Marque `[x]` quando concluir. Itens **(fora do código)** são tarefas do dono do projeto.

Planilha completa (com status e resumo): https://claude.ai/artifact/PFjjXxdtk9Lh8z35axBj1S

---

## M1 · MVP — o sistema funcionando de ponta a ponta

### Sprint 1 — Fundação
- [x] **CAL-020** · Repositório e projeto Next.js · P0 · 0,5d — Next.js + TypeScript strict + Tailwind, estrutura de pastas do CLAUDE.md, scripts `dev`, `lint`, `typecheck`, `test`.
- [x] **CAL-028** · Lint, formatação e CI · P1 · 0,5d — ESLint, Prettier, Vitest e GitHub Actions rodando lint + typecheck + testes em todo PR.
- [ ] **CAL-021** · Projeto Supabase (dev e produção) · P0 · 0,5d — Supabase CLI configurado, migrations versionadas, clients server/browser/service role em `src/lib/supabase`.
- [ ] **CAL-023** · Modelagem do banco de dados · P0 · 2d — Tabelas da seção 4 do CLAUDE.md, com índices e a constraint anti-conflito em `appointments`.
- [ ] **CAL-024** · Multi-tenant com RLS · P0 · 2d — `business_id` em todas as tabelas de negócio. Dono só lê e escreve o próprio negócio. Testes de policy.
- [ ] **CAL-027** · Datas e fuso horário · P0 · 1d — `src/lib/dates.ts`: UTC no banco, fuso do negócio na exibição, formatação pt-BR, testes de virada de dia.
- [ ] **CAL-030** · Dados de demonstração (seed) · P1 · 0,5d — 2 negócios de exemplo (barbearia e manicure) com serviços, profissionais, horários e agendamentos.
- [ ] **CAL-025** · Subdomínio por negócio · P0 · 1,5d — `middleware.ts` + `src/lib/hosts.ts` separando site, painel e negócio. Funciona com `*.localhost:3000` em dev.
- [ ] **CAL-026** · Autenticação do dono · P0 · 1d — E-mail e senha + Google, recuperação de senha, rotas do painel protegidas.
- [ ] **CAL-022** · Deploy na Vercel · P0 · 0,5d — Preview e produção, domínio curinga configurado. *(Plano pago da Vercel antes de cobrar clientes.)*

### Sprint 2 — Cadastro e configuração do negócio
- [ ] **CAL-017** · Design system básico · P1 · 2d — Tokens (cores, fontes Bricolage + Inter, espaçamentos), botões, inputs, cards, estados de erro e vazio.
- [ ] **CAL-031** · Onboarding: criar o negócio · P0 · 2d — Passo a passo: nome, segmento, endereço, WhatsApp, slug → serviços → profissionais → horários → link pronto para copiar.
- [ ] **CAL-032** · Validação e reserva do slug · P0 · 0,5d — Único, minúsculas e números (e hífen), sem nomes reservados, sugestão automática a partir do nome.
- [ ] **CAL-033** · Cadastro de serviços · P0 · 1,5d — Nome, descrição, duração, preço, ativo, "mais pedido", ordenação.
- [ ] **CAL-034** · Cadastro de profissionais · P0 · 1,5d — Nome, foto, cargo e serviços que cada um faz.
- [ ] **CAL-035** · Horário de funcionamento · P0 · 1,5d — Por dia da semana: aberto/fechado, abertura, fechamento e intervalos.
- [ ] **CAL-039** · Regras da agenda · P0 · 1d — Antecedência mínima, dias à frente, intervalo entre horários (15/30/60).
- [ ] **CAL-038** · Upload de imagens · P1 · 1d — Supabase Storage, compressão, limite de tamanho, logo/capa/fotos.
- [ ] **CAL-037** · Aparência da página · P1 · 2d — Logo, capa, cor de destaque, título e subtítulo, com prévia ao vivo.
- [ ] **CAL-062** · Link da página nos ajustes · P0 · 0,5d — Copiar link, ver página, dica para a bio do Instagram.

### Sprint 3 — Motor de disponibilidade
- [ ] **CAL-041** · Motor de horários disponíveis · P0 · 3d — Regras da seção 5 do CLAUDE.md. Funções puras em `src/lib/availability`.
- [ ] **CAL-042** · Opção "Sem preferência" · P0 · 1d — Livre se algum profissional apto estiver livre. Atribui ao que tem menos agendamentos no dia.
- [ ] **CAL-043** · Proteção contra agendamento duplo · P0 · 1,5d — Revalidação no servidor + constraint no banco + mensagem amigável.
- [ ] **CAL-044** · Testes automatizados do motor · P0 · 1,5d — Serviço que não cabe antes de fechar, almoço, bloqueio, conflito, sem preferência, antecedência, dia fechado, fuso.

### Sprint 4 — Página pública e agendamento
- [ ] **CAL-045** · Landing pública do negócio · P0 · 3d — Seções da seção 6 do CLAUDE.md, CTA único e barra fixa, cor de destaque do negócio.
- [ ] **CAL-046** · Agendamento: escolher serviço · P0 · 1d — Lista com duração e preço, progresso de 4 passos, resumo fixo no rodapé.
- [ ] **CAL-047** · Agendamento: escolher profissional · P0 · 0,5d — "Sem preferência" como padrão + profissionais aptos.
- [ ] **CAL-048** · Agendamento: data e horário · P0 · 2d — Faixa de dias, grade Manhã/Tarde/Noite, dias fechados desabilitados, atalho para o próximo dia livre.
- [ ] **CAL-049** · Agendamento: dados do cliente · P0 · 1d — Nome e WhatsApp com máscara `(00) 0 0000-0000` e validação. Lembra os dados no navegador.
- [ ] **CAL-051** · Cadastro automático do cliente · P0 · 0,5d — Busca por negócio + WhatsApp normalizado. Cria ou atualiza o nome.
- [ ] **CAL-050** · Tela de confirmação · P0 · 1d — Resumo, prévia da mensagem do WhatsApp, botão "Adicionar ao calendário" (.ics).
- [ ] **CAL-072** · Plano B pelo link wa.me · P0 · 0,5d — No Básico ou sem cota: botão com a mensagem pronta para o dono enviar.

### Sprint 5 — Painel do dono
- [ ] **CAL-055** · Agenda do dia · P0 · 3d — Linha do tempo com agendamentos, horários livres (clicáveis para criar), bloqueios e status.
- [ ] **CAL-056** · Filtro por profissional e navegação de dias · P0 · 1d — Chips por profissional, setas, seletor de data e visão de semana.
- [ ] **CAL-057** · Detalhe do agendamento · P0 · 2d — Concluído, faltou, remarcar, cancelar (com confirmação) e "Chamar no WhatsApp".
- [ ] **CAL-058** · Novo agendamento manual · P0 · 1,5d — Só horários livres, busca de cliente existente, opção de enviar confirmação.
- [ ] **CAL-059** · Bloquear horário · P0 · 1d — Profissional ou todos, início, fim e motivo.

---

## M2 · Beta — WhatsApp, cobrança e pilotos

### Sprint 6 — WhatsApp
- [ ] **CAL-066** · Conta Meta Business e número da Calenvia · P0 · 2d **(fora do código)** — Verificação na Meta pode levar dias. O Claude Code pode guiar e usar o MCP da Meta para configurar.
- [ ] **CAL-067** · Templates de mensagem · P0 · 1d — Confirmação, lembrete e cancelamento (categoria utilidade). Textos versionados no código.
- [ ] **CAL-068** · Envio da confirmação ao agendar · P0 · 2d — `sendWhatsApp()` com modo `mock` e `live`, gravação em `messages`.
- [ ] **CAL-071** · Contador de mensagens e limites por plano · P0 · 1,5d — `message_usage` por mês, 300 no Pro, uso justo no Pro+, aviso ao dono perto do limite.
- [ ] **CAL-069** · Lembrete automático · P0 · 2d — Vercel Cron a cada 10 min, sem duplicar, ignora cancelados.
- [ ] **CAL-070** · Webhook de status das mensagens · P1 · 1,5d — Entregue, lida, falhou. Verificação do token da Meta.
- [ ] **CAL-073** · Opt-out do cliente · P1 · 0,5d — Respeitar quem pede para não receber mensagens.

### Sprint 7 — Assinatura e cobrança
- [ ] **CAL-075** · Escolher o gateway de pagamento · P0 · 0,5d **(fora do código — decisão)** — Asaas, Mercado Pago ou Stripe.
- [ ] **CAL-076** · Checkout dos planos · P0 · 3d — Pix e cartão, cobrança recorrente mensal, a partir de `/cadastro?plano=...`.
- [ ] **CAL-077** · Webhooks de pagamento · P0 · 2d — Ativar, renovar, atraso, cancelamento. Suspender recursos após X dias de atraso.
- [ ] **CAL-078** · Recursos liberados por plano · P0 · 1,5d — `src/lib/plans.ts`, upgrade e downgrade.
- [ ] **CAL-080** · Tela de assinatura no painel · P1 · 1,5d — Plano atual, faturas, uso de mensagens no mês, trocar e cancelar.
- [ ] **CAL-079** · Teste grátis · P1 · 0,5d **(decisão)** — Definir se terá (ex.: 14 dias sem cartão) e implementar se sim.

### Sprint 8 — Pronto para o beta
- [ ] **CAL-083** · Site calenvia.com.br · P0 · 0,5d — Converter `docs/referencias/landing-calenvia.html` para a rota `(site)`.
- [ ] **CAL-084** · Botões dos planos → cadastro · P0 · 0,5d — `/cadastro?plano=basic|pro|pro_plus` → onboarding → checkout.
- [ ] **CAL-012** · Páginas de Termos e Privacidade · P1 · 2d — Rotas `/termos` e `/privacidade`. *(Texto jurídico: fora do código.)*
- [ ] **CAL-052** · Remarcar e cancelar pelo link · P1 · 2d — `/{slug}/gerenciar/{manage_code}`, respeitando o prazo mínimo do negócio.
- [ ] **CAL-040** · Política de remarcação e cancelamento · P1 · 0,5d — Prazo mínimo configurável.
- [ ] **CAL-036** · Horário próprio por profissional · P1 · 1d — Opcional, sobrescreve o do negócio.
- [ ] **CAL-060** · Atualização em tempo real · P1 · 1d — Supabase Realtime na agenda.
- [ ] **CAL-061** · Resumo do dia · P1 · 0,5d — Agendamentos, horários livres e faturamento previsto.
- [ ] **CAL-063** · Lista de clientes · P1 · 1,5d — Visitas, faltas, última visita, total gasto, busca.
- [ ] **CAL-053** · Acessibilidade e performance · P1 · 1d — Lighthouse ≥ 90 no celular.
- [ ] **CAL-029** · Monitoramento de erros · P1 · 0,5d — Sentry ou similar.
- [ ] **CAL-085** · Métricas de uso · P1 · 1d — Visita, cadastro, primeiro serviço, primeiro agendamento, assinatura.
- [ ] **CAL-088** · Testes ponta a ponta · P1 · 2d — Playwright: agendar, cancelar, agendamento manual, assinatura.
- [ ] **CAL-089** · Proteção contra spam · P1 · 1d — Rate limit por IP e captcha invisível no agendamento público.
- [ ] **CAL-090** · Revisão de segurança das regras de acesso · P0 · 1d — Testes provando que um negócio nunca vê dados de outro.
- [ ] **CAL-091** · LGPD dos clientes finais · P1 · 1,5d — Consentimento no agendamento, exportar e apagar dados de um cliente.
- [ ] **CAL-092** · Backups e recuperação · P1 · 0,5d — Backup diário e teste de restauração.

---

## M3 · Lançamento
- [ ] **CAL-054** · SEO e prévia de link por negócio · P2 · 1d — Meta tags e imagem Open Graph com nome e logo.
- [ ] **CAL-064** · Aviso ao dono de novo agendamento · P2 · 1,5d — Notificação no navegador ou e-mail.
- [ ] **CAL-065** · Painel instalável (PWA) · P2 · 1d
- [ ] **CAL-086** · Demonstração pública · P1 · 1d — Negócio de exemplo para o visitante testar.
- [ ] **CAL-081** · Emissão de nota fiscal · P1 · 1d — Pelo gateway ou emissor da prefeitura.
- [ ] **CAL-082** · Régua de cobrança · P2 · 1d — Avisos de vencimento e atraso.

## M4 · Evolução
- [ ] **CAL-099** · Domínio próprio (Pro+) · P2 · 3d — Tabela `custom_domains`, API da Vercel, SSL, middleware.
- [ ] **CAL-100** · Relatórios de faturamento e faltas (Pro+) · P2 · 3d
- [ ] **CAL-074** · Editor de mensagens por negócio · P2 · 2d
- [ ] **CAL-101** · Suporte prioritário (Pro+) · P2 · 0,5d
- [ ] **CAL-102** · Controle financeiro simples · P3 · 4d
- [ ] **CAL-103** · Sinal ou pagamento antecipado via Pix · P3 · 4d
- [ ] **CAL-104** · Lista de espera · P3 · 2d
- [ ] **CAL-105** · Pacotes de serviços · P3 · 3d
- [ ] **CAL-106** · Avaliação após o atendimento · P3 · 2d
- [ ] **CAL-107** · Integração com Google Agenda · P3 · 3d
- [ ] **CAL-108** · Número próprio do negócio no WhatsApp (Embedded Signup) · P3 · 5d
- [ ] **CAL-109** · Programa de indicação · P3 · 2d
- [ ] **CAL-110** · Avaliar app nativo · P3 · 1d

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
