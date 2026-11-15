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

## O que já tem (fase 1)

- **Negócios** (`/admin`): busca por nome, link ou e-mail do dono; filtro por plano e status;
  equipe e mensagens do mês de cada um.
- **Detalhe do negócio** (`/admin/negocios/{id}`): dados, uso, equipe; mudar plano, status da
  assinatura, limite de pessoas, cota de mensagens (ver `docs/LIMITES.md`) e observação interna.
- **Histórico**: toda alteração grava em `admin_audit_log` (quem, o quê, de → para, quando) e
  aparece no detalhe do negócio.

## Segurança

- `platform_admins`, `admin_audit_log` e `admin_business_notes` têm RLS ligado e nenhum acesso
  para `anon`/`authenticated`; só o servidor (service role) lê e grava, depois de conferir
  `platform_admins`. A função `admin_business_list()` só pode ser chamada pela service role.
- Testes: `tests/db/admin.test.ts` e `tests/e2e/admin.spec.ts`.
