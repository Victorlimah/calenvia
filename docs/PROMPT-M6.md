Execute de forma autônoma TODO o marco **M6 · Acesso por convite e biblioteca de temas** (CAL-135 a CAL-152), do começo ao fim, sem parar para perguntar.

## Leitura inicial (só isto)
1. `CLAUDE.md` inteiro.
2. Bloco Status e Próxima sessão no topo de `docs/PROGRESSO.md`.
3. A seção **M6** de `docs/BACKLOG.md` (regras do marco + os 18 cards). Leia cada card de novo ao começar a trabalhar nele.

## Ordem
Sprint 14 → 15 → 16 → 17, na ordem dos cards. A Sprint 14 (CAL-135 a 139) vem primeiro e inteira, porque é urgente. WhatsApp do CAL-138: **5583986479932**, em `NEXT_PUBLIC_SUPPORT_WHATSAPP` (documente no `.env.example`).

## Como trabalhar (valem as regras do CLAUDE.md)
- **Um card por vez, um commit por card** (ou por fase), com o ID no início: `CAL-135: chaves de modo ...`. Commit só do que passou em `lint`, `typecheck` e nos testes do que você mexeu. Inclua a linha de coautoria padrão.
- Cards marcados "plano antes de codar" (CAL-140, CAL-148): escreva `docs/planos/CAL-xxx.md` primeiro (fases curtas) e commite o plano. Cards grandes (CAL-145, CAL-146): um commit por template.
- Lógica pura (contraste, derivação de cores, ordenação por segmento, token de convite, modos de acesso) **sempre com Vitest**. Migration nova: RLS e policies na mesma migration, testes em `tests/db`. Nunca `service_role` no navegador, nunca segredo commitado, variáveis novas no `.env.example`.
- **Não apague** o código de cobrança/Stripe: só desligue por chave. Não adicione dependência paga ou pesada; fontes só via `next/font`. Sem subagentes.
- Rode só os testes do que mudou durante o card. A suíte E2E completa roda **no fechamento de cada sprint** (contra o build de produção; se a 3000 estiver ocupada, `E2E_PORT=3001`). E2E instável: no máximo 2 tentativas, depois registre em Próxima sessão e siga em frente.
- Ao concluir cada card: marque `[x]` no `docs/BACKLOG.md` e adicione uma linha na tabela de Histórico do `docs/PROGRESSO.md` (card, commit, resumo, como testar).

## Decisões
Use os padrões listados em "Decisões em aberto" do M6. Se algo conflitar com o CLAUDE.md ou for ambíguo de verdade, escolha a opção mais segura e reversível, registre a decisão no `docs/PROGRESSO.md` e continue. Não pare para perguntar.
Se um card ficar travado por algo fora do código (conta, chave, serviço externo), pule, anote o motivo em Próxima sessão e siga para o próximo.

## Qualidade visual (importante)
O pedido do Victor é que o site e os temas deixem de parecer masculinos: templates variados (delicado, clínico, natureza, alegre etc.), paletas claras e coloridas, nada de só preto e dourado. Confira cada template em 390 px e 1280 px (Playwright com screenshot) antes de commitar, e garanta contraste AA.

## Ao terminar (ou se o contexto estiver acabando)
Faça commit do que está verificado e atualize **Status** e **Próxima sessão** em `docs/PROGRESSO.md`: o que foi feito, o que falta, decisões tomadas, comandos para retomar. Se o contexto encher no meio, termine o card em andamento, faça o commit e deixe o próximo card indicado, para eu continuar numa sessão nova.

No fim, responda com: cards concluídos, pendentes, decisões que tomei sozinho e como testar (convite → senha → onboarding → escolher tema com preview).
