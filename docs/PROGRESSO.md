# Progresso da Calenvia
## Status
- Último card concluído: CAL-028
- Card em andamento: CAL-021
- Próximo card: CAL-023
- Atualizado em: 2026-11-14 01:01
## Histórico
| Card | Status | Commit | Resumo | Como testar |
|---|---|---|---|---|
| CAL-020 | Concluído | 65f4c54 | Next.js 15 (App Router) + TS strict + Tailwind 4, fontes Bricolage/Inter, grupos (site)/(painel)/(negocio), .env.example, scripts | npm run dev / lint / typecheck / test / build |
| CAL-028 | Concluído | dbb7a54 | Prettier (+plugin Tailwind), eslint-config-prettier, workflow .github/workflows/ci.yml (format:check, lint, typecheck, test) | npm run format:check && npm run lint |

## Decisões tomadas
- Repositório git iniciado localmente (`git init`, branch `main`). Commits usam o `user.name`/`user.email` já configurados no git global da máquina.
- Docker Desktop foi iniciado (`systemctl --user start docker-desktop`) para rodar o Supabase local.
- Next.js 15 (não 16) porque o CLAUDE.md fala em `middleware.ts` (no 16 virou `proxy.ts`).
- Supabase CLI instalado como devDependency (`npx supabase`), sem instalação global.
- Dev usa Supabase local (`npx supabase start`). O arquivo `.env.local` (ignorado pelo git) tem as chaves públicas de demonstração do Supabase local.

## Bloqueios (precisam do Victor)
- CAL-021: projeto Supabase de PRODUÇÃO na nuvem não foi criado (precisa da sua conta). Crie o projeto em supabase.com, rode `npx supabase link --project-ref <ref>` e `npx supabase db push`, e preencha NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY na Vercel.

## Plano do card atual
1) supabase init (config.toml); 2) clients em src/lib/supabase: server (cookies, @supabase/ssr), browser, service role (server-only); 3) tipos do banco em src/lib/supabase/types.ts; 4) npx supabase start para validar; 5) script db:types.
