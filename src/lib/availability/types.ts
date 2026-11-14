import type { LocalDate } from "@/lib/dates";

export type WeekdayHours = {
  weekday: number; // 0 = domingo … 6 = sábado
  is_open: boolean;
  opens_at: string | null; // "HH:mm" ou "HH:mm:ss"
  closes_at: string | null;
};

export type WeekdayBreak = { weekday: number; starts_at: string; ends_at: string };

export type StaffAvailability = {
  id: string;
  name: string;
  serviceIds: string[];
  /** Horário próprio (staff_hours). Vazio/undefined = usa o do negócio. */
  hours?: WeekdayHours[];
};

export type BusyAppointment = {
  id?: string;
  staffId: string;
  start: Date;
  end: Date;
  status?: "confirmed" | "completed" | "no_show" | "canceled";
};

export type TimeBlock = {
  staffId: string | null; // null = vale para todos
  start: Date;
  end: Date;
};

export type AvailabilityContext = {
  timezone: string;
  slotIntervalMin: number;
  minNoticeMin: number;
  maxDaysAhead: number;
  businessHours: WeekdayHours[];
  breaks: WeekdayBreak[];
  staff: StaffAvailability[];
  appointments: BusyAppointment[];
  blocks: TimeBlock[];
  now: Date;
};

export type SlotQuery = {
  date: LocalDate;
  serviceId: string;
  durationMin: number;
  /** null = "Sem preferência" */
  staffId: string | null;
  /** Ignora este agendamento (remarcação). */
  excludeAppointmentId?: string;
};

export type Slot = {
  start: Date;
  end: Date;
  time: string; // "HH:mm" no fuso do negócio
  /** Profissionais aptos e livres neste horário. */
  staffIds: string[];
};

export type DayStatus =
  | "open" // tem horários
  | "full" // aberto, mas sem horários livres
  | "closed" // fechado (motivo `closed` da seção 5)
  | "past"
  | "too_far"
  | "no_staff"; // ninguém apto para o serviço

export type DayPeriod = "morning" | "afternoon" | "evening";

export type DaySlots = {
  date: LocalDate;
  status: DayStatus;
  slots: Slot[];
  groups: Record<DayPeriod, Slot[]>;
};

export const PERIOD_LABELS: Record<DayPeriod, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
};
