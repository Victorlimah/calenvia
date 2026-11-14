import { describe, expect, it } from "vitest";
import { canReview, publicAuthorName, ratingSummary, reviewRequestText } from "./reviews";

const NOW = new Date("2026-11-20T12:00:00Z");

describe("avaliações", () => {
  it("só avalia atendimento concluído, uma vez, até 30 dias depois", () => {
    const a = { status: "completed", start: new Date("2026-11-18T12:00:00Z") };
    expect(canReview(a, false, NOW)).toEqual({ ok: true });
    expect(canReview(a, true, NOW)).toMatchObject({ reason: "reviewed" });
    expect(canReview({ ...a, status: "confirmed" }, false, NOW)).toMatchObject({
      reason: "not_done",
    });
    expect(canReview({ ...a, start: new Date("2026-10-01T12:00:00Z") }, false, NOW)).toMatchObject({
      reason: "too_late",
    });
  });

  it("média com uma casa", () => {
    expect(ratingSummary([5, 4, 4])).toEqual({ average: 4.3, count: 3 });
    expect(ratingSummary([])).toEqual({ average: null, count: 0 });
  });

  it("nome público sem sobrenome completo (privacidade)", () => {
    expect(publicAuthorName("Lucas Andrade Silva")).toBe("Lucas S.");
    expect(publicAuthorName("Bia")).toBe("Bia");
  });

  it("mensagem de pedido de avaliação", () => {
    expect(reviewRequestText({ name: "Ana Nails" }, "Juliana Souza", "https://x")).toMatch(
      /^Olá, Juliana! Obrigado por vir à \*Ana Nails\*\..*https:\/\/x$/,
    );
  });
});
