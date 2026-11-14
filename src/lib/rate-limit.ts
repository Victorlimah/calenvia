import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Limite de requisições por IP (CAL-089), guardado no Postgres (sem serviço externo).
 * O IP vira um hash com sal antes de ir para o banco.
 */
export const RATE_LIMITS = {
  book: [
    { limit: 5, windowSeconds: 10 * 60 },
    { limit: 20, windowSeconds: 24 * 60 * 60 },
  ],
  availability: [{ limit: 120, windowSeconds: 60 }],
  manage: [{ limit: 10, windowSeconds: 10 * 60 }],
  lookup: [{ limit: 40, windowSeconds: 10 * 60 }],
  beacon: [{ limit: 30, windowSeconds: 60 }],
} as const;

export type RateAction = keyof typeof RATE_LIMITS;

export const RATE_LIMIT_MESSAGE =
  "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";

export function hashKey(action: string, ip: string, salt: string): string {
  return `${action}:${createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32)}`;
}

/** IP do visitante (Vercel/proxy: primeiro da lista x-forwarded-for). */
export function clientIp(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
}

function isLoopback(ip: string) {
  return ip === "unknown" || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("::ffff:127.");
}

/**
 * true = pode seguir. Em desenvolvimento, chamadas locais não são limitadas
 * (os testes ponta a ponta fazem muitas), a menos que RATE_LIMIT_LOCAL=1.
 * Se o banco falhar, deixa passar (melhor aceitar um agendamento que derrubar a página).
 */
export async function checkRateLimit(action: RateAction, ip?: string): Promise<boolean> {
  const addr = ip ?? clientIp(await headers());
  if (isLoopback(addr) && process.env.RATE_LIMIT_LOCAL !== "1") return true;
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.CRON_SECRET ?? "calenvia";
  const db = createSupabaseAdminClient();
  for (const rule of RATE_LIMITS[action]) {
    const { data, error } = await db.rpc("hit_rate_limit", {
      p_key: `${hashKey(action, addr, salt)}:${rule.windowSeconds}`,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.warn("[rate-limit]", error.message);
      return true;
    }
    if (data === false) return false;
  }
  return true;
}
