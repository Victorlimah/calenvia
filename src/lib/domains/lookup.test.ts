import { afterEach, describe, expect, it, vi } from "vitest";
import { clearDomainCache, slugForDomain, slugFromRow } from "./lookup";

const proPlus = { slug: "ze", plan: "pro_plus", plan_status: "active" };

describe("domínio próprio no middleware", () => {
  afterEach(clearDomainCache);

  it("só resolve domínio verificado de negócio Pro+ ativo", () => {
    expect(slugFromRow({ verified_at: "x", businesses: proPlus })).toBe("ze");
    expect(slugFromRow({ verified_at: null, businesses: proPlus })).toBeNull();
    expect(slugFromRow({ verified_at: "x", businesses: { ...proPlus, plan: "pro" } })).toBeNull();
    expect(
      slugFromRow({ verified_at: "x", businesses: { ...proPlus, plan_status: "suspended" } }),
    ).toBeNull();
    expect(slugFromRow(undefined)).toBeNull();
  });

  it("guarda em cache por 60 s", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://sb");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "k");
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify([{ verified_at: "x", businesses: proPlus }])),
    );
    expect(await slugForDomain("a.com", { now: 0, fetchImpl })).toBe("ze");
    expect(await slugForDomain("a.com", { now: 30_000, fetchImpl })).toBe("ze");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await slugForDomain("a.com", { now: 61_000, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    vi.unstubAllEnvs();
  });
});
