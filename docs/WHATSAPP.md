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

## Webhook de status
- URL: `https://calenvia.com.br/api/webhooks/whatsapp`
- Verify token: o valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- Assinar o campo `messages` do app na Meta.
- Assinatura: definir `WHATSAPP_APP_SECRET` para validar o cabeçalho `X-Hub-Signature-256`.
