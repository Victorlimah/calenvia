import { timingSafeEqual } from "node:crypto";

/** O Vercel Cron envia `Authorization: Bearer <CRON_SECRET>`. Sem segredo configurado, nega. */
export function isCronAuthorized(
  authorization: string | null,
  secret: string | undefined = process.env.CRON_SECRET,
): boolean {
  if (!secret) return false;
  const got = Buffer.from(authorization ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
