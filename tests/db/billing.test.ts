import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { BIZ_A, BIZ_B, OWNER_A, actAs, connect, seedTwoBusinesses } from "./helpers";

// CAL-076 / CAL-115 (fase 1): tabelas da cobrança. Só o servidor grava; dono e gerente leem o
// próprio negócio; anônimo não vê nada.
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

/** Escrita negada: dá erro ou não altera nenhuma linha (RLS sem policy de escrita). */
async function expectNoWrite(sql: string, params: unknown[] = []) {
  await db.query("savepoint nowrite");
  const res = await db.query(sql, params).catch(() => null);
  expect(res === null || res.rowCount === 0).toBe(true);
  await db.query("rollback to savepoint nowrite");
}

async function addonId(code: string): Promise<string> {
  const { rows } = await db.query(`select id from public.billing_addons where code = $1`, [code]);
  return rows[0].id;
}

async function currentPriceOf(addon: string): Promise<string> {
  const { rows } = await db.query(
    `select id from public.billing_prices where addon_id = $1 and is_current`,
    [addon],
  );
  return rows[0].id;
}

async function planPrice(plan: string): Promise<string> {
  const { rows } = await db.query(
    `select id from public.billing_prices where product = 'plan' and plan = $1 and is_current`,
    [plan],
  );
  return rows[0].id;
}

/** Dados de cobrança para A e B (como service role). */
async function seedBilling() {
  const msgs = await addonId("extra_messages_100");
  for (const biz of [BIZ_A, BIZ_B]) {
    await db.query(
      `insert into public.subscriptions (business_id, plan, status, provider, price_id)
       values ($1, 'pro', 'active', 'mock', $2)`,
      [biz, await planPrice("pro")],
    );
    await db.query(
      `insert into public.business_addons (business_id, addon_id, price_id, quantity)
       values ($1, $2, $3, 1)`,
      [biz, msgs, await currentPriceOf(msgs)],
    );
    await db.query(
      `insert into public.invoices (business_id, provider, provider_invoice_id, amount_cents, status)
       values ($1, 'mock', $2, 5490, 'paid')`,
      [biz, `mock_in_${biz}`],
    );
  }
}

describe("cobrança: catálogo e preços", () => {
  it("seed: preço atual dos 3 planos e dos 2 extras", async () => {
    const { rows } = await db.query(`select * from public.current_prices()`);
    const plans = Object.fromEntries(
      rows.filter((r) => r.product === "plan").map((r) => [r.plan, r.amount_cents]),
    );
    expect(plans).toEqual({ basic: 2990, pro: 4490, pro_plus: 7490 });
    const addons = Object.fromEntries(
      rows.filter((r) => r.product === "addon").map((r) => [r.addon_code, r.amount_cents]),
    );
    expect(addons).toEqual({ extra_messages_100: 1000, extra_member_1: 500 });
  });

  it("um único preço atual por plano e por extra", async () => {
    await db.query("savepoint dup");
    await expect(
      db.query(
        `insert into public.billing_prices (product, plan, amount_cents) values ('plan', 'pro', 5000)`,
      ),
    ).rejects.toThrow(/duplicate key/);
    await db.query("rollback to savepoint dup");

    const msgs = await addonId("extra_messages_100");
    await expect(
      db.query(
        `insert into public.billing_prices (product, addon_id, amount_cents) values ('addon', $1, 1200)`,
        [msgs],
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it("preço novo: antigo deixa de ser atual e continua existindo", async () => {
    const old = await planPrice("pro");
    await db.query(`update public.billing_prices set is_current = false where id = $1`, [old]);
    await db.query(
      `insert into public.billing_prices (product, plan, amount_cents) values ('plan', 'pro', 4990)`,
    );
    const { rows } = await db.query(
      `select amount_cents from public.current_prices() where plan = 'pro'`,
    );
    expect(rows).toEqual([{ amount_cents: 4990 }]);
    const { rowCount } = await db.query(`select 1 from public.billing_prices where id = $1`, [old]);
    expect(rowCount).toBe(1);
  });

  it("preço é de plano ou de extra, nunca dos dois", async () => {
    const msgs = await addonId("extra_messages_100");
    await expect(
      db.query(
        `insert into public.billing_prices (product, plan, addon_id, amount_cents, is_current)
         values ('plan', 'pro', $1, 100, false)`,
        [msgs],
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("cobrança: RLS", () => {
  it("dono lê assinatura, extras e faturas só do próprio negócio", async () => {
    await seedBilling();
    await actAs(db, OWNER_A);
    for (const t of ["subscriptions", "business_addons", "invoices"]) {
      const { rows } = await db.query(`select business_id from public.${t}`);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.business_id === BIZ_A)).toBe(true);
    }
  });

  it("dono não lê catálogo/sessões/eventos direto, nem chama as funções", async () => {
    await actAs(db, OWNER_A);
    for (const t of ["billing_addons", "billing_prices", "checkout_sessions", "billing_events"]) {
      await expectDenied(`select * from public.${t}`);
    }
    await expectDenied(`select * from public.current_prices()`);
    await expectDenied(`select public.recompute_business_addons($1)`, [BIZ_A]);
  });

  it("dono não grava em nada da cobrança nem nas colunas de extras", async () => {
    await seedBilling();
    const msgs = await addonId("extra_messages_100");
    const price = await currentPriceOf(msgs);
    await actAs(db, OWNER_A);
    await expectDenied(
      `insert into public.business_addons (business_id, addon_id, price_id) values ($1, $2, $3)`,
      [BIZ_A, msgs, price],
    );
    await expectNoWrite(`update public.subscriptions set plan = 'pro_plus'`);
    await expectNoWrite(`update public.invoices set status = 'paid'`);
    await expectDenied(`update public.businesses set addon_messages = 9999 where id = $1`, [BIZ_A]);
    await expectDenied(`update public.businesses set addon_members = 99 where id = $1`, [BIZ_A]);
    await expectDenied(
      `insert into public.billing_events (provider, provider_event_id, type) values ('mock', 'x', 'y')`,
    );
  });

  it("anônimo não vê nada", async () => {
    await seedBilling();
    await actAs(db, null);
    for (const t of [
      "subscriptions",
      "business_addons",
      "invoices",
      "billing_addons",
      "billing_prices",
      "checkout_sessions",
      "billing_events",
    ]) {
      await db.query("savepoint anon");
      const res = await db.query(`select * from public.${t}`).catch(() => null);
      expect(res === null || res.rows.length === 0).toBe(true);
      await db.query("rollback to savepoint anon");
    }
  });
});

describe("cobrança: extras somam nos limites", () => {
  it("recompute_business_addons soma quantidade × unidade e ignora removidos e custom", async () => {
    const msgs = await addonId("extra_messages_100");
    const member = await addonId("extra_member_1");
    const custom = await addonId("custom");
    await db.query(
      `insert into public.business_addons (business_id, addon_id, price_id, quantity) values
       ($1, $2, $3, 3), ($1, $4, $5, 2)`,
      [BIZ_A, msgs, await currentPriceOf(msgs), member, await currentPriceOf(member)],
    );
    await db.query(
      `insert into public.business_addons (business_id, addon_id, is_custom, custom_amount_cents, custom_label)
       values ($1, $2, true, 2000, 'Treinamento'), ($1, $2, true, 1000, 'Outro')`,
      [BIZ_A, custom],
    );
    await db.query(`select public.recompute_business_addons($1)`, [BIZ_A]);
    let { rows } = await db.query(
      `select addon_messages, addon_members from public.businesses where id = $1`,
      [BIZ_A],
    );
    expect(rows[0]).toEqual({ addon_messages: 300, addon_members: 2 });

    await db.query(
      `update public.business_addons set removed_at = now() where business_id = $1 and addon_id = $2`,
      [BIZ_A, member],
    );
    await db.query(`select public.recompute_business_addons($1)`, [BIZ_A]);
    ({ rows } = await db.query(
      `select addon_messages, addon_members from public.businesses where id = $1`,
      [BIZ_A],
    ));
    expect(rows[0]).toEqual({ addon_messages: 300, addon_members: 0 });

    const b = await db.query(`select addon_messages from public.businesses where id = $1`, [BIZ_B]);
    expect(b.rows[0].addon_messages).toBe(0);
  });

  it("um extra de catálogo ativo por negócio; custom pode ter vários", async () => {
    const msgs = await addonId("extra_messages_100");
    const price = await currentPriceOf(msgs);
    await db.query(
      `insert into public.business_addons (business_id, addon_id, price_id) values ($1, $2, $3)`,
      [BIZ_A, msgs, price],
    );
    await expect(
      db.query(
        `insert into public.business_addons (business_id, addon_id, price_id) values ($1, $2, $3)`,
        [BIZ_A, msgs, price],
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it("uma assinatura não cancelada por negócio", async () => {
    const price = await planPrice("pro");
    await db.query(
      `insert into public.subscriptions (business_id, plan, status, provider, price_id)
       values ($1, 'pro', 'canceled', 'mock', $2), ($1, 'pro', 'active', 'mock', $2)`,
      [BIZ_A, price],
    );
    await expect(
      db.query(
        `insert into public.subscriptions (business_id, plan, status, provider, price_id)
         values ($1, 'pro', 'pending', 'mock', $2)`,
        [BIZ_A, price],
      ),
    ).rejects.toThrow(/duplicate key/);
  });
});
