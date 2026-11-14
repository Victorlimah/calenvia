# Deploy da Calenvia (Vercel + Supabase)

Passo a passo para o dono do projeto. Nada disso foi executado automaticamente.

## 1. Supabase de produção
1. Crie o projeto em https://supabase.com (região São Paulo).
2. Na sua máquina: `npx supabase login` e `npx supabase link --project-ref <ref>`.
3. Aplique as migrations: `npx supabase db push`. (O `seed.sql` é só para desenvolvimento: não rode em produção.)
4. Em **Authentication → URL Configuration**:
   - Site URL: `https://app.calenvia.com.br`
   - Redirect URLs: `https://app.calenvia.com.br/**`
5. Em **Authentication → Providers**: ligue a confirmação de e-mail, configure o SMTP e (opcional) o Google.

## 2. Vercel
1. Importe o repositório na Vercel (framework: Next.js). A região `gru1` (São Paulo) já está em `vercel.json`.
2. **Domínios** do projeto:
   - `calenvia.com.br` e `www.calenvia.com.br` (site)
   - `app.calenvia.com.br` (painel)
   - `*.calenvia.com.br` (páginas dos negócios) — domínio curinga exige que o DNS do domínio aponte para os nameservers da Vercel.
3. **Variáveis de ambiente** (Production e Preview), conforme `.env.example`:
   - `NEXT_PUBLIC_ROOT_DOMAIN=calenvia.com.br`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `WHATSAPP_MODE=live` (só depois da Meta aprovada) e as chaves do WhatsApp
   - `CRON_SECRET` (um texto aleatório longo; a Vercel envia como `Authorization: Bearer ...` no cron)
   - Chaves do gateway de pagamento (CAL-075)
4. **Cron**: `vercel.json` agenda `/api/cron/reminders` a cada 10 minutos. No plano Hobby a Vercel só permite cron diário: o plano Pro da Vercel é necessário antes de cobrar clientes.

## 3. Previews
Em previews (`*.vercel.app`) os subdomínios não existem. Para testar um preview completo, use um domínio
de staging com curinga (ex.: `*.staging.calenvia.com.br`) e defina `NEXT_PUBLIC_ROOT_DOMAIN` para ele no ambiente Preview.
