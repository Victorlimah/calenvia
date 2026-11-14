import { describe, expect, it } from "vitest";
import {
  expiresAt,
  packageSavings,
  packageState,
  remainingSessions,
  usablePackage,
} from "./packages";

const p = (o = {}) => ({
  id: "p1",
  name: "4 cortes",
  service_id: "corte",
  sessions_total: 4,
  sessions_used: 1,
  expires_at: "2026-12-31T00:00:00Z",
  ...o,
});
const NOW = new Date("2026-11-20T00:00:00Z");

describe("pacotes", () => {
  it("estado: ativo, vencido ou usado", () => {
    expect(packageState(p(), NOW)).toBe("active");
    expect(packageState(p({ expires_at: "2026-11-01T00:00:00Z" }), NOW)).toBe("expired");
    expect(packageState(p({ sessions_used: 4 }), NOW)).toBe("used_up");
    expect(packageState(p({ expires_at: null }), NOW)).toBe("active");
    expect(remainingSessions(p())).toBe(3);
  });

  it("escolhe o pacote ativo do serviço que vence primeiro", () => {
    const list = [
      p({ id: "a", expires_at: null }),
      p({ id: "b", expires_at: "2026-12-01T00:00:00Z" }),
      p({ id: "c", service_id: "barba" }),
      p({ id: "d", sessions_used: 4 }),
    ];
    expect(usablePackage(list, "corte", NOW)?.id).toBe("b");
    expect(usablePackage(list, "escova", NOW)).toBeNull();
  });

  it("validade e economia", () => {
    expect(expiresAt(new Date("2026-11-01T00:00:00Z"), 30)).toBe("2026-12-01T00:00:00.000Z");
    expect(expiresAt(new Date(), null)).toBeNull();
    expect(packageSavings(4000, 4, 14000)).toEqual({ perSessionCents: 3500, savingsCents: 2000 });
  });
});
