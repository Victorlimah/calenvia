import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cron";

describe("isCronAuthorized", () => {
  it("aceita só o Bearer com o segredo exato", () => {
    expect(isCronAuthorized("Bearer s3gredo", "s3gredo")).toBe(true);
    expect(isCronAuthorized("Bearer errado", "s3gredo")).toBe(false);
    expect(isCronAuthorized("s3gredo", "s3gredo")).toBe(false);
    expect(isCronAuthorized(null, "s3gredo")).toBe(false);
  });

  it("sem CRON_SECRET configurado, ninguém entra", () => {
    expect(isCronAuthorized("Bearer ", "")).toBe(false);
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
  });
});
