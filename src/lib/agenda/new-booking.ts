/** Texto do aviso de novo agendamento (CAL-064), a partir do evento do Realtime. */
import { formatDayLabel, formatTime } from "@/lib/dates";

export type BookingEvent = {
  id: string;
  source: string;
  status: string;
  customer_name: string;
  starts_at: string;
};

/** Só avisa o que o cliente agendou sozinho pela página (o manual foi o próprio dono). */
export function shouldNotify(e: Partial<BookingEvent>): e is BookingEvent {
  return e.source === "link" && e.status === "confirmed" && Boolean(e.id && e.starts_at);
}

export function newBookingText(e: BookingEvent, timezone: string, now = new Date()) {
  const start = new Date(e.starts_at);
  const day = formatDayLabel(start, timezone);
  const today = formatDayLabel(now, timezone) === day;
  return {
    title: "Novo agendamento",
    body: `${e.customer_name} · ${today ? "hoje" : day} às ${formatTime(start, timezone)}`,
  };
}
