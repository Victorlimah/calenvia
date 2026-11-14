/**
 * Monitoramento de erros (CAL-029), sem dependências externas.
 * Todo erro vira uma linha JSON no log (a Vercel guarda e permite buscar/alertar) e,
 * se ERROR_WEBHOOK_URL estiver definida, é enviado para lá (Slack, Discord, etc.).
 * Para usar Sentry no futuro, basta trocar o corpo de reportError().
 */
export type ErrorContext = {
  source: "server" | "client" | "action" | "cron" | "webhook";
  path?: string;
  digest?: string;
  extra?: Record<string, unknown>;
};

export type ErrorReport = {
  level: "error";
  time: string;
  source: ErrorContext["source"];
  message: string;
  name?: string;
  stack?: string;
  path?: string;
  digest?: string;
  extra?: Record<string, unknown>;
};

const SECRET_KEYS = /token|secret|password|senha|authorization|cookie|key/i;
const PHONE = /\b55\d{10,11}\b/g;

/** Remove segredos e mascara telefones antes de registrar (LGPD). */
export function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[…]";
  if (typeof value === "string")
    return value.replace(PHONE, (m) => `${m.slice(0, 4)}*******${m.slice(-2)}`);
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SECRET_KEYS.test(k) ? "[oculto]" : scrub(v, depth + 1),
      ]),
    );
  }
  return value;
}

export function buildErrorReport(error: unknown, ctx: ErrorContext, now = new Date()): ErrorReport {
  const e =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Erro desconhecido");
  return {
    level: "error",
    time: now.toISOString(),
    source: ctx.source,
    message: scrub(e.message.slice(0, 1000)) as string,
    name: e.name,
    stack: e.stack ? (scrub(e.stack.split("\n").slice(0, 15).join("\n")) as string) : undefined,
    path: ctx.path,
    digest: ctx.digest,
    extra: ctx.extra ? (scrub(ctx.extra) as Record<string, unknown>) : undefined,
  };
}

export async function reportError(error: unknown, ctx: ErrorContext): Promise<void> {
  const report = buildErrorReport(error, ctx);
  console.error(JSON.stringify(report));
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `⚠️ Calenvia [${report.source}] ${report.message}${report.path ? ` (${report.path})` : ""}`,
        report,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // o monitoramento nunca pode derrubar a requisição
  }
}
