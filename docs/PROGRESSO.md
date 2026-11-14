# Progresso da Calenvia
## Status
- Último card concluído: CAL-020
- Card em andamento: CAL-028
- Próximo card: CAL-021
- Atualizado em: 2026-11-14 01:00
## Histórico
| Card | Status | Commit | Resumo | Como testar |
|---|---|---|---|---|
| CAL-020 | Concluído | 65f4c54 | Next.js 15 (App Router) + TS strict + Tailwind 4, fontes Bricolage/Inter, grupos (site)/(painel)/(negocio), .env.example, scripts | npm run dev / lint / typecheck / test / build |

## Decisões tomadas
- Repositório git iniciado localmente (`git init`, branch `main`). Commits usam o `user.name`/`user.email` já configurados no git global da máquina.
- Docker Desktop foi iniciado (`systemctl --user start docker-desktop`) para rodar o Supabase local.
- Next.js 15 (não 16) porque o CLAUDE.md fala em `middleware.ts` (no 16 virou `proxy.ts`).
- Supabase CLI instalado como devDependency (`npx supabase`), sem instalação global.

## Bloqueios (precisam do Victor)
## Plano do card atual
1) Prettier + plugin tailwind + eslint-config-prettier; 2) scripts format/format:check; 3) GitHub Actions (.github/workflows/ci.yml) com lint, typecheck, test, format:check; 4) teste de exemplo não necessário.
