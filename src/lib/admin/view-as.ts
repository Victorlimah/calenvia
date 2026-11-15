/**
 * "Ver como o cliente" (CAL-114, fase 4): abas da visão só de leitura e a regra do histórico.
 * Funções puras, testadas em view-as.test.ts.
 */

export const VIEW_AS_PAGES = [
  { slug: "agenda", path: "", label: "Agenda" },
  { slug: "clientes", path: "/clientes", label: "Clientes" },
  { slug: "servicos", path: "/servicos", label: "Serviços e profissionais" },
  { slug: "horarios", path: "/horarios", label: "Horários" },
  { slug: "equipe", path: "/equipe", label: "Equipe e convites" },
  { slug: "mensagens", path: "/mensagens", label: "Mensagens" },
  { slug: "ajustes", path: "/ajustes", label: "Ajustes" },
] as const;

export type ViewAsPage = (typeof VIEW_AS_PAGES)[number]["slug"];

export const VIEW_AS_LOG_WINDOW_MIN = 10;

/**
 * Grava um novo "view_as" no histórico? No máximo um por admin, negócio e página a cada
 * 10 minutos: recarregar a página não enche o histórico.
 * `lastLoggedAt` é o último registro dessa combinação (ou null se nunca houve).
 */
export function shouldLogView(
  lastLoggedAt: string | Date | null | undefined,
  now: Date = new Date(),
  windowMin: number = VIEW_AS_LOG_WINDOW_MIN,
): boolean {
  if (!lastLoggedAt) return true;
  const last = new Date(lastLoggedAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= windowMin * 60 * 1000;
}

export function viewAsPageLabel(slug: unknown): string {
  return VIEW_AS_PAGES.find((p) => p.slug === slug)?.label.toLowerCase() ?? String(slug);
}
