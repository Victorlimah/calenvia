# Progresso da Calenvia
## Status
- Último card concluído: CAL-041
- Card em andamento: —
- Próximo card: CAL-042
- Atualizado em: 2026-11-14 01:44
## Histórico
| Card | Status | Commit | Resumo | Como testar |
|---|---|---|---|---|
| CAL-020 | Concluído | 65f4c54 | Next.js 15 (App Router) + TS strict + Tailwind 4, fontes Bricolage/Inter, grupos (site)/(painel)/(negocio), .env.example, scripts | npm run dev / lint / typecheck / test / build |
| CAL-028 | Concluído | dbb7a54 | Prettier (+plugin Tailwind), eslint-config-prettier, workflow .github/workflows/ci.yml (format:check, lint, typecheck, test) | npm run format:check && npm run lint |
| CAL-021 | Concluído | e27d8d9 | supabase/config.toml, clients em src/lib/supabase (server com cookies, browser, admin service_role com server-only), tipos gerados (npm run db:types) | npx supabase start && npm run db:types |
| CAL-023 | Concluído | d161603 | Migration 20261114000100: 14 tabelas, índices, FKs compostas, EXCLUDE gist anti-conflito, gen_manage_code(), increment_message_usage(), RLS + policies do dono | npx supabase db reset && npm run db:types |
| CAL-024 | Concluído | fd8ebc0 | 23 testes de RLS (tests/db/rls.test.ts): dono só lê/escreve o próprio negócio, não muda plano, não escreve em messages/usage, anon sem acesso | npx supabase start && npm run test:db |
| CAL-027 | Concluído | 007473f | src/lib/dates.ts: conversão data/hora local ↔ UTC, intervalo do dia, dia da semana, período YYYY-MM, formatação pt-BR, duração; 15 testes | npm test |
| CAL-030 | Concluído | 3990308 | supabase/seed.sql: 2 donos com login (ze@calenvia.dev / ana@calenvia.dev, senha calenvia123), Barbearia do Zé (Pro, Fortaleza) e Ana Nails (Básico, SP) com serviços, profissionais, horários, almoço, clientes, agendamentos no próximo dia útil e bloqueio | npx supabase db reset; entrar no painel com ze@calenvia.dev / calenvia123 |
| CAL-025 | Concluído | c68cb49 | src/lib/hosts.ts (resolveHost, slugs reservados, URLs) + 13 testes; src/middleware.ts com rewrite por host; guardas de host nos layouts | npm run dev e abrir localhost:3000, app.localhost:3000, barbearia-do-ze.localhost:3000 |
| CAL-017 | Concluído | 5ef4b79 | Tokens da marca no globals.css (Tailwind 4 @theme), componentes em src/components/ui (Button/ButtonLink, Input, Textarea, Select, Field acessível, Card, Alert, Badge, EmptyState/ErrorState, Spinner), Logo, cn(), formatPrice/parsePriceToCents com testes | npm test; ver componentes nas telas do painel |
| CAL-026 | Concluído | b225ea0 | Telas /entrar, /cadastro (?plano=), /recuperar-senha, /nova-senha, /auth/callback; server actions com Zod e erros em pt-BR; middleware renova a sessão e protege o painel (redireciona com ?next= seguro); Google pronto mas desligado; 3 testes E2E | npm run test:e2e (Supabase local + seed); ou abrir app.localhost:3000 e entrar com ze@calenvia.dev / calenvia123 |
| CAL-022 | Bloqueado/parcial | — | Preparado (vercel.json, docs/DEPLOY.md); deploy depende do Victor | — |
| CAL-032 | Concluído | c34f4af | src/lib/slug.ts (slugify, validateSlug com mensagens, sugestões) + checkSlugAvailability (service role, só sim/não); src/lib/phone.ts (normalização 55+DDD, celular, máscara, wa.me) — testes | npm test |
| CAL-031 | Concluído | 5a81d0f | Onboarding /onboarding → servicos → profissionais (atalho 'Eu mesmo atendo') → horarios (padrão preenchido) → pronto (link para copiar). Editores reutilizáveis de negócio, serviços, profissionais e horários; slug com verificação ao vivo e sugestões; painel exige onboarding concluído. 2 testes E2E | npm run test:e2e; ou criar conta em app.localhost:3000/cadastro |
| CAL-034 | Concluído | 465c759 | /ajustes/profissionais com StaffEditor (nome, cargo, serviços que faz, ativo; excluir vira desativar se tiver agendamentos) | npm run test:e2e (ajustes.spec.ts) |
| CAL-035 | Concluído | 465c759 | /ajustes/horarios com HoursEditor: aberto/fechado por dia, abertura, fechamento, vários intervalos, copiar para todos; validação (fecha depois de abrir, intervalo dentro do horário, sem sobreposição); salvamento atômico | npm run test:e2e (ajustes.spec.ts) |
| CAL-033 | Concluído | 465c759 | Shell do painel (nav inferior no celular, lateral no desktop, sair), /ajustes (menu), /ajustes/servicos (nome, descrição, duração, preço, ativo, mais pedido, ordenar ↑↓, quem faz), /ajustes/negocio | npm run test:e2e (ajustes.spec.ts); entrar como ze@calenvia.dev |
| CAL-039 | Concluído | e0f60a2 | /ajustes/regras: intervalo entre horários (15/30/60), antecedência mínima, dias à frente, prazo para remarcar/cancelar | npm run test:e2e (ajustes.spec.ts › regras) |
| CAL-038 | Concluído | 8f59708 | Bucket business-media (5 MB, JPG/PNG/WebP) com policies por pasta do negócio; tabela business_photos; ImageUpload (compressão WebP no navegador, máx. 1600px, limite 10 MB); foto do profissional nos ajustes; actions de logo/capa/galeria; testes de policy do Storage | npm run test:db; npm run test:e2e (foto do profissional) |
| CAL-037 | Concluído | 64a3326 | /ajustes/aparencia: logo, capa, cor de destaque (10 cores + seletor livre, texto do botão com contraste automático), título e subtítulo, galeria de fotos, depoimentos; prévia ao vivo usando o mesmo componente Hero da página pública | npm run test:e2e (ajustes.spec.ts › aparência) |
| CAL-062 | Concluído | 819c1f5 | /ajustes/link: copiar link, ver página, dica para a bio do Instagram, enviar link pelo WhatsApp | npm run test:e2e (ajustes.spec.ts › link) |
| CAL-041 | Concluído | beecc18 | src/lib/availability: getDaySlots (candidatos a cada intervalo, serviço inteiro antes de fechar, sem atravessar almoço, conflitos com agendamentos não cancelados e bloqueios, antecedência, max_days_ahead, profissional apto, grupos Manhã/Tarde/Noite), getDaysSummary, findNextAvailableDay, isSlotAvailable; 15 testes | npm test |

## Decisões tomadas
- Repositório git iniciado localmente (`git init`, branch `main`). Commits usam o `user.name`/`user.email` já configurados no git global da máquina.
- Docker Desktop foi iniciado (`systemctl --user start docker-desktop`) para rodar o Supabase local.
- Next.js 15 (não 16) porque o CLAUDE.md fala em `middleware.ts` (no 16 virou `proxy.ts`).
- Supabase CLI instalado como devDependency (`npx supabase`), sem instalação global.
- Dev usa Supabase local (`npx supabase start`). O arquivo `.env.local` (ignorado pelo git) tem as chaves públicas de demonstração do Supabase local.
- Status/plano/tipo em colunas text com CHECK (não enums), mais fácil de evoluir. FKs compostas (id, business_id) garantem que serviço/profissional/cliente de um agendamento são do mesmo negócio.
- Colunas extras: businesses.message_limit_override (uso justo do Pro+ por negócio), businesses.onboarding_completed_at, plan_status com 'pending' (padrão até o pagamento). Índice único impede dois lembretes por agendamento. Slug com 3 a 40 caracteres.
- Dono não pode alterar plan/plan_status (privilégio por coluna); só o servidor (service_role) muda isso.
- Testes de banco (RLS etc.) ficam em tests/db e rodam com `npm run test:db` contra o Supabase local; no CI há um job `db` que sobe o Supabase. `npm test` continua só com testes unitários (rápido, sem Docker).
- Roteamento por host: app.* é reescrito para /painel/*, {slug}.* para /{slug}/*. O middleware injeta x-calenvia-host/x-calenvia-slug e os layouts dão 404 se a rota for aberta pelo host errado (ex.: calenvia.com.br/barbearia-do-ze). Todo login/cadastro fica no host do painel (app.*), para não depender de cookie entre subdomínios.
- Ordem: CAL-017 (design system) foi feito antes do CAL-026 (autenticação), porque as telas de login já precisam dos componentes. CAL-022 (deploy) é preparado sem deploy (proibido no modo autônomo).
- Playwright usa o Google Chrome já instalado (`channel: chrome`), sem baixar navegadores. Testes E2E em tests/e2e (`npm run test:e2e`), precisam do Supabase local com seed.
- Server actions NÃO usam redirect() para caminhos internos: o redirect da action é resolvido sem passar pelo middleware (rewrite por host) e cai na rota errada (/[slug]). As actions devolvem { redirectTo } e o cliente faz router.push.
- Um negócio por conta no MVP (getCurrentBusiness pega o primeiro do dono). Salvar horários e serviços do profissional usa funções SQL atômicas (save_business_hours, set_staff_services) com RLS (security invoker).
- Tabela extra business_photos (galeria 'fotos do trabalho', até 12 fotos) — não estava na seção 4 do CLAUDE.md, mas a página pública precisa. Imagens no bucket público business-media/{business_id}/{tipo}/; compressão no navegador para WebP.
- Tabela extra business_testimonials (depoimentos cadastrados pelo dono, até 10) para a seção de depoimentos da página pública.
- Motor de horários: os intervalos do negócio (almoço) valem para todos os profissionais, mesmo os com horário próprio. Dia com horário mas sem nenhum livre = status 'full' (além de closed/past/too_far/no_staff).

## Bloqueios (precisam do Victor)
- CAL-021: projeto Supabase de PRODUÇÃO na nuvem não foi criado (precisa da sua conta). Crie o projeto em supabase.com, rode `npx supabase link --project-ref <ref>` e `npx supabase db push`, e preencha NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY na Vercel.
- CAL-026: login com Google está pronto no código, mas desligado. Para ligar: criar OAuth Client no Google Cloud (redirect: https://<projeto>.supabase.co/auth/v1/callback) e ativar o provedor Google no painel do Supabase (local: `[auth.external.google] enabled = true` + variáveis SUPABASE_AUTH_EXTERNAL_GOOGLE_*). Em produção, ligar também a confirmação de e-mail e o SMTP no Supabase.
- CAL-022: deploy na Vercel NÃO foi feito (proibido no modo autônomo e precisa da sua conta). Está tudo preparado: `vercel.json` (região gru1 + cron dos lembretes a cada 10 min) e o passo a passo em `docs/DEPLOY.md` (domínio curinga, variáveis, Supabase de produção). O cron a cada 10 min exige o plano Pro da Vercel.

## Plano do card atual
—
