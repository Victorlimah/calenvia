import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { BIZ_A, BIZ_B, OWNER_A, actAs, connect, seedTwoBusinesses } from "./helpers";

// CAL-140: businesses.theme — o dono grava o próprio tema; JSON precisa ser objeto.
let db: Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});
beforeEach(async () => {
  await db.query("begin");
  await seedTwoBusinesses(db);
});
afterEach(async () => {
  await db.query("rollback");
});

const THEME = JSON.stringify({ version: 1, templateId: "delicado" });

describe("businesses.theme (CAL-140)", () => {
  it("começa vazio (padrão) e o dono grava o próprio tema", async () => {
    const before = await db.query(`select theme from public.businesses where id = $1`, [BIZ_A]);
    expect(before.rows[0].theme).toBeNull();
    await actAs(db, OWNER_A);
    const r = await db.query(`update public.businesses set theme = $1 where id = $2`, [
      THEME,
      BIZ_A,
    ]);
    expect(r.rowCount).toBe(1);
  });

  it("dono não muda o tema de outro negócio", async () => {
    await actAs(db, OWNER_A);
    const r = await db.query(`update public.businesses set theme = $1 where id = $2`, [
      THEME,
      BIZ_B,
    ]);
    expect(r.rowCount).toBe(0);
  });

  it("anônimo não grava tema", async () => {
    await actAs(db, null);
    await db.query("savepoint x");
    await expect(
      db.query(`update public.businesses set theme = $1 where id = $2`, [THEME, BIZ_A]),
    ).rejects.toThrow(/permission denied/);
    await db.query("rollback to savepoint x");
  });

  it("tema precisa ser um objeto", async () => {
    await db.query("savepoint x");
    await expect(
      db.query(`update public.businesses set theme = '[1,2]'::jsonb where id = $1`, [BIZ_A]),
    ).rejects.toThrow(/check constraint/);
    await db.query("rollback to savepoint x");
  });
});
