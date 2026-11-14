/**
 * Monta a linha do tempo do dia no painel (função pura): agendamentos, bloqueios e
 * horários livres em ordem, no fuso do negócio.
 */
import { getDaySlots, type AvailabilityContext } from "@/lib/availability";
import { localMinutesOf, minutesToTime, type LocalDate } from "@/lib/dates";

export type AgendaAppointment = {
  id: string;
  start: Date;
  end: Date;
  status: "confirmed" | "completed" | "no_show" | "canceled";
  source: "link" | "manual";
  customerName: string;
  customerWhatsapp: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  /** null = o papel não vê valores (CAL-112). */
  priceCents: number | null;
  confirmationSent: boolean;
};

export type AgendaBlock = {
  id: string;
  start: Date;
  end: Date;
  staffId: string | null;
  reason: string | null;
};

export type TimelineItem =
  | { kind: "appointment"; time: string; item: AgendaAppointment }
  | { kind: "block"; time: string; item: AgendaBlock }
  | { kind: "free"; time: string; start: Date; staffIds: string[] };

const ANY_SERVICE = "__painel__";

/** Horários livres do dia (para o dono): sem antecedência mínima, sem limite de dias. */
export function freeSlots(ctx: AvailabilityContext, date: LocalDate, staffId: string | null) {
  const painelCtx: AvailabilityContext = {
    ...ctx,
    minNoticeMin: 0,
    maxDaysAhead: 3650,
    staff: ctx.staff.map((s) => ({ ...s, serviceIds: [...s.serviceIds, ANY_SERVICE] })),
  };
  const day = getDaySlots(painelCtx, {
    date,
    serviceId: ANY_SERVICE,
    durationMin: ctx.slotIntervalMin,
    staffId,
  });
  return { status: day.status, slots: day.slots };
}

export function buildTimeline(input: {
  ctx: AvailabilityContext;
  date: LocalDate;
  staffId: string | null;
  appointments: AgendaAppointment[];
  blocks: AgendaBlock[];
}): { items: TimelineItem[]; canceled: AgendaAppointment[]; dayStatus: string } {
  const { ctx, date, staffId } = input;
  const tz = ctx.timezone;
  const time = (d: Date) => minutesToTime(localMinutesOf(d, tz));
  const visible = input.appointments.filter((a) => !staffId || a.staffId === staffId);
  const active = visible.filter((a) => a.status !== "canceled");
  const canceled = visible.filter((a) => a.status === "canceled");
  const blocks = input.blocks.filter(
    (b) => !staffId || b.staffId === null || b.staffId === staffId,
  );
  const { status, slots } = freeSlots(ctx, date, staffId);

  const items: TimelineItem[] = [
    ...active.map((a) => ({ kind: "appointment" as const, time: time(a.start), item: a })),
    ...blocks.map((b) => ({ kind: "block" as const, time: time(b.start), item: b })),
    ...slots.map((s) => ({
      kind: "free" as const,
      time: s.time,
      start: s.start,
      staffIds: s.staffIds,
    })),
  ];
  const at = (i: TimelineItem) => (i.kind === "free" ? i.start.getTime() : i.item.start.getTime());
  const order = { block: 0, appointment: 1, free: 2 };
  items.sort((a, b) => at(a) - at(b) || order[a.kind] - order[b.kind]);
  return { items, canceled, dayStatus: status };
}

export function daySummary(appointments: AgendaAppointment[]) {
  const active = appointments.filter((a) => a.status !== "canceled");
  return {
    total: active.length,
    pending: active.filter((a) => a.status === "confirmed").length,
    completed: active.filter((a) => a.status === "completed").length,
    noShow: active.filter((a) => a.status === "no_show").length,
    expectedRevenueCents: active
      .filter((a) => a.status !== "no_show")
      .reduce((s, a) => s + (a.priceCents ?? 0), 0),
  };
}
