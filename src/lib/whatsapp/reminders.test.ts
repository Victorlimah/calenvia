import { describe, expect, it } from "vitest";
import { plansWithAutomaticMessages } from "@/lib/plans";
import { isReminderDue, reminderDueAt } from "./reminders";

const H = 60 * 60 * 1000;
const START = new Date("2026-11-20T13:00:00Z"); // 10:00 em Fortaleza
const at = (hoursBeforeStart: number) => new Date(START.getTime() - hoursBeforeStart * H);

describe("quando sai o lembrete (CAL-069)", () => {
  it("agendado com mais de 24 h: lembrete 24 h antes", () => {
    expect(reminderDueAt(START, at(72))).toEqual(at(24));
    expect(reminderDueAt(START, at(24))).toEqual(at(24));
  });

  it("agendado com menos de 24 h: lembrete 2 h antes", () => {
    expect(reminderDueAt(START, at(23))).toEqual(at(2));
    expect(reminderDueAt(START, at(4))).toEqual(at(2));
  });

  it("agendado com menos de 4 h: sem lembrete (a confirmação acabou de chegar)", () => {
    expect(reminderDueAt(START, at(3.9))).toBeNull();
    expect(reminderDueAt(START, at(1))).toBeNull();
  });
});

describe("isReminderDue", () => {
  const base = { start: START, createdAt: at(48), previous: [] };

  it("antes da hora: não; depois da hora: sim", () => {
    expect(isReminderDue(base, at(24.1))).toBe(false);
    expect(isReminderDue(base, at(24))).toBe(true);
    expect(isReminderDue(base, at(10))).toBe(true); // cron atrasado ainda manda
  });

  it("a menos de 30 min do horário não manda mais", () => {
    expect(isReminderDue(base, at(0.6))).toBe(true);
    expect(isReminderDue(base, at(0.4))).toBe(false);
    expect(isReminderDue(base, at(-1))).toBe(false);
  });

  it("não duplica: já existe lembrete enviado (ou na fila) para esse horário", () => {
    expect(isReminderDue({ ...base, previous: [{ status: "sent" }] }, at(23))).toBe(false);
    expect(isReminderDue({ ...base, previous: [{ status: "queued" }] }, at(23))).toBe(false);
    expect(isReminderDue({ ...base, previous: [{ status: "delivered" }] }, at(23))).toBe(false);
  });

  it("tenta de novo depois de falha, até 3 tentativas", () => {
    const failed = { status: "failed" };
    expect(isReminderDue({ ...base, previous: [failed] }, at(23))).toBe(true);
    expect(isReminderDue({ ...base, previous: [failed, failed] }, at(23))).toBe(true);
    expect(isReminderDue({ ...base, previous: [failed, failed, failed] }, at(23))).toBe(false);
  });

  it("agendado em cima da hora não tem lembrete", () => {
    expect(isReminderDue({ ...base, createdAt: at(3) }, at(1))).toBe(false);
  });
});

describe("planos com envio automático", () => {
  it("só Pro e Pro+ entram no cron", () => {
    expect(plansWithAutomaticMessages()).toEqual(["pro", "pro_plus"]);
  });
});
