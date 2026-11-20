// CAL-152: o tema gravado no supabase/seed.sql precisa seguir o contrato (Zod).
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { themeSchema } from "@/lib/themes/schema";
it("tema do seed é válido", () => {
  const sql = readFileSync("supabase/seed.sql", "utf8");
  const json = sql.slice(sql.lastIndexOf("set theme = '") + 13, sql.lastIndexOf("'::jsonb"));
  const r = themeSchema.safeParse(JSON.parse(json));
  expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
});
