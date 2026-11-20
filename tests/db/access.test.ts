import { createClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { hashInviteToken, newInviteToken } from "@/lib/team/invitations";

/**
 * CAL-135: no modo convite (padrão) não existe caminho para criar conta sem convite.
 * Chama a action de cadastro de verdade, contra o Supabase local.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const ZE_BIZ = "0b000000-0000-4000-8000-000000000001";
const stamp = Date.now();
const emails: string[] = [];

let actions: typeof import("@/app/(painel)/painel/(auth)/actions");

async function userByEmail(email: string) {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email) ?? null;
}

beforeAll(async () => {
  actions = await import("@/app/(painel)/painel/(auth)/actions");
});

afterEach(() => {
  delete process.env.SIGNUP_MODE;
});

afterAll(async () => {
  for (const email of emails) {
    const u = await userByEmail(email);
    if (u) await db.auth.admin.deleteUser(u.id);
  }
  await db.from("business_invitations").delete().like("email", "acesso-%@calenvia.dev");
});

function input(email: string) {
  emails.push(email);
  return { name: "Teste Acesso", email, password: "senhaforte123" };
}

describe("cadastro no modo convite (padrão)", () => {
  it("sem convite: recusa no servidor e não cria a conta", async () => {
    const email = `acesso-livre-${stamp}@calenvia.dev`;
    const result = await actions.signUpAction(input(email), "pro");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/acesso por convite/);
    expect(await userByEmail(email)).toBeNull();
  });

  it("com link de convite adulterado ou inexistente: recusa", async () => {
    const email = `acesso-falso-${stamp}@calenvia.dev`;
    const result = await actions.signUpAction(
      input(email),
      undefined,
      undefined,
      `/convite/${newInviteToken()}`,
    );
    expect(result.ok).toBe(false);
    expect(await userByEmail(email)).toBeNull();
  });

  it("com convite da equipe válido: cria a conta e volta ao convite", async () => {
    const email = `acesso-equipe-${stamp}@calenvia.dev`;
    const token = newInviteToken();
    const { error } = await db.from("business_invitations").insert({
      business_id: ZE_BIZ,
      email,
      role: "reception",
      token_hash: hashInviteToken(token),
    });
    expect(error).toBeNull();
    const result = await actions.signUpAction(
      input(email),
      undefined,
      undefined,
      `/convite/${token}`,
    );
    expect(result).toEqual({ ok: true, data: { redirectTo: `/convite/${token}` } });
    expect(await userByEmail(email)).not.toBeNull();
  });

  it("convite com e-mail: outro e-mail é recusado", async () => {
    const token = newInviteToken();
    await db.from("business_invitations").insert({
      business_id: ZE_BIZ,
      email: `acesso-certo-${stamp}@calenvia.dev`,
      role: "reception",
      token_hash: hashInviteToken(token),
    });
    const other = `acesso-outro-${stamp}@calenvia.dev`;
    const result = await actions.signUpAction(
      input(other),
      undefined,
      undefined,
      `/convite/${token}`,
    );
    expect(result.ok).toBe(false);
    expect(await userByEmail(other)).toBeNull();
  });

  it("convite expirado não abre o cadastro", async () => {
    const token = newInviteToken();
    await db.from("business_invitations").insert({
      business_id: ZE_BIZ,
      email: `acesso-velho-${stamp}@calenvia.dev`,
      role: "reception",
      token_hash: hashInviteToken(token),
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    const email = `acesso-velho-${stamp}@calenvia.dev`;
    const result = await actions.signUpAction(
      input(email),
      undefined,
      undefined,
      `/convite/${token}`,
    );
    expect(result.ok).toBe(false);
    expect(await userByEmail(email)).toBeNull();
  });
});

describe("SIGNUP_MODE=open restaura o cadastro aberto", () => {
  it("cria a conta e leva ao onboarding", async () => {
    process.env.SIGNUP_MODE = "open";
    const email = `acesso-aberto-${stamp}@calenvia.dev`;
    const result = await actions.signUpAction(input(email), "pro");
    expect(result.ok).toBe(true);
    expect(await userByEmail(email)).not.toBeNull();
  });
});
