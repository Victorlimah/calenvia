import { describe, expect, it } from "vitest";
import { appointmentsByDay, dayState, hourAxis, nowLine, placeInColumn } from "./calendar";
import type { AgendaAppointment, AgendaBlock } from "./timeline";

const TZ = "America/Fortaleza"; // UTC-3, sem horário de verão
const at = (d: string, t: string) => new Date(`${d}T${t}:00-03:00`);

function appt(
  id: string,
  d: string,
  s: string,
  e: string,
  status = "confirmed",
): AgendaAppointment {
  return {
    id,
    start: at(d, s),
    end: at(d, e),
    status: status as AgendaAppointment["status"],
    source: "link",
    customerName: id,
    customerWhatsapp: "",
    serviceName: "Corte",
    staffId: "a",
    staffName: "A",
    priceCents: null,
    confirmationSent: false,
  };
}

const HOURS = [
  { weekday: 1, is_open: true, opens_at: "09:00:00", closes_at: "18:00:00" },
  { weekday: 2, is_open: true, opens_at: "08:30", closes_at: "19:30" },
  { weekday: 0, is_open: false, opens_at: null, closes_at: null },
];

describe("agenda em calendário (CAL-121/122)", () => {
  it("agrupa por dia no fuso, sem cancelados, em ordem", () => {
    const map = appointmentsByDay(
      [
        appt("b", "2026-11-16", "15:00", "15:30"),
        appt("a", "2026-11-16", "09:00", "09:30"),
        appt("x", "2026-11-16", "10:00", "10:30", "canceled"),
        appt("noite", "2026-11-16", "22:30", "23:00"), // 01:30 UTC do dia 17
      ],
      TZ,
    );
    expect(map.get("2026-11-16")?.map((a) => a.id)).toEqual(["a", "b", "noite"]);
    expect(map.get("2026-11-17")).toBeUndefined();
  });

  it("dia fechado, aberto e bloqueado inteiro", () => {
    expect(dayState("2026-11-15", HOURS, [], TZ)).toBe("closed"); // domingo
    expect(dayState("2026-11-19", HOURS, [], TZ)).toBe("closed"); // quinta sem cadastro
    expect(dayState("2026-11-16", HOURS, [], TZ)).toBe("open");
    const allDay: AgendaBlock = {
      id: "1",
      start: at("2026-11-16", "00:00"),
      end: at("2026-11-17", "00:00"),
      staffId: null,
      reason: "Feriado",
    };
    expect(dayState("2026-11-16", HOURS, [allDay], TZ)).toBe("blocked");
    const partial = { ...allDay, start: at("2026-11-16", "12:00") };
    expect(dayState("2026-11-16", HOURS, [partial], TZ)).toBe("open");
    // bloqueio de vários dias cobre o dia do meio
    const vacation = {
      ...allDay,
      start: at("2026-11-14", "00:00"),
      end: at("2026-11-20", "00:00"),
    };
    expect(dayState("2026-11-17", HOURS, [vacation], TZ)).toBe("blocked");
    // bloqueio de outro profissional não fecha o dia; do filtrado, fecha
    const ofB = { ...allDay, staffId: "b" };
    expect(dayState("2026-11-16", HOURS, [ofB], TZ)).toBe("open");
    expect(dayState("2026-11-16", HOURS, [ofB], TZ, "b")).toBe("blocked");
  });

  it("eixo de horas vai da menor abertura ao maior fechamento, em horas cheias", () => {
    expect(hourAxis(HOURS)).toEqual({ startMin: 8 * 60, endMin: 20 * 60 });
    expect(hourAxis([])).toEqual({ startMin: 8 * 60, endMin: 20 * 60 });
    // agendamento fora do horário estica o eixo
    expect(hourAxis(HOURS, [appt("cedo", "2026-11-16", "06:45", "07:15")], TZ).startMin).toBe(
      6 * 60,
    );
  });

  it("posiciona pela duração e divide sobrepostos em faixas", () => {
    const axis = { startMin: 8 * 60, endMin: 18 * 60 }; // 600 min
    const placed = placeInColumn(
      [
        appt("a", "2026-11-16", "09:00", "10:00"),
        appt("b", "2026-11-16", "09:30", "10:30"),
        appt("c", "2026-11-16", "11:00", "11:30"),
      ],
      axis,
      TZ,
    );
    const byId = Object.fromEntries(placed.map((p) => [p.item.id, p]));
    expect(byId.a.top).toBeCloseTo(10);
    expect(byId.a.height).toBeCloseTo(10);
    expect([byId.a.lane, byId.b.lane]).toEqual([0, 1]);
    expect(byId.a.lanes).toBe(2);
    expect(byId.b.lanes).toBe(2);
    expect(byId.c.lane).toBe(0);
    expect(byId.c.lanes).toBe(1);
  });

  it("linha do agora só dentro do eixo", () => {
    const axis = { startMin: 8 * 60, endMin: 18 * 60 };
    expect(nowLine(at("2026-11-16", "13:00"), axis, TZ)).toBeCloseTo(50);
    expect(nowLine(at("2026-11-16", "19:00"), axis, TZ)).toBeNull();
  });
});
