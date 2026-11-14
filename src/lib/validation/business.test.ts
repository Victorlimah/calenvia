import { describe, expect, it } from "vitest";
import {
  agendaRulesSchema,
  businessInfoSchema,
  defaultWeekHours,
  serviceSchema,
  weekHoursSchema,
} from "./business";

describe("dados do negócio", () => {
  const base = {
    name: "Barbearia do Zé",
    segment: "barbearia",
    address: "Rua A, 100 — Centro",
    whatsapp: "(85) 9 8888-7777",
    instagram: "@barbeariadoze",
    slug: "barbearia-do-ze",
    timezone: "America/Fortaleza",
  };
  it("normaliza WhatsApp e Instagram", () => {
    const r = businessInfoSchema.parse(base);
    expect(r.whatsapp).toBe("5585988887777");
    expect(r.instagram).toBe("barbeariadoze");
    expect(r.address_reference).toBeNull();
  });
  it("aceita link do Instagram", () => {
    const r = businessInfoSchema.parse({ ...base, instagram: "https://www.instagram.com/ze/" });
    expect(r.instagram).toBe("ze");
  });
  it("rejeita slug reservado e WhatsApp inválido", () => {
    const r = businessInfoSchema.safeParse({ ...base, slug: "admin", whatsapp: "123" });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toContain("slug");
    expect(paths).toContain("whatsapp");
  });
  it("rejeita fuso inválido", () => {
    expect(businessInfoSchema.safeParse({ ...base, timezone: "Marte/Base" }).success).toBe(false);
  });
});

describe("serviço", () => {
  it("converte preço e duração", () => {
    const r = serviceSchema.parse({ name: "Corte", duration_min: "30", price: "40,00" });
    expect(r.price).toBe(4000);
    expect(r.duration_min).toBe(30);
    expect(r.is_active).toBe(true);
  });
  it("rejeita preço inválido", () => {
    expect(
      serviceSchema.safeParse({ name: "Corte", duration_min: 30, price: "quarenta" }).success,
    ).toBe(false);
  });
});

describe("horários", () => {
  it("o padrão é válido", () => {
    expect(weekHoursSchema.safeParse(defaultWeekHours()).success).toBe(true);
  });
  it("fechamento antes da abertura é erro", () => {
    const days = defaultWeekHours();
    days[1] = { ...days[1], opens_at: "18:00", closes_at: "09:00", breaks: [] };
    expect(weekHoursSchema.safeParse(days).success).toBe(false);
  });
  it("intervalo fora do horário é erro", () => {
    const days = defaultWeekHours();
    days[2] = { ...days[2], breaks: [{ starts_at: "19:00", ends_at: "20:00" }] };
    expect(weekHoursSchema.safeParse(days).success).toBe(false);
  });
  it("intervalos sobrepostos são erro", () => {
    const days = defaultWeekHours();
    days[3] = {
      ...days[3],
      breaks: [
        { starts_at: "12:00", ends_at: "13:00" },
        { starts_at: "12:30", ends_at: "14:00" },
      ],
    };
    expect(weekHoursSchema.safeParse(days).success).toBe(false);
  });
  it("dia fechado não precisa de horário", () => {
    const days = defaultWeekHours();
    expect(days[0].is_open).toBe(false);
    expect(weekHoursSchema.safeParse(days).success).toBe(true);
  });
});

describe("regras da agenda", () => {
  it("aceita só 15, 30 ou 60", () => {
    const ok = {
      slot_interval_min: "30",
      min_notice_min: 60,
      max_days_ahead: 30,
      cancel_notice_min: 120,
    };
    expect(agendaRulesSchema.safeParse(ok).success).toBe(true);
    expect(agendaRulesSchema.safeParse({ ...ok, slot_interval_min: 20 }).success).toBe(false);
  });
});
