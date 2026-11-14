/** Pacotes de serviços (CAL-105). */
export type CustomerPackage = {
  id: string;
  name: string;
  service_id: string;
  sessions_total: number;
  sessions_used: number;
  expires_at: string | null;
};

export type PackageState = "active" | "expired" | "used_up";

export function packageState(p: CustomerPackage, now: Date = new Date()): PackageState {
  if (p.sessions_used >= p.sessions_total) return "used_up";
  if (p.expires_at && new Date(p.expires_at) < now) return "expired";
  return "active";
}

export function remainingSessions(p: CustomerPackage): number {
  return Math.max(0, p.sessions_total - p.sessions_used);
}

/** Pacote ativo do cliente que serve para este serviço (o que vence primeiro). */
export function usablePackage(
  list: CustomerPackage[],
  serviceId: string,
  now: Date = new Date(),
): CustomerPackage | null {
  return (
    list
      .filter((p) => p.service_id === serviceId && packageState(p, now) === "active")
      .sort((a, b) => (a.expires_at ?? "9999").localeCompare(b.expires_at ?? "9999"))[0] ?? null
  );
}

export function expiresAt(soldAt: Date, validityDays: number | null): string | null {
  return validityDays ? new Date(soldAt.getTime() + validityDays * 86400000).toISOString() : null;
}

/** Preço por sessão e economia em relação ao avulso. */
export function packageSavings(pricePerServiceCents: number, sessions: number, priceCents: number) {
  const full = pricePerServiceCents * sessions;
  return {
    perSessionCents: Math.round(priceCents / sessions),
    savingsCents: Math.max(0, full - priceCents),
  };
}

export const PACKAGE_ERRORS: Record<string, string> = {
  mismatch: "Esse pacote é de outro cliente ou serviço.",
  canceled: "O agendamento está cancelado.",
  expired: "O pacote venceu.",
  used_up: "O pacote não tem mais sessões.",
  duplicate: "Este agendamento já foi descontado de um pacote.",
};
