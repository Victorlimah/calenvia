import { describe, expect, it } from "vitest";
import { getDaySlots } from "./engine";
import { MONDAY, at, makeContext } from "./fixtures";
import { pickStaffForSlot } from "./pick-staff";

const corte = { serviceId: "corte", durationMin: 30 };

describe("Sem preferência", () => {
  it("o horário está livre se ao menos um profissional apto estiver livre", () => {
    const ctx = makeContext({
      appointments: [{ staffId: "ze", start: at(MONDAY, "09:00"), end: at(MONDAY, "09:30") }],
    });
    const nine = getDaySlots(ctx, { ...corte, date: MONDAY, staffId: null }).slots.find(
      (s) => s.time === "09:00",
    );
    expect(nine?.staffIds).toEqual(["ana"]);
  });

  it("some quando todos os aptos estão ocupados", () => {
    const ctx = makeContext({
      appointments: [
        { staffId: "ze", start: at(MONDAY, "09:00"), end: at(MONDAY, "09:30") },
        { staffId: "ana", start: at(MONDAY, "09:00"), end: at(MONDAY, "10:00") },
      ],
    });
    const t = getDaySlots(ctx, { ...corte, date: MONDAY, staffId: null }).slots.map((s) => s.time);
    expect(t).not.toContain("09:00");
    expect(t).toContain("09:30"); // Zé livre
  });

  it("considera só quem faz o serviço", () => {
    const ctx = makeContext({
      appointments: [{ staffId: "ze", start: at(MONDAY, "09:00"), end: at(MONDAY, "09:30") }],
    });
    const t = getDaySlots(ctx, {
      serviceId: "barba",
      durationMin: 30,
      date: MONDAY,
      staffId: null,
    }).slots.map((s) => s.time);
    expect(t).not.toContain("09:00"); // Ana não faz barba
  });

  it("atribui ao livre com menos agendamentos no dia", () => {
    const ctx = makeContext({
      appointments: [
        { staffId: "ana", start: at(MONDAY, "14:00"), end: at(MONDAY, "14:30") },
        { staffId: "ana", start: at(MONDAY, "15:00"), end: at(MONDAY, "15:30") },
        { staffId: "ze", start: at(MONDAY, "16:00"), end: at(MONDAY, "16:30") },
      ],
    });
    expect(pickStaffForSlot(ctx, ["ana", "ze"], MONDAY)).toBe("ze");
  });

  it("empate vai pela ordem alfabética", () => {
    expect(pickStaffForSlot(makeContext(), ["ze", "ana"], MONDAY)).toBe("ana"); // Ana < Zé
  });

  it("ignora cancelados e outros dias na contagem", () => {
    const ctx = makeContext({
      appointments: [
        {
          staffId: "ana",
          start: at(MONDAY, "14:00"),
          end: at(MONDAY, "14:30"),
          status: "canceled",
        },
        { staffId: "ana", start: at("2026-11-17", "14:00"), end: at("2026-11-17", "14:30") },
        { staffId: "ze", start: at(MONDAY, "16:00"), end: at(MONDAY, "16:30") },
      ],
    });
    expect(pickStaffForSlot(ctx, ["ana", "ze"], MONDAY)).toBe("ana");
  });

  it("ninguém livre", () => {
    expect(pickStaffForSlot(makeContext(), [], MONDAY)).toBeNull();
  });
});
