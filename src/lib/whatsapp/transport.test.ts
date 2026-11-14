import { describe, expect, it, vi } from "vitest";
import {
  buildTemplatePayload,
  createLiveTransport,
  transportFromEnv,
  WhatsAppApiError,
} from "./transport";

describe("transporte do WhatsApp", () => {
  it("monta o payload de template da Cloud API", () => {
    const p = buildTemplatePayload({
      to: "5585999990000",
      kind: "confirmation",
      params: ["a", "b"],
    });
    expect(p).toMatchObject({
      messaging_product: "whatsapp",
      to: "5585999990000",
      type: "template",
      template: { name: "calenvia_confirmacao_v1", language: { code: "pt_BR" } },
    });
    expect(p.template.components[0].parameters).toEqual([
      { type: "text", text: "a" },
      { type: "text", text: "b" },
    ]);
  });

  it("live chama a Graph API com o token e devolve o id", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ messages: [{ id: "wamid.123" }] }), { status: 200 }),
    );
    const t = createLiveTransport({ phoneNumberId: "999", accessToken: "tok", fetchImpl });
    const r = await t.sendTemplate({ to: "5585999990000", kind: "reminder", params: [] });
    expect(r.providerMessageId).toBe("wamid.123");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v21.0/999/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("live lança erro com a mensagem da Meta", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { message: "Template não encontrado", code: 132001 } }),
          { status: 400 },
        ),
    );
    const t = createLiveTransport({ phoneNumberId: "1", accessToken: "x", fetchImpl });
    await expect(
      t.sendTemplate({ to: "5585", kind: "confirmation", params: [] }),
    ).rejects.toBeInstanceOf(WhatsAppApiError);
  });

  it("sem credenciais o modo live cai no mock", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(transportFromEnv({ WHATSAPP_MODE: "live" }).mode).toBe("mock");
    expect(transportFromEnv({ WHATSAPP_MODE: "mock" }).mode).toBe("mock");
    expect(
      transportFromEnv({
        WHATSAPP_MODE: "live",
        WHATSAPP_PHONE_NUMBER_ID: "1",
        WHATSAPP_ACCESS_TOKEN: "t",
      }).mode,
    ).toBe("live");
    warn.mockRestore();
  });
});
