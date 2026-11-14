import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** CAL-090: a chave service_role nunca pode chegar ao navegador. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

const SRC = path.join(process.cwd(), "src");
const all = files(SRC).filter((f) => !f.endsWith(".test.ts"));
const client = all.filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));

describe("segredos fora do navegador", () => {
  it("encontra os componentes cliente", () => {
    expect(client.length).toBeGreaterThan(10);
  });

  it("nenhum componente cliente importa o client service_role ou lê segredos", () => {
    const bad = client.filter((f) => {
      const s = readFileSync(f, "utf8");
      return (
        /supabase\/admin/.test(s) ||
        /SUPABASE_SERVICE_ROLE_KEY|WHATSAPP_ACCESS_TOKEN|CRON_SECRET|TURNSTILE_SECRET_KEY|WHATSAPP_APP_SECRET/.test(
          s,
        )
      );
    });
    expect(bad.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it("todo módulo que usa o client service_role é só do servidor", () => {
    const users = all.filter((f) => /supabase\/admin"/.test(readFileSync(f, "utf8")));
    const notServer = users.filter((f) => {
      const s = readFileSync(f, "utf8");
      return !/import "server-only"|["']use server["']|\/app\/api\/|route\.ts$|page\.tsx$|layout\.tsx$/.test(
        s + f,
      );
    });
    expect(notServer.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
