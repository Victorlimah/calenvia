import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { BIZ_A, BIZ_B, OWNER_A, actAs, connect, seedTwoBusinesses } from "./helpers";

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

  it("suporte: dono lê a resposta do próprio pedido, não lê a de outro negócio e não grava", async () => {
    await db.query("reset role");
    const { rows } = await db.query(
      `insert into public.support_requests (business_id, topic, message, status, admin_reply)
       values ($1, 'agenda', 'Pedido do negócio A para teste', 'answered', 'Resposta da equipe'),
              ($2, 'agenda', 'Pedido do negócio B para teste', 'answered', 'Resposta secreta B')
       returning id, business_id`,
      [BIZ_A, BIZ_B],
    );
    const reqB = rows.find((r) => r.business_id === BIZ_B).id;
    await actAs(db, OWNER_A);
    const { rows: seen } = await db.query(
      `select business_id, admin_reply from public.support_requests`,
    );
    expect(seen).toEqual([{ business_id: BIZ_A, admin_reply: "Resposta da equipe" }]);
    await expectDenied(
      `update public.support_requests set admin_reply = 'x' where business_id = $1`,
      [BIZ_A],
    );
    const { rowCount } = await db.query(`select 1 from public.support_requests where id = $1`, [
      reqB,
    ]);
    expect(rowCount).toBe(0);
  });

  it("dono e anônimo não chamam o resumo de falhas", async () => {
    await actAs(db, OWNER_A);
    await expectDenied(`select * from public.admin_message_failures_summary(now())`);
    await db.query("reset role");
    await db.query("set local role anon");
    await expectDenied(`select * from public.admin_message_failures_summary(now())`);
  });

  it("resumo de falhas agrupa os erros", async () => {
    await db.query("reset role");
    await db.query(
      `insert into public.messages (business_id, type, to_number, template, status, error)
       values ($1, 'confirmation', '5585999990001', 't', 'failed', 'Erro X de teste'),
              ($1, 'reminder', '5585999990002', 't', 'failed', 'Erro X de teste'),
              ($2, 'reminder', '5585999990003', 't', 'failed', 'Erro Y de teste')`,
      [BIZ_A, BIZ_B],
    );
    const { rows } = await db.query(
      `select error, total from public.admin_message_failures_summary(now() - interval '1 hour', $1)`,
      [BIZ_A],
    );
    expect(rows.find((r) => r.error === "Erro X de teste")?.total).toBe("2");
    expect(rows.find((r) => r.error === "Erro Y de teste")).toBeUndefined();
  });
});
