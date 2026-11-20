import { describe, expect, it } from "vitest";
import {
  canCreateBusinessInOnboarding,
  canSelfSignUp,
  inviteTokenFromPath,
  isBillingEnabled,
  isInviteOnly,
  parseBillingEnabled,
  parseSignupMode,
  shouldRejectOAuthSignup,
} from "./access";

describe("chaves de modo", () => {
  it("cadastro: padrão é convite; só 'open' abre", () => {
    expect(parseSignupMode(undefined)).toBe("invite");
    expect(parseSignupMode("")).toBe("invite");
    expect(parseSignupMode("qualquer")).toBe("invite");
    expect(parseSignupMode("open")).toBe("open");
    expect(parseSignupMode(" OPEN ")).toBe("open");
    expect(isInviteOnly(undefined)).toBe(true);
    expect(isInviteOnly("open")).toBe(false);
  });

  it("cobrança: padrão desligada; só 'true'/'1' liga", () => {
    expect(parseBillingEnabled(undefined)).toBe(false);
    expect(parseBillingEnabled("false")).toBe(false);
    expect(parseBillingEnabled("sim")).toBe(false);
    expect(parseBillingEnabled("true")).toBe(true);
    expect(parseBillingEnabled("TRUE")).toBe(true);
    expect(parseBillingEnabled("1")).toBe(true);
    expect(isBillingEnabled(undefined)).toBe(false);
  });

  it("no modo convite não existe cadastro sem convite da equipe", () => {
    expect(canSelfSignUp("invite", false)).toBe(false);
    expect(canSelfSignUp("invite", true)).toBe(true);
    expect(canSelfSignUp("open", false)).toBe(true);
  });

  it("no modo convite o onboarding não cria negócio", () => {
    expect(canCreateBusinessInOnboarding("invite")).toBe(false);
    expect(canCreateBusinessInOnboarding("open")).toBe(true);
  });

  describe("retorno do Google", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    const fresh = "2026-11-20T11:59:00Z";
    it("conta recém-criada sem negócio nem convite é recusada no modo convite", () => {
      expect(
        shouldRejectOAuthSignup({
          mode: "invite",
          userCreatedAt: fresh,
          hasAnyMembership: false,
          hasValidTeamInvite: false,
          now,
        }),
      ).toBe(true);
    });
    it("conta antiga, membro ou convite válido passam", () => {
      const base = { mode: "invite" as const, hasValidTeamInvite: false, now };
      expect(
        shouldRejectOAuthSignup({ ...base, userCreatedAt: "2026-01-01", hasAnyMembership: false }),
      ).toBe(false);
      expect(
        shouldRejectOAuthSignup({ ...base, userCreatedAt: fresh, hasAnyMembership: true }),
      ).toBe(false);
      expect(
        shouldRejectOAuthSignup({
          ...base,
          userCreatedAt: fresh,
          hasAnyMembership: false,
          hasValidTeamInvite: true,
        }),
      ).toBe(false);
    });
    it("modo aberto nunca recusa", () => {
      expect(
        shouldRejectOAuthSignup({
          mode: "open",
          userCreatedAt: fresh,
          hasAnyMembership: false,
          hasValidTeamInvite: false,
          now,
        }),
      ).toBe(false);
    });
  });

  it("token do caminho de convite", () => {
    const t = "a".repeat(32);
    expect(inviteTokenFromPath(`/convite/${t}`)).toBe(t);
    expect(inviteTokenFromPath(`/convite/${t}?x=1`)).toBe(t);
    expect(inviteTokenFromPath("/convite/curto")).toBeNull();
    expect(inviteTokenFromPath("/onboarding")).toBeNull();
    expect(inviteTokenFromPath(null)).toBeNull();
  });
});
