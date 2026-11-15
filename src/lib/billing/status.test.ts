import { describe, expect, it } from "vitest";
import { graceEndsAt, nextPlanStatus, PAST_DUE_GRACE_DAYS } from "./status";
import type { PlanStatus } from "@/lib/plans";

const NOW = new Date("2026-11-15T12:00:00Z");
const ALL: PlanStatus[] = ["pending", "active", "past_due", "suspended", "canceled"];

describe("nextPlanStatus (CAL-076)", () => {
  it("pagou: qualquer status vira ativo", () => {
    for (const s of ALL) expect(nextPlanStatus(s, { type: "paid" }, NOW)).toBe("active");
  });

  it("falha no pagamento: só quem está ativo entra em atraso", () => {
    expect(nextPlanStatus("active", { type: "payment_failed" }, NOW)).toBe("past_due");
    expect(nextPlanStatus("past_due", { type: "payment_failed" }, NOW)).toBe("past_due");
    expect(nextPlanStatus("pending", { type: "payment_failed" }, NOW)).toBe("pending");
    expect(nextPlanStatus("suspended", { type: "payment_failed" }, NOW)).toBe("suspended");
    expect(nextPlanStatus("canceled", { type: "payment_failed" }, NOW)).toBe("canceled");
  });

  it("cancelada: sempre cancelada", () => {
    for (const s of ALL) expect(nextPlanStatus(s, { type: "canceled" }, NOW)).toBe("canceled");
  });

  it(`carência: suspende só depois de ${PAST_DUE_GRACE_DAYS} dias em atraso`, () => {
    const day = 24 * 60 * 60 * 1000;
    const since = (days: number) => new Date(NOW.getTime() - days * day);
    expect(nextPlanStatus("past_due", { type: "grace_check", pastDueSince: since(6) }, NOW)).toBe(
      "past_due",
    );
    expect(nextPlanStatus("past_due", { type: "grace_check", pastDueSince: since(7) }, NOW)).toBe(
      "suspended",
    );
    expect(
      nextPlanStatus(
        "past_due",
        { type: "grace_check", pastDueSince: since(30).toISOString() },
        NOW,
      ),
    ).toBe("suspended");
    expect(nextPlanStatus("past_due", { type: "grace_check", pastDueSince: null }, NOW)).toBe(
      "past_due",
    );
  });

  it("carência não mexe em quem não está em atraso", () => {
    const old = new Date("2020-01-01T00:00:00Z");
    for (const s of ["pending", "active", "suspended", "canceled"] as PlanStatus[]) {
      expect(nextPlanStatus(s, { type: "grace_check", pastDueSince: old }, NOW)).toBe(s);
    }
  });

  it("fim da carência", () => {
    expect(graceEndsAt("2026-11-01T10:00:00Z").toISOString()).toBe("2026-11-08T10:00:00.000Z");
  });
});
