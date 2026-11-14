/** Gera um arquivo .ics (iCalendar) para "Adicionar ao calendário". */

function esc(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function stamp(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Quebra linhas longas (máx. 75 octetos, RFC 5545). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export type IcsEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string | null;
  start: Date;
  end: Date;
  /** Lembrete antes do evento, em minutos (null = sem lembrete). */
  alarmMin?: number | null;
  status?: "CONFIRMED" | "CANCELLED";
};

function vevent(e: IcsEvent, now: Date): string[] {
  const alarm = e.alarmMin === undefined ? 60 : e.alarmMin;
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
    ...(e.status ? [`STATUS:${e.status}`] : []),
    ...(alarm !== null
      ? [
          "BEGIN:VALARM",
          `TRIGGER:-PT${alarm}M`,
          "ACTION:DISPLAY",
          "DESCRIPTION:Lembrete",
          "END:VALARM",
        ]
      : []),
    "END:VEVENT",
  ];
}

/** Calendário com vários eventos (feed para assinar no Google Agenda, CAL-107). */
export function buildIcsCalendar(
  events: IcsEvent[],
  opts: { name?: string; now?: Date; refreshMinutes?: number } = {},
): string {
  const now = opts.now ?? new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Calenvia//Agendamento//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(opts.name ? [`X-WR-CALNAME:${esc(opts.name)}`, "X-WR-TIMEZONE:America/Sao_Paulo"] : []),
    ...(opts.refreshMinutes
      ? [
          `REFRESH-INTERVAL;VALUE=DURATION:PT${opts.refreshMinutes}M`,
          `X-PUBLISHED-TTL:PT${opts.refreshMinutes}M`,
        ]
      : []),
    ...events.flatMap((e) => vevent(e, now)),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Um evento só ("Adicionar ao calendário" da confirmação). */
export function buildIcs(event: IcsEvent & { now?: Date }): string {
  return buildIcsCalendar([event], { now: event.now });
}
