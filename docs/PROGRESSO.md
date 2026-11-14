# Progresso da Calenvia
## Status
- Último card concluído: CAL-017
- Card em andamento: —
- Próximo card: CAL-026
- Atualizado em: 2026-11-14 01:17
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

## Bloqueios (precisam do Victor)
- CAL-021: projeto Supabase de PRODUÇÃO na nuvem não foi criado (precisa da sua conta). Crie o projeto em supabase.com, rode `npx supabase link --project-ref <ref>` e `npx supabase db push`, e preencha NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY na Vercel.

## Plano do card atual
—
