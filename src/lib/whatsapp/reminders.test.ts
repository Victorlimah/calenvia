import { describe, expect, it } from "vitest";
import { plansWithAutomaticMessages } from "@/lib/plans";
import { reminderSlots } from "./message-settings";
import { isReminderSlotDue, latestDueSlot } from "./reminders";

const H = 60 * 60 * 1000;
const START = new Date("2026-11-20T13:00:00Z");
const at = (hoursBeforeStart: number) => new Date(START.getTime() - hoursBeforeStart * H);

describe("isReminderSlotDue (CAL-111)", () => {
  const base = { start: START, createdAt: at(48), previous: [] };

  it("sai no horário da antecedência, nem antes", () => {
    expect(isReminderSlotDue({ ...base, offsetMin: 1440, now: at(24.1) })).toBe(false);
    expect(isReminderSlotDue({ ...base, offsetMin: 1440, now: at(24) })).toBe(true);
    expect(isReminderSlotDue({ ...base, offsetMin: 120, now: at(2.1) })).toBe(false);
    expect(isReminderSlotDue({ ...base, offsetMin: 120, now: at(2) })).toBe(true);
  });

  it("agendado depois do horário do lembrete: pula", () => {
    expect(isReminderSlotDue({ ...base, createdAt: at(10), offsetMin: 1440, now: at(5) })).toBe(
      false,
    );
    expect(isReminderSlotDue({ ...base, createdAt: at(1), offsetMin: 120, now: at(0.9) })).toBe(
      false,
    );
  });

  it("cada antecedência sai uma vez só", () => {
    const sent24 = [{ offsetMin: 1440, status: "sent" }];
    expect(isReminderSlotDue({ ...base, previous: sent24, offsetMin: 1440, now: at(23) })).toBe(
      false,
    );
    // o de 24 h enviado não impede o de 2 h
    expect(isReminderSlotDue({ ...base, previous: sent24, offsetMin: 120, now: at(2) })).toBe(true);
    // skipped também conta como registrado (não repete)
    expect(
      isReminderSlotDue({
        ...base,
        previous: [{ offsetMin: 120, status: "skipped" }],
        offsetMin: 120,
        now: at(1.5),
      }),
    ).toBe(false);
  });

  it("registro antigo sem antecedência vale para todas", () => {
    expect(
      isReminderSlotDue({
        ...base,
        previous: [{ offsetMin: null, status: "sent" }],
        offsetMin: 120,
        now: at(2),
      }),
    ).toBe(false);
  });

  it("tenta de novo depois de falha, até 3 vezes", () => {
    const f = { offsetMin: 120, status: "failed" };
    expect(isReminderSlotDue({ ...base, previous: [f, f], offsetMin: 120, now: at(1.5) })).toBe(
      true,
    );
    expect(isReminderSlotDue({ ...base, previous: [f, f, f], offsetMin: 120, now: at(1.5) })).toBe(
      false,
    );
  });

  it("a menos de 30 min do horário não manda mais", () => {
    expect(isReminderSlotDue({ ...base, offsetMin: 120, now: at(0.6) })).toBe(true);
    expect(isReminderSlotDue({ ...base, offsetMin: 120, now: at(0.4) })).toBe(false);
  });
});

describe("latestDueSlot", () => {
  const slots = reminderSlots(START, at(48), [1440, 120]);
  it("com o cron parado, só o mais próximo do horário sai", () => {
    expect(latestDueSlot(slots, at(25))).toBeNull();
    expect(latestDueSlot(slots, at(23))?.offsetMin).toBe(1440);
    expect(latestDueSlot(slots, at(1.5))?.offsetMin).toBe(120);
  });
});

describe("planos com envio automático", () => {
  it("só Pro e Pro+ entram no cron", () => {
    expect(plansWithAutomaticMessages()).toEqual(["pro", "pro_plus"]);
  });
});
