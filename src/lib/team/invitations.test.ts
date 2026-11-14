import { describe, expect, it } from "vitest";
import {
  hashInviteToken,
  invitationMessage,
  invitationProblem,
  invitationStatus,
  newInviteToken,
} from "./invitations";

const now = new Date("2026-11-14T12:00:00Z");
const base = { expires_at: "2026-11-20T12:00:00Z", accepted_at: null, revoked_at: null };

describe("convites (CAL-112)", () => {
  it("token aleatório e hash estável de 64 caracteres", () => {
    const a = newInviteToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(newInviteToken()).not.toBe(a);
    expect(hashInviteToken(a)).toHaveLength(64);
    expect(hashInviteToken(a)).toBe(hashInviteToken(a));
    expect(hashInviteToken(a)).not.toContain(a);
  });

  it("vale só pendente e dentro do prazo, com mensagem clara", () => {
    expect(invitationProblem(base, now)).toBeNull();
    expect(invitationProblem(null, now)).toMatch(/não encontrado/);
    expect(invitationProblem({ ...base, revoked_at: "2026-11-14T00:00:00Z" }, now)).toMatch(
      /cancelado/,
    );
    expect(invitationProblem({ ...base, accepted_at: "2026-11-14T00:00:00Z" }, now)).toMatch(
      /já foi usado/,
    );
    expect(invitationProblem({ ...base, expires_at: "2026-11-14T12:00:00Z" }, now)).toMatch(
      /expirou/,
    );
  });

  it("status para a tela de equipe", () => {
    expect(invitationStatus(base, now)).toBe("pending");
    expect(invitationStatus({ ...base, expires_at: "2026-11-01T00:00:00Z" }, now)).toBe("expired");
    expect(invitationStatus({ ...base, accepted_at: "x" }, now)).toBe("accepted");
    expect(invitationStatus({ ...base, revoked_at: "x", accepted_at: "x" }, now)).toBe("revoked");
  });

  it("mensagem do WhatsApp com negócio, papel e link", () => {
    const t = invitationMessage("Barbearia do Zé", "staff", "https://app/convite/abc");
    expect(t).toContain("*Barbearia do Zé*");
    expect(t).toContain("profissional");
    expect(t).toContain("https://app/convite/abc");
  });
});
