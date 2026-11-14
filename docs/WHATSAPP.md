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

## Lembretes (CAL-069)

O Vercel Cron chama `GET /api/cron/reminders` a cada 10 minutos (`vercel.json`), com
`Authorization: Bearer $CRON_SECRET`. A regra fica em `src/lib/whatsapp/reminders.ts`:

- agendado com 24 h ou mais de antecedência → lembrete **24 h antes**;
- agendado com menos de 24 h → lembrete **2 h antes** (se houver pelo menos 2 h entre a confirmação e o lembrete);
- agendado com menos de 4 h → sem lembrete;
- nunca a menos de 30 min do horário, nunca para cancelados, clientes com opt-out ou planos sem envio automático;
- um lembrete por agendamento **e horário** (índice único em `messages`): remarcar gera um novo; erro da Meta tenta de novo até 3 vezes.

Testar localmente: `curl -H "Authorization: Bearer dev-cron-secret" http://localhost:3000/api/cron/reminders`.

## Webhook de status (CAL-070)
- URL: `https://calenvia.com.br/api/webhooks/whatsapp` (`src/app/api/webhooks/whatsapp/route.ts`).
- Verify token: o valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (GET com `hub.challenge`).
- Assinar o campo `messages` do app na Meta.
- Assinatura: `WHATSAPP_APP_SECRET` (App secret do app na Meta) valida o cabeçalho `X-Hub-Signature-256`.
  No modo `live` ele é obrigatório: sem ele o webhook responde 503 e não altera nada.
- Status: `sent → delivered → read` nunca volta (eventos podem chegar fora de ordem); `failed` só vale
  antes de entregue, grava o erro da Meta e devolve a mensagem à cota do mês.
- IDs desconhecidos respondem 200 (a Meta não reenvia); erro no banco responde 500 (a Meta reenvia).

## Opt-out (CAL-073)
- Todo template tem o rodapé fixo "Para não receber mais mensagens, responda SAIR."
- O webhook lê as respostas (`value.messages`): SAIR, PARAR, PARE, STOP, "não quero receber"… marcam
  `customers.opted_out_at`; VOLTAR / ATIVAR / "quero receber" desmarcam. Só a mensagem inteira conta
  ("cancelar" sozinho não é opt-out, pode ser sobre o horário).
- Resposta a uma mensagem nossa (com `context.id`) vale só para o negócio que enviou; sem contexto,
  para todos os negócios em que o número é cliente.
- O dono também pode pausar/religar no detalhe do agendamento ("Mensagens automáticas").
- `sendWhatsApp()` e o cron de lembretes não enviam para quem tem opt-out.

