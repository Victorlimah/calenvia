/**
 * Chaves de modo do produto (CAL-135). Leitura centralizada: nenhum outro arquivo lê
 * `SIGNUP_MODE` ou `BILLING_ENABLED` direto do `process.env`.
 *
 * - `SIGNUP_MODE=invite` (padrão): ninguém cria conta sozinho. Contas nascem de um convite do
 *   /admin (dono) ou de um convite da equipe (CAL-112).
 * - `BILLING_ENABLED=false` (padrão): sem checkout, sem faixas de cobrança; o código de cobrança
 *   (src/lib/billing, checkout, Stripe) continua no repositório, só desligado.
 */

export type SignupMode = "invite" | "open";

/** Valor da variável → modo. Qualquer coisa diferente de "open" é convite (o mais seguro). */
export function parseSignupMode(value: string | undefined): SignupMode {
  return value?.trim().toLowerCase() === "open" ? "open" : "invite";
}

/** Valor da variável → cobrança ligada? Só "true" (ou "1") liga. */
export function parseBillingEnabled(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "true" || v === "1";
}

export function signupMode(value: string | undefined = process.env.SIGNUP_MODE): SignupMode {
  return parseSignupMode(value);
}

/** Cadastro só por convite? */
export function isInviteOnly(value: string | undefined = process.env.SIGNUP_MODE): boolean {
  return signupMode(value) === "invite";
}

/** Cobrança (checkout, faixas, cobrança no /admin) ligada? */
export function isBillingEnabled(value: string | undefined = process.env.BILLING_ENABLED): boolean {
  return parseBillingEnabled(value);
}

/** Mensagem única para quem tenta criar conta sem convite. */
export const INVITE_ONLY_MESSAGE =
  "A Calenvia está em acesso por convite. Peça seu acesso pelo WhatsApp ou entre se já tem convite.";

/**
 * Pode criar conta pela tela de cadastro? No modo convite, só quem chega pelo link de um
 * convite da equipe ainda válido (o servidor confere o token antes de chamar esta função).
 */
export function canSelfSignUp(mode: SignupMode, hasValidTeamInvite: boolean): boolean {
  return mode === "open" || hasValidTeamInvite;
}

/**
 * O onboarding pode criar um negócio novo? No modo convite, não: o negócio do dono convidado
 * já vem criado pelo /admin.
 */
export function canCreateBusinessInOnboarding(mode: SignupMode): boolean {
  return mode === "open";
}

/** Janela em que uma conta recém-criada pelo Google ainda é considerada "nova" no retorno. */
export const NEW_OAUTH_USER_WINDOW_MS = 10 * 60 * 1000;

/**
 * Retorno do Google no modo convite: uma conta que acabou de nascer, sem nenhum negócio e sem
 * convite da equipe válido, é apagada (não existe cadastro aberto pelo Google).
 */
export function shouldRejectOAuthSignup(input: {
  mode: SignupMode;
  userCreatedAt: string | Date | null | undefined;
  hasAnyMembership: boolean;
  hasValidTeamInvite: boolean;
  now?: Date;
}): boolean {
  if (input.mode === "open") return false;
  if (input.hasAnyMembership || input.hasValidTeamInvite) return false;
  if (!input.userCreatedAt) return false;
  const created = new Date(input.userCreatedAt).getTime();
  if (Number.isNaN(created)) return false;
  const now = (input.now ?? new Date()).getTime();
  return now - created <= NEW_OAUTH_USER_WINDOW_MS;
}

/** Extrai o token de um caminho `/convite/{token}` (ou null). */
export function inviteTokenFromPath(path: string | null | undefined): string | null {
  const m = /^\/convite\/([A-Za-z0-9_-]{20,100})(?:[/?#]|$)/.exec(path ?? "");
  return m?.[1] ?? null;
}
