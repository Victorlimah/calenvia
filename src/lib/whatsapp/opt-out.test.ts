import { describe, expect, it } from "vitest";
import { parseIncomingMessages, parseOptKeyword } from "./opt-out";

describe("parseOptKeyword", () => {
  it.each(["SAIR", "sair", "Sair.", " PARAR ", "Pare", "stop", "Não quero receber", "nao enviar"])(
    "%s → opt-out",
    (t) => expect(parseOptKeyword(t)).toBe("out"),
  );
  it.each(["VOLTAR", "ativar", "Quero receber!"])("%s → volta a receber", (t) =>
    expect(parseOptKeyword(t)).toBe("in"),
  );
  it.each(["cancelar", "posso sair mais cedo?", "obrigado", "ok", "", "sair sair"])(
    "%s → nada (só a mensagem inteira conta)",
    (t) => expect(parseOptKeyword(t)).toBeNull(),
  );
});

describe("parseIncomingMessages", () => {
  it("lê texto, botão e contexto; corrige wa_id sem o 9", () => {
    const msgs = parseIncomingMessages({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "558599990000",
                    type: "text",
                    timestamp: "2000000000",
                    text: { body: "SAIR" },
                    context: { id: "wamid.abc" },
                  },
                  { from: "5585999990001", type: "button", button: { text: "Parar" } },
                  { from: "5585999990002", type: "image", image: { id: "x" } },
                  { from: "lixo", text: { body: "SAIR" } },
                ],
                statuses: [{ id: "wamid.1", status: "read" }],
              },
            },
          ],
        },
      ],
    });
    expect(msgs).toEqual([
      {
        from: "5585999990000",
        text: "SAIR",
        contextId: "wamid.abc",
        at: new Date(2000000000 * 1000),
      },
      { from: "5585999990001", text: "Parar", contextId: null, at: expect.any(Date) },
    ]);
  });

  it("payload sem mensagens não quebra", () => {
    expect(parseIncomingMessages({})).toEqual([]);
    expect(parseIncomingMessages({ entry: [{ changes: [{ value: {} }] }] })).toEqual([]);
  });
});
