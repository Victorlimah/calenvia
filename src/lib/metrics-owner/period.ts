/**
 * Seletor de período do Financeiro (CAL-126): dia, semana, mês ou intervalo personalizado.
 * Função pura, testada em period.test.ts.
 */
import { addLocalDays, diffLocalDays, isLocalDate, type LocalDate } from "@/lib/dates";
import { addMonths, monthLabel, weekLabel } from "@/lib/agenda/view";
import { rangeOf, type Range } from "./stats";

export type PeriodKind = "dia" | "semana" | "mes" | "personalizado";

export const PERIOD_KINDS: { key: PeriodKind; label: string }[] = [
  { key: "dia", label: "Dia" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "personalizado", label: "Personalizado" },
];

/** Intervalo personalizado de no máximo um ano. */
export const MAX_CUSTOM_DAYS = 366;

export type Period = {
  kind: PeriodKind;
  anchor: LocalDate;
  range: Range;
  label: string;
  /** Tipo usado para achar o período anterior. */
  compareAs: "day" | "week" | "month" | "custom";
};

const fmt = (d: LocalDate) => {
  const [, m, day] = d.split("-").map(Number);
  return `${day}/${String(m).padStart(2, "0")}`;
};

export function parsePeriod(
  sp: { periodo?: string; data?: string; de?: string; ate?: string },
  today: LocalDate,
): Period {
  const anchor = sp.data && isLocalDate(sp.data) ? sp.data : today;
  if (
    sp.periodo === "personalizado" &&
    sp.de &&
    sp.ate &&
    isLocalDate(sp.de) &&
    isLocalDate(sp.ate)
  ) {
    let from = sp.de <= sp.ate ? sp.de : sp.ate;
    const to = sp.de <= sp.ate ? sp.ate : sp.de;
    if (diffLocalDays(from, to) + 1 > MAX_CUSTOM_DAYS)
      from = addLocalDays(to, -(MAX_CUSTOM_DAYS - 1));
    return {
      kind: "personalizado",
      anchor: to,
      range: { from, to },
      label: `${fmt(from)} a ${fmt(to)}`,
      compareAs: "custom",
    };
  }
  if (sp.periodo === "dia") {
    return {
      kind: "dia",
      anchor,
      range: rangeOf(anchor, "day"),
      label: fmt(anchor),
      compareAs: "day",
    };
  }
  if (sp.periodo === "semana") {
    return {
      kind: "semana",
      anchor,
      range: rangeOf(anchor, "week"),
      label: weekLabel(anchor),
      compareAs: "week",
    };
  }
  return {
    kind: "mes",
    anchor,
    range: rangeOf(anchor, "month"),
    label: monthLabel(anchor),
    compareAs: "month",
  };
}

/** Data-âncora do período anterior/seguinte (dia, semana ou mês). */
export function shiftPeriod(p: Period, dir: 1 | -1): LocalDate {
  if (p.kind === "dia") return addLocalDays(p.anchor, dir);
  if (p.kind === "semana") return addLocalDays(p.anchor, 7 * dir);
  return addMonths(p.anchor, dir);
}
