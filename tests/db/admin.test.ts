import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { BIZ_A, OWNER_A, actAs, connect, seedTwoBusinesses } from "./helpers";

// CAL-114: as tabelas da administração só são lidas e gravadas pelo servidor (service role).
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

async function expectDenied(sql: string, params: unknown[] = []) {
  await db.query("savepoint denied");
  await expect(db.query(sql, params)).rejects.toThrow(/row-level security|permission denied/);
  await db.query("rollback to savepoint denied");
}

describe("administração (CAL-114)", () => {
  it("dono não lê nem grava as tabelas da administração", async () => {
    await actAs(db, OWNER_A);
    for (const t of ["platform_admins", "admin_audit_log", "admin_business_notes"]) {
      await expectDenied(`select * from public.${t}`);
    }
    await expectDenied(`insert into public.platform_admins (user_id) values ($1)`, [OWNER_A]);
    await expectDenied(`insert into public.admin_business_notes (business_id) values ($1)`, [
      BIZ_A,
    ]);
  });

  it("dono e anônimo não chamam a lista de negócios da administração", async () => {
    await actAs(db, OWNER_A);
    await expectDenied(`select * from public.admin_business_list()`);
    await db.query("reset role");
    await db.query("set local role anon");
    await expectDenied(`select * from public.admin_business_list()`);
  });

  it("a lista filtra por busca e plano e traz o total", async () => {
    await db.query("reset role");
    const { rows } = await db.query(
      `select id, total_count, members from public.admin_business_list(null, null, null, 200, 0)`,
    );
    const a = rows.find((r) => r.id === BIZ_A);
    expect(a).toBeTruthy();
    expect(Number(a.total_count)).toBe(rows.length);
    const { rows: none } = await db.query(
      `select id from public.admin_business_list('nao-existe-nenhum-negocio-assim')`,
    );
    expect(none).toHaveLength(0);
  });

  it("dono e anônimo não chamam as métricas da administração", async () => {
    await actAs(db, OWNER_A);
    await expectDenied(`select * from public.admin_metrics_overview()`);
    await db.query("reset role");
    await db.query("set local role anon");
    await expectDenied(`select * from public.admin_metrics_overview()`);
  });

  it("as métricas somam os negócios e trazem 12 semanas", async () => {
    await db.query("reset role");
    const { rows: c } = await db.query(
      `select plan, plan_status, count(*)::int as n from public.businesses group by 1, 2`,
    );
    const { rows } = await db.query(`select * from public.admin_metrics_overview()`);
    const o = rows[0];
    const total = c.reduce((s, r) => s + r.n, 0);
    expect(Number(o.businesses_total)).toBe(total);
    for (const r of c) expect(o.by_plan_status[r.plan][r.plan_status]).toBe(r.n);
    expect(o.new_businesses_by_week).toHaveLength(12);
    const weekly = o.new_businesses_by_week.reduce(
      (s: number, w: { total: number }) => s + w.total,
      0,
    );
    expect(weekly).toBeLessThanOrEqual(total);
  });
});
