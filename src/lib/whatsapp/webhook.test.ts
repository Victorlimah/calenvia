import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { nextStatus, parseStatusUpdates, verifySignature, verifySubscription } from "./webhook";

const payload = (statuses: unknown[]) => ({
  object: "whatsapp_business_account",
  entry: [{ id: "WABA", changes: [{ field: "messages", value: { statuses } }] }],
});

describe("verificação da URL (GET)", () => {
  const q = (s: string) => new URLSearchParams(s);
  it("devolve o challenge com o token certo", () => {
    expect(
      verifySubscription(q("hub.mode=subscribe&hub.verify_token=abc&hub.challenge=123"), "abc"),
    ).toBe("123");
  });
  it("recusa token errado, modo errado ou token não configurado", () => {
    expect(
      verifySubscription(q("hub.mode=subscribe&hub.verify_token=x&hub.challenge=1"), "abc"),
    ).toBeNull();
    expect(
      verifySubscription(q("hub.mode=other&hub.verify_token=abc&hub.challenge=1"), "abc"),
    ).toBeNull();
    expect(
      verifySubscription(q("hub.mode=subscribe&hub.verify_token=&hub.challenge=1"), undefined),
    ).toBeNull();
  });
});

describe("assinatura X-Hub-Signature-256", () => {
  const body = JSON.stringify(payload([]));
  const sig = "sha256=" + createHmac("sha256", "segredo").update(body).digest("hex");
  it("aceita a assinatura correta", () => {
    expect(verifySignature(body, sig, "segredo")).toBe(true);
  });
  it("recusa corpo alterado, segredo errado ou cabeçalho ausente", () => {
    expect(verifySignature(body + " ", sig, "segredo")).toBe(false);
    expect(verifySignature(body, sig, "outro")).toBe(false);
    expect(verifySignature(body, null, "segredo")).toBe(false);
    expect(verifySignature(body, sig.slice(7), "segredo")).toBe(false);
  });
});

describe("parseStatusUpdates", () => {
  it("lê entregue, lida e falhou com o erro da Meta", () => {
    const u = parseStatusUpdates(
      payload([
        { id: "wamid.1", status: "delivered", timestamp: "1763100000", recipient_id: "55" },
        { id: "wamid.1", status: "read", timestamp: "1763100060" },
        {
          id: "wamid.2",
          status: "failed",
          timestamp: "1763100000",
          errors: [
            {
              code: 131026,
              title: "Message undeliverable",
              error_data: { details: "Número sem WhatsApp" },
            },
          ],
        },
      ]),
    );
    expect(u.map((x) => [x.providerMessageId, x.status])).toEqual([
      ["wamid.1", "delivered"],
      ["wamid.1", "read"],
      ["wamid.2", "failed"],
    ]);
    expect(u[0].at.toISOString()).toBe(new Date(1763100000 * 1000).toISOString());
    expect(u[2].error).toBe("131026 · Message undeliverable · Número sem WhatsApp");
  });

  it("ignora mensagens recebidas, status desconhecidos e payloads estranhos", () => {
    expect(parseStatusUpdates(null)).toEqual([]);
    expect(parseStatusUpdates({ entry: "x" })).toEqual([]);
    expect(
      parseStatusUpdates({
        entry: [{ changes: [{ value: { messages: [{ from: "55", text: { body: "oi" } }] } }] }],
      }),
    ).toEqual([]);
    expect(
      parseStatusUpdates(payload([{ id: "w", status: "deleted" }, { status: "read" }])),
    ).toEqual([]);
  });
});

describe("nextStatus (eventos fora de ordem)", () => {
  it("avança: enviada → entregue → lida", () => {
    expect(nextStatus("sent", "delivered")).toBe("delivered");
    expect(nextStatus("delivered", "read")).toBe("read");
    expect(nextStatus("sent", "read")).toBe("read");
    expect(nextStatus("queued", "sent")).toBe("sent");
  });
  it("nunca volta", () => {
    expect(nextStatus("read", "delivered")).toBeNull();
    expect(nextStatus("delivered", "sent")).toBeNull();
    expect(nextStatus("read", "read")).toBeNull();
  });
  it("falhou só antes de entregue, e é final", () => {
    expect(nextStatus("sent", "failed")).toBe("failed");
    expect(nextStatus("delivered", "failed")).toBeNull();
    expect(nextStatus("failed", "delivered")).toBeNull();
  });
});
