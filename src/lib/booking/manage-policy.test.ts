import { describe, expect, it } from "vitest";
import { customerManagePolicy } from "./manage-policy";

const H = 3600_000;
const START = new Date("2026-11-20T13:00:00Z");
const pro = { plan: "pro", plan_status: "active", cancel_notice_min: 120 };
const ok = { status: "confirmed", start: START };
const at = (hBefore: number) => new Date(START.getTime() - hBefore * H);

describe("política de remarcar/cancelar pelo link", () => {
  it("Pro, antes do prazo: pode", () => {
    const p = customerManagePolicy(pro, ok, at(3));
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.deadline).toEqual(at(2));
  });

  it("exatamente no prazo ainda pode; depois não", () => {
    expect(customerManagePolicy(pro, ok, at(2)).ok).toBe(true);
    expect(customerManagePolicy(pro, ok, at(1.9))).toMatchObject({ ok: false, reason: "deadline" });
  });

  it("prazo zero: pode até o horário começar", () => {
    const b = { ...pro, cancel_notice_min: 0 };
    expect(customerManagePolicy(b, ok, at(0.01)).ok).toBe(true);
    expect(customerManagePolicy(b, ok, at(0))).toMatchObject({ ok: false, reason: "past" });
  });

  it("plano Básico não tem remarcar/cancelar pelo link", () => {
    expect(customerManagePolicy({ ...pro, plan: "basic" }, ok, at(48))).toMatchObject({
      ok: false,
      reason: "plan",
    });
  });

  it("cancelado, concluído ou falta não podem mudar", () => {
    expect(customerManagePolicy(pro, { ...ok, status: "canceled" }, at(48))).toMatchObject({
      reason: "canceled",
    });
    expect(customerManagePolicy(pro, { ...ok, status: "completed" }, at(48))).toMatchObject({
      reason: "done",
    });
    expect(customerManagePolicy(pro, { ...ok, status: "no_show" }, at(48))).toMatchObject({
      reason: "done",
    });
  });
});
