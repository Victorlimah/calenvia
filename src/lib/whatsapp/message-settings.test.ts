import { describe, expect, it } from "vitest";
import {
  appointmentsPerQuota,
  decideSend,
  DEFAULT_MESSAGE_SETTINGS,
  messagesPerAppointment,
  normalizeOffsets,
  reminderSlots,
  type MessageSettings,
} from "./message-settings";
import type { TemplateKind } from "./templates";

const pro = { plan: "pro", plan_status: "active", message_limit_override: null };
const basic = { ...pro, plan: "basic" };
const on: MessageSettings = { ...DEFAULT_MESSAGE_SETTINGS };
const base = {
  business: pro,
  settings: on,
  type: "confirmation" as TemplateKind,
  appointmentStatus: "confirmed",
  messagesEnabled: true,
  optedOut: false,
  usedThisMonth: 0,
};

describe("decideSend (CAL-111): ordem plano → negócio → agendamento → opt-out → cota", () => {
  it("tudo liberado: envia", () => {
    expect(decideSend(base)).toEqual({ action: "send" });
  });

  it("cada bloqueio isolado dá o motivo certo", () => {
    expect(decideSend({ ...base, business: basic })).toEqual({
      action: "skip",
      reason: "plan_basic",
    });
    expect(decideSend({ ...base, business: { ...pro, plan_status: "suspended" } })).toMatchObject({
      reason: "plan_basic",
    });
    expect(decideSend({ ...base, settings: { ...on, confirmation_enabled: false } })).toMatchObject(
      { reason: "disabled_by_business" },
    );
    expect(decideSend({ ...base, messagesEnabled: false })).toMatchObject({
      reason: "disabled_for_appointment",
    });
    expect(decideSend({ ...base, optedOut: true })).toMatchObject({ reason: "opted_out" });
    expect(decideSend({ ...base, usedThisMonth: 300 })).toMatchObject({ reason: "no_quota" });
  });

  // Todas as combinações dos 5 bloqueios: o motivo é sempre o primeiro na ordem.
  const ORDER = [
    "plan_basic",
    "disabled_by_business",
    "disabled_for_appointment",
    "opted_out",
    "no_quota",
  ] as const;
  const combos = Array.from({ length: 32 }, (_, mask) => mask);
  it.each(combos)("combinação %i dos bloqueios respeita a ordem", (mask) => {
    const has = (i: number) => Boolean(mask & (1 << i));
    const d = decideSend({
      ...base,
      business: has(0) ? basic : pro,
      settings: { ...on, confirmation_enabled: !has(1) },
      messagesEnabled: !has(2),
      optedOut: has(3),
      usedThisMonth: has(4) ? 300 : 0,
    });
    const first = ORDER.findIndex((_, i) => has(i));
    expect(d).toEqual(first === -1 ? { action: "send" } : { action: "skip", reason: ORDER[first] });
  });

  it("cada tipo segue o próprio interruptor", () => {
    const off = (k: keyof MessageSettings) => ({ ...on, [k]: false });
    expect(
      decideSend({ ...base, type: "reminder", settings: off("reminder_enabled") }),
    ).toMatchObject({ reason: "disabled_by_business" });
    expect(
      decideSend({
        ...base,
        type: "cancellation",
        appointmentStatus: "canceled",
        settings: off("cancellation_enabled"),
      }),
    ).toMatchObject({ reason: "disabled_by_business" });
    // desligar a confirmação não afeta o lembrete
    expect(
      decideSend({ ...base, type: "reminder", settings: off("confirmation_enabled") }),
    ).toEqual({ action: "send" });
  });

  it("agendamento desligado bloqueia lembrete e cancelamento também", () => {
    expect(decideSend({ ...base, type: "reminder", messagesEnabled: false })).toMatchObject({
      reason: "disabled_for_appointment",
    });
    expect(
      decideSend({
        ...base,
        type: "cancellation",
        appointmentStatus: "canceled",
        messagesEnabled: false,
      }),
    ).toMatchObject({ reason: "disabled_for_appointment" });
  });

  it("não se aplica (nada é gravado): confirmação de cancelado e cancelamento de ativo", () => {
    expect(decideSend({ ...base, appointmentStatus: "canceled" })).toEqual({
      action: "ignore",
      reason: "canceled",
    });
    expect(decideSend({ ...base, type: "cancellation" })).toEqual({
      action: "ignore",
      reason: "status",
    });
  });
});

describe("horários do lembrete", () => {
  const H = 3600_000;
  const START = new Date("2026-11-20T13:00:00Z");
  const at = (h: number) => new Date(START.getTime() - h * H);

  it("24 h + 2 h: dois lembretes, nos horários certos", () => {
    expect(reminderSlots(START, at(72), [120, 1440])).toEqual([
      { offsetMin: 1440, dueAt: at(24) },
      { offsetMin: 120, dueAt: at(2) },
    ]);
  });

  it("agendado depois do horário de um lembrete pula aquele lembrete", () => {
    expect(reminderSlots(START, at(10), [1440, 120]).map((s) => s.offsetMin)).toEqual([120]);
    expect(reminderSlots(START, at(1), [1440, 120])).toEqual([]);
    expect(reminderSlots(START, at(2), [120])).toHaveLength(1); // exatamente no horário: ainda vale
  });

  it("ignora antecedências desconhecidas e repetidas", () => {
    expect(normalizeOffsets([120, 999, 120, "1440"])).toEqual([1440, 120]);
    expect(normalizeOffsets(null)).toEqual([]);
  });
});

describe("estimativa de cota", () => {
  it("mensagens por agendamento e agendamentos atendidos", () => {
    expect(messagesPerAppointment(on)).toBe(2);
    expect(appointmentsPerQuota(300, on)).toBe(150);
    const both = { ...on, reminder_offsets_min: [1440, 120] };
    expect(messagesPerAppointment(both)).toBe(3);
    expect(appointmentsPerQuota(300, both)).toBe(100);
    expect(appointmentsPerQuota(300, { ...on, reminder_enabled: false })).toBe(300);
    expect(
      appointmentsPerQuota(300, { ...on, confirmation_enabled: false, reminder_enabled: false }),
    ).toBeNull();
  });
});
