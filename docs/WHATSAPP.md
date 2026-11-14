# WhatsApp (Cloud API da Meta)

A Calenvia usa **somente a API oficial** (WhatsApp Cloud API). Nada de bibliotecas não oficiais.

## Modos
- `WHATSAPP_MODE=mock` (padrão em dev): a mensagem é gravada em `messages` com status `sent` e aparece no log. Nada sai para a Meta.
- `WHATSAPP_MODE=live`: envia de verdade pela Cloud API. Precisa de `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN`.

## Templates (categoria Utilidade, pt_BR)
Definidos em `src/lib/whatsapp/templates.ts` (fonte única dos textos):

| Nome | Uso | Variáveis |
|---|---|---|
| `calenvia_confirmacao_v1` | Ao agendar | nome, negócio, serviço, profissional, dia da semana, data, hora, link |
| `calenvia_lembrete_v1` | Lembrete (cron a cada 10 min) | idem |
| `calenvia_cancelamento_v1` | Ao cancelar | nome, serviço, negócio, dia da semana, data, hora, link |

### Como cadastrar (dono do projeto)
1. No **Gerenciador do WhatsApp** (business.facebook.com) → Modelos de mensagem → Criar modelo.
2. Categoria **Utilidade**, idioma **Português (BR)**, nome exatamente como na tabela.
3. Cole o corpo do arquivo `templates.ts` e preencha os exemplos (também estão no arquivo).
4. Ou pela API: `POST https://graph.facebook.com/v21.0/{WABA_ID}/message_templates` com o JSON gerado por `toMetaCreatePayload()`.
5. Quando mudar um texto, crie uma **nova versão** (`_v2`) — templates aprovados não devem ser editados.

## Envio (CAL-068)

Toda mensagem automática passa por `sendWhatsApp()` (`src/lib/whatsapp/send.ts`), chamada pelos
ganchos de `src/lib/booking/after-booking.ts`:

| Quando | Mensagem |
|---|---|
| Cliente agenda pela página / dono cria com "Enviar confirmação" | confirmação |
| Dono remarca | confirmação (com o novo horário) |
| Dono cancela | cancelamento |

A ordem das verificações é: agendamento cancelado → plano (`canSendAutomaticMessages`) → opt-out do
cliente → cota do mês (`quotaState`). Se não puder enviar, ou se a Meta devolver erro, a mensagem
**não** sai e o resultado traz o link `wa.me` com o texto pronto (plano B). Cada envio grava uma linha
em `messages` (`queued` → `sent`/`failed`) e só os enviados contam em `message_usage`.
Erros de envio nunca desfazem o agendamento.

## Cota mensal (CAL-071)

- Limites em `src/lib/plans.ts`: Pro 300/mês, Pro+ uso justo (padrão 800, ou `businesses.message_limit_override`).
- O mês é contado no fuso do negócio (`message_usage.period` = `YYYY-MM`).
- `consume_message_quota()` reserva 1 mensagem de forma atômica antes do envio (dois envios
  simultâneos nunca passam do limite); `release_message_quota()` devolve se o envio falhar.
- A partir de 80% da cota, a agenda mostra um aviso; ao esgotar, o aviso muda e a confirmação volta
  a ser pelo `wa.me` até o 1º dia do mês seguinte. `/assinatura` mostra o uso do mês.

## Webhook de status
- URL: `https://calenvia.com.br/api/webhooks/whatsapp`
- Verify token: o valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- Assinar o campo `messages` do app na Meta.
- Assinatura: definir `WHATSAPP_APP_SECRET` para validar o cabeçalho `X-Hub-Signature-256`.
