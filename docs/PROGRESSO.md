# Progresso da Calenvia
## Status
- Último card concluído: CAL-023
- Card em andamento: —
- Próximo card: CAL-024
- Atualizado em: 2026-11-14 01:09
## Histórico
| Card | Status | Commit | Resumo | Como testar |
|---|---|---|---|---|
| CAL-020 | Concluído | 65f4c54 | Next.js 15 (App Router) + TS strict + Tailwind 4, fontes Bricolage/Inter, grupos (site)/(painel)/(negocio), .env.example, scripts | npm run dev / lint / typecheck / test / build |
| CAL-028 | Concluído | dbb7a54 | Prettier (+plugin Tailwind), eslint-config-prettier, workflow .github/workflows/ci.yml (format:check, lint, typecheck, test) | npm run format:check && npm run lint |
| CAL-021 | Concluído | e27d8d9 | supabase/config.toml, clients em src/lib/supabase (server com cookies, browser, admin service_role com server-only), tipos gerados (npm run db:types) | npx supabase start && npm run db:types |
| CAL-023 | Concluído | d161603 | Migration 20261114000100: 14 tabelas, índices, FKs compostas, EXCLUDE gist anti-conflito, gen_manage_code(), increment_message_usage(), RLS + policies do dono | npx supabase db reset && npm run db:types |

## Decisões tomadas
- Repositório git iniciado localmente (`git init`, branch `main`). Commits usam o `user.name`/`user.email` já configurados no git global da máquina.
- Docker Desktop foi iniciado (`systemctl --user start docker-desktop`) para rodar o Supabase local.
- Next.js 15 (não 16) porque o CLAUDE.md fala em `middleware.ts` (no 16 virou `proxy.ts`).
- Supabase CLI instalado como devDependency (`npx supabase`), sem instalação global.
- Dev usa Supabase local (`npx supabase start`). O arquivo `.env.local` (ignorado pelo git) tem as chaves públicas de demonstração do Supabase local.
- Status/plano/tipo em colunas text com CHECK (não enums), mais fácil de evoluir. FKs compostas (id, business_id) garantem que serviço/profissional/cliente de um agendamento são do mesmo negócio.
- Colunas extras: businesses.message_limit_override (uso justo do Pro+ por negócio), businesses.onboarding_completed_at, plan_status com 'pending' (padrão até o pagamento). Índice único impede dois lembretes por agendamento. Slug com 3 a 40 caracteres.
- Dono não pode alterar plan/plan_status (privilégio por coluna); só o servidor (service_role) muda isso.

## Bloqueios (precisam do Victor)
- CAL-021: projeto Supabase de PRODUÇÃO na nuvem não foi criado (precisa da sua conta). Crie o projeto em supabase.com, rode `npx supabase link --project-ref <ref>` e `npx supabase db push`, e preencha NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY na Vercel.

## Plano do card atual
—
