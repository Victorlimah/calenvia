import { describe, expect, it } from "vitest";
import { STARTER_SERVICES, starterServicesFor } from "@/lib/business/starter-services";
import { SEGMENT_IDS } from "@/lib/business/segments";
import {
  canCancelOwnerInvitation,
  canRegenerateOwnerInvitation,
  ownerInvitationMessage,
  ownerInvitationProblem,
  ownerInvitationStatus,
  ownerInviteSchema,
} from "./owner-invitations";

const now = new Date("2026-11-20T12:00:00Z");
const base = {
  expires_at: "2026-11-27T12:00:00Z",
  opened_at: null,
  accepted_at: null,
  canceled_at: null,
};

describe("convite de negócio (CAL-136)", () => {
  it("estados: enviado, aberto, aceito, expirado, cancelado", () => {
    expect(ownerInvitationStatus(base, now)).toBe("sent");
    expect(ownerInvitationStatus({ ...base, opened_at: "2026-11-20T11:00:00Z" }, now)).toBe(
      "opened",
    );
    expect(ownerInvitationStatus({ ...base, accepted_at: "2026-11-20T11:00:00Z" }, now)).toBe(
      "accepted",
    );
    expect(ownerInvitationStatus({ ...base, expires_at: "2026-11-20T12:00:00Z" }, now)).toBe(
      "expired",
    );
    expect(ownerInvitationStatus({ ...base, canceled_at: "2026-11-20T11:00:00Z" }, now)).toBe(
      "canceled",
    );
    // Aceito vale mais que a validade (convite usado ontem continua "Aceito").
    expect(
      ownerInvitationStatus(
        { ...base, expires_at: "2026-11-01T00:00:00Z", accepted_at: "2026-10-30T00:00:00Z" },
        now,
      ),
    ).toBe("accepted");
  });

  it("problema do convite para quem abre o link", () => {
    expect(ownerInvitationProblem(null, now)).toBe("not_found");
    expect(ownerInvitationProblem(base, now)).toBeNull();
    expect(ownerInvitationProblem({ ...base, opened_at: "2026-11-20T11:00:00Z" }, now)).toBeNull();
    expect(ownerInvitationProblem({ ...base, accepted_at: "2026-11-20T11:00:00Z" }, now)).toBe(
      "used",
    );
    expect(ownerInvitationProblem({ ...base, expires_at: "2026-11-19T00:00:00Z" }, now)).toBe(
      "expired",
    );
    expect(ownerInvitationProblem({ ...base, canceled_at: "2026-11-20T11:00:00Z" }, now)).toBe(
      "canceled",
    );
  });

  it("ações permitidas por estado", () => {
    expect(canRegenerateOwnerInvitation("expired")).toBe(true);
    expect(canRegenerateOwnerInvitation("canceled")).toBe(true);
    expect(canRegenerateOwnerInvitation("accepted")).toBe(false);
    expect(canCancelOwnerInvitation("sent")).toBe(true);
    expect(canCancelOwnerInvitation("accepted")).toBe(false);
    expect(canCancelOwnerInvitation("canceled")).toBe(false);
  });

  it("mensagem do WhatsApp com o primeiro nome, o negócio e o link", () => {
    const msg = ownerInvitationMessage("Ana Paula Souza", "Ana Nails", "https://x/convite/abc");
    expect(msg).toContain("Olá, Ana!");
    expect(msg).toContain("*Ana Nails*");
    expect(msg).toContain("https://x/convite/abc");
    expect(msg).toContain("7 dias");
  });

  it("formulário: normaliza e-mail e WhatsApp, limites vazios viram null", () => {
    const r = ownerInviteSchema.safeParse({
      businessName: "Studio Bela",
      segment: "salao",
      ownerName: "Bela",
      email: " Bela@Exemplo.COM ",
      whatsapp: "(83) 9 8647-9932",
      plan: "pro",
      messageLimitOverride: "",
      memberLimitOverride: "3",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("bela@exemplo.com");
      expect(r.data.whatsapp).toBe("5583986479932");
      expect(r.data.messageLimitOverride).toBeNull();
      expect(r.data.memberLimitOverride).toBe(3);
      expect(r.data.starterServices).toBe(true);
    }
  });

  it("formulário: e-mail inválido e segmento faltando dão erro", () => {
    const r = ownerInviteSchema.safeParse({
      businessName: "X Y",
      segment: "",
      ownerName: "Bela",
      email: "nao-e-email",
      whatsapp: "83986479932",
      plan: "pro",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("email");
      expect(paths).toContain("segment");
    }
  });

  it("serviços iniciais: todo segmento tem lista (pode ser vazia) com durações válidas", () => {
    for (const id of SEGMENT_IDS) {
      for (const s of STARTER_SERVICES[id]) {
        expect(s.duration_min).toBeGreaterThanOrEqual(5);
        expect(s.duration_min).toBeLessThanOrEqual(720);
      }
    }
    expect(starterServicesFor("salao").length).toBeGreaterThan(0);
    expect(starterServicesFor("desconhecido")).toEqual([]);
  });
});
