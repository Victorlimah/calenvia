import "server-only";

/**
 * Captcha invisível opcional (Cloudflare Turnstile, gratuito) no agendamento público (CAL-089).
 * Só é exigido quando TURNSTILE_SECRET_KEY e NEXT_PUBLIC_TURNSTILE_SITE_KEY estão definidas.
 */
export function captchaEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export async function verifyCaptcha(
  token: string | null | undefined,
  ip: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!captchaEnabled()) return true;
  if (!token) return false;
  try {
    const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY!,
        response: token,
        remoteip: ip,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const body = (await res.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    // Cloudflare fora do ar: não bloqueia o cliente (o limite por IP continua valendo).
    return true;
  }
}
