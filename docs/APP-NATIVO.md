# Avaliação: app nativo (CAL-110)

## Recomendação
**Não fazer app nativo agora.** Manter o painel como PWA (CAL-065) e reavaliar quando algum dos
gatilhos abaixo acontecer.

## Por quê
| Necessidade do dono | Como já é atendida hoje |
|---|---|
| Abrir rápido pelo celular, ícone na tela | PWA instalável (manifest, ícones, atalhos Novo/Bloquear/Clientes) |
| Saber de agendamento novo | Aviso na tela + notificação do sistema com o painel aberto (CAL-064) |
| Ver a agenda no calendário do celular | Link privado ICS no Google Agenda/iPhone (CAL-107) |
| Funcionar com internet ruim | Página “sem conexão” do service worker |

O cliente final **nunca** vai baixar app (é a proposta da Calenvia: agendar pelo link), então um
app só serviria ao dono, que já tem tudo isso pelo navegador.

Custos de um app nativo hoje: conta Apple (US$ 99/ano) e Google (US$ 25), revisão das lojas a cada
versão, segunda base de código (ou camada Capacitor), e o uso real ainda não justifica.

## O que o PWA não faz (e quando isso pesa)
1. **Notificação com o app fechado.** No Android e no iPhone (iOS 16.4+, com o app instalado) o
   PWA pode receber Web Push, mas precisa da dependência `web-push` e chaves VAPID (pendente de
   aprovação, ver CAL-064). Resolve 90% do motivo para ter app.
2. **Presença na App Store / Play Store** como canal de aquisição.
3. **Widgets** (agenda do dia na tela inicial).

## Gatilhos para reavaliar
- Mais de 30% dos donos ativos pedirem “app na loja” no suporte (CAL-101) ou nas entrevistas.
- Web Push implementado e, mesmo assim, taxa de abertura do painel no celular abaixo de 50%.
- Concorrente relevante ganhando clientes por estar na loja.

## Se for fazer
1º passo: **Capacitor** empacotando o próprio painel (mesmo código Next.js), com push nativo
(Firebase/APNs). Estimativa: 1 a 2 semanas + publicação. React Native/Expo só se surgir uma
experiência que o web não entregue (ex.: widgets).
