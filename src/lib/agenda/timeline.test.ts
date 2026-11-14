import { describe, expect, it } from "vitest";
import { MONDAY, at, makeContext } from "@/lib/availability/fixtures";
import { buildTimeline, daySummary, type AgendaAppointment } from "./timeline";

function appt(over: Partial<AgendaAppointment>): AgendaAppointment {
  return {
    id: "a",
    start: at(MONDAY, "09:00"),
    end: at(MONDAY, "09:30"),
    status: "confirmed",
    source: "link",
    customerName: "Lucas",
    customerWhatsapp: "5585999990000",
    serviceName: "Corte",
    staffId: "ze",
    staffName: "Zé",
    priceCents: 4000,
    confirmationSent: false,
    ...over,
  };
}

describe("linha do tempo da agenda", () => {
  const appointments = [
    appt({ id: "a1" }),
    appt({
      id: "a2",
      staffId: "ana",
      staffName: "Ana",
      start: at(MONDAY, "10:00"),
      end: at(MONDAY, "11:00"),
    }),
    appt({ id: "a3", status: "canceled", start: at(MONDAY, "14:00"), end: at(MONDAY, "14:30") }),
  ];
  const ctx = makeContext({
    now: at(MONDAY, "08:00"),
    appointments: appointments.map((a) => ({
      id: a.id,
      staffId: a.staffId,
      start: a.start,
      end: a.end,
      status: a.status,
    })),
    blocks: [{ staffId: "ze", start: at(MONDAY, "16:00"), end: at(MONDAY, "17:00") }],
  });
  const blocks = [
    {
      id: "b1",
      staffId: "ze",
      start: at(MONDAY, "16:00"),
      end: at(MONDAY, "17:00"),
      reason: "Médico",
    },
  ];

  it("ordena agendamentos, bloqueios e livres; cancelados ficam à parte", () => {
    const t = buildTimeline({ ctx, date: MONDAY, staffId: null, appointments, blocks });
    expect(t.canceled.map((a) => a.id)).toEqual(["a3"]);
    const first = t.items.slice(0, 3).map((i) => `${i.kind}@${i.time}`);
    expect(first).toEqual(["appointment@09:00", "free@09:00", "free@09:30"]);
    // às 9h a Ana está livre (Zé ocupado)
    const nine = t.items.find((i) => i.kind === "free" && i.time === "09:00");
    expect(nine && nine.kind === "free" && nine.staffIds).toEqual(["ana"]);
    // o cancelado libera 14h
    expect(t.items.some((i) => i.kind === "free" && i.time === "14:00")).toBe(true);
  });

  it("filtra por profissional", () => {
    const t = buildTimeline({ ctx, date: MONDAY, staffId: "ze", appointments, blocks });
    const kinds = t.items.filter((i) => i.kind !== "free").map((i) => `${i.kind}@${i.time}`);
    expect(kinds).toEqual(["appointment@09:00", "block@16:00"]);
    expect(t.items.some((i) => i.kind === "free" && i.time === "16:30")).toBe(false);
  });

  it("resumo do dia", () => {
    expect(daySummary(appointments)).toEqual({
      total: 2,
      pending: 2,
      completed: 0,
      noShow: 0,
      expectedRevenueCents: 8000,
    });
  });
});
