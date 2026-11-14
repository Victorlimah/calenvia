import { toLocalDate, type LocalDate } from "@/lib/dates";
import type { AvailabilityContext } from "./types";

/**
 * "Sem preferência": escolhe, entre os profissionais livres no horário, o que tem
 * menos agendamentos (não cancelados) naquele dia. Empate: ordem alfabética.
 */
export function pickStaffForSlot(
  ctx: Pick<AvailabilityContext, "staff" | "appointments" | "timezone">,
  freeStaffIds: string[],
  date: LocalDate,
): string | null {
  if (freeStaffIds.length === 0) return null;
  const countFor = (id: string) =>
    ctx.appointments.filter(
      (a) =>
        a.staffId === id && a.status !== "canceled" && toLocalDate(a.start, ctx.timezone) === date,
    ).length;
  const nameOf = (id: string) => ctx.staff.find((s) => s.id === id)?.name ?? id;
  return [...freeStaffIds].sort((a, b) => {
    const diff = countFor(a) - countFor(b);
    return diff !== 0 ? diff : nameOf(a).localeCompare(nameOf(b), "pt-BR", { sensitivity: "base" });
  })[0];
}
