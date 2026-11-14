import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { BIZ_A, BIZ_B, OWNER_A, OWNER_B, actAs, connect, seedTwoBusinesses } from "./helpers";

const TENANT_TABLES = [
  "services",
  "staff_members",
  "customers",
  "appointments",
  "messages",
  "message_usage",
] as const;

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

/** Roda a query num savepoint e espera que o Postgres negue o acesso. */
async function expectDenied(sql: string, params: unknown[] = []) {
  await db.query("savepoint denied");
  await expect(db.query(sql, params)).rejects.toThrow(/row-level security|permission denied/);
  await db.query("rollback to savepoint denied");
}

describe("RLS: dono só vê o próprio negócio", () => {
  it("lista apenas o próprio negócio", async () => {
    await actAs(db, OWNER_A);
    const { rows } = await db.query("select id from public.businesses");
    expect(rows.map((r) => r.id)).toEqual([BIZ_A]);
  });

  it.each(TENANT_TABLES)("em %s, só enxerga linhas do próprio negócio", async (table) => {
    await actAs(db, OWNER_A);
    const { rows } = await db.query(`select distinct business_id from public.${table}`);
    expect(rows.map((r) => r.business_id)).toEqual([BIZ_A]);
  });

  it("não consegue criar serviço no negócio de outro", async () => {
    await actAs(db, OWNER_A);
    await expectDenied(
      `insert into public.services (business_id, name, duration_min) values ($1, 'X', 30)`,
      [BIZ_B],
    );
  });

  it("cria serviço no próprio negócio", async () => {
    await actAs(db, OWNER_A);
    const { rowCount } = await db.query(
      `insert into public.services (business_id, name, duration_min) values ($1, 'Barba', 20)`,
      [BIZ_A],
    );
    expect(rowCount).toBe(1);
  });

  it("update e delete em dados de outro negócio não afetam nada", async () => {
    await actAs(db, OWNER_A);
    const upd = await db.query(`update public.services set name = 'hack' where business_id = $1`, [
      BIZ_B,
    ]);
    const del = await db.query(`delete from public.customers where business_id = $1`, [BIZ_B]);
    expect(upd.rowCount).toBe(0);
    expect(del.rowCount).toBe(0);
  });

  it("não consegue mover um registro próprio para o negócio de outro", async () => {
    await actAs(db, OWNER_A);
    await db.query(
      `insert into public.time_blocks (business_id, starts_at, ends_at) values ($1, now(), now() + interval '1 hour')`,
      [BIZ_A],
    );
    await expectDenied(`update public.time_blocks set business_id = $2 where business_id = $1`, [
      BIZ_A,
      BIZ_B,
    ]);
  });

  it("não consegue criar negócio em nome de outro usuário", async () => {
    await actAs(db, OWNER_A);
    await expectDenied(
      `insert into public.businesses (owner_id, slug, name) values ($1, 'outro-negocio', 'Outro')`,
      [OWNER_B],
    );
  });

  it("não consegue mudar o próprio plano", async () => {
    await actAs(db, OWNER_A);
    await expectDenied(`update public.businesses set plan = 'pro_plus' where id = $1`, [BIZ_A]);
    await expectDenied(`update public.businesses set plan_status = 'active' where id = $1`, [
      BIZ_A,
    ]);
  });

  it("pode editar dados do próprio negócio", async () => {
    await actAs(db, OWNER_A);
    const { rowCount } = await db.query(
      `update public.businesses set name = 'Novo nome' where id = $1`,
      [BIZ_A],
    );
    expect(rowCount).toBe(1);
  });

  it("não escreve em messages nem message_usage (só o servidor)", async () => {
    await actAs(db, OWNER_A);
    await expectDenied(
      `insert into public.messages (business_id, type, to_number, template) values ($1, 'reminder', '5585911110000', 'x')`,
      [BIZ_A],
    );
    await expectDenied(
      `insert into public.message_usage (business_id, period) values ($1, '2030-02')`,
      [BIZ_A],
    );
  });

  it("não pode chamar increment_message_usage", async () => {
    await actAs(db, OWNER_A);
    await expectDenied(`select public.increment_message_usage($1, '2030-01')`, [BIZ_A]);
  });

  it("horário próprio: salva no próprio profissional, nunca no de outro negócio", async () => {
    const days = JSON.stringify(
      Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        is_open: weekday !== 0,
        opens_at: "10:00",
        closes_at: "16:00",
      })),
    );
    const { rows: own } = await db.query(
      `select id from public.staff_members where business_id = $1`,
      [BIZ_A],
    );
    const { rows: other } = await db.query(
      `select id from public.staff_members where business_id = $1`,
      [BIZ_B],
    );
    await actAs(db, OWNER_A);
    await db.query(`select public.save_staff_hours($1, $2::jsonb)`, [own[0].id, days]);
    const { rows } = await db.query(
      `select count(*)::int as n from public.staff_hours where staff_member_id = $1`,
      [own[0].id],
    );
    expect(rows[0].n).toBe(7);
    await db.query("savepoint denied");
    await expect(
      db.query(`select public.save_staff_hours($1, $2::jsonb)`, [other[0].id, days]),
    ).rejects.toThrow(/not allowed/);
    await db.query("rollback to savepoint denied");
  });
});

describe("Lista de clientes (CAL-063)", () => {
  it("customer_summaries só mostra os clientes do próprio negócio, com os números", async () => {
    await db.query(
      `update public.appointments set status = 'completed', price_cents = 5000 where business_id = $1`,
      [BIZ_A],
    );
    await actAs(db, OWNER_A);
    const { rows } = await db.query(
      `select business_id, visits, no_shows, total_spent_cents from public.customer_summaries`,
    );
    expect(rows).toEqual([{ business_id: BIZ_A, visits: 1, no_shows: 0, total_spent_cents: 5000 }]);
  });

  it("visitante anônimo não lê a lista", async () => {
    await actAs(db, null);
    await expectDenied(`select * from public.customer_summaries`);
  });
});

describe("LGPD: apagar dados do cliente (CAL-091)", () => {
  it("anonimiza cliente e agendamentos, cancela futuros, mantém valores", async () => {
    const { rows: c } = await db.query(
      `select id, whatsapp from public.customers where business_id = $1`,
      [BIZ_A],
    );
    await db.query(`update public.appointments set price_cents = 4000 where business_id = $1`, [
      BIZ_A,
    ]);
    await actAs(db, OWNER_A);
    await db.query(`select public.erase_customer($1)`, [c[0].id]);
    const { rows: after } = await db.query(
      `select name, whatsapp, erased_at is not null as erased from public.customers where id = $1`,
      [c[0].id],
    );
    expect(after[0]).toMatchObject({ name: "Cliente removido", erased: true });
    expect(after[0].whatsapp).toMatch(/^5500\d{9}$/);
    const { rows: appts } = await db.query(
      `select customer_name, customer_whatsapp, notes, status, price_cents
       from public.appointments where customer_id = $1`,
      [c[0].id],
    );
    expect(appts[0]).toMatchObject({
      customer_name: "Cliente removido",
      customer_whatsapp: after[0].whatsapp,
      notes: null,
      status: "canceled", // era futuro (2030)
      price_cents: 4000,
    });
    expect(JSON.stringify(appts)).not.toContain(c[0].whatsapp);
  });

  it("não apaga cliente de outro negócio", async () => {
    const { rows } = await db.query(`select id from public.customers where business_id = $1`, [
      BIZ_B,
    ]);
    await actAs(db, OWNER_A);
    await db.query("savepoint denied");
    await expect(db.query(`select public.erase_customer($1)`, [rows[0].id])).rejects.toThrow(
      /not allowed/,
    );
    await db.query("rollback to savepoint denied");
  });
});

describe("Pacotes (CAL-105)", () => {
  async function setup() {
    const {
      rows: [appt],
    } = await db.query(
      `select id, customer_id, service_id from public.appointments where business_id = $1 limit 1`,
      [BIZ_A],
    );
    const {
      rows: [pkg],
    } = await db.query(
      `insert into public.service_packages (business_id, service_id, name, sessions, price_cents)
       values ($1, $2, 'Pacote 2', 2, 7000) returning id`,
      [BIZ_A, appt.service_id],
    );
    const {
      rows: [cp],
    } = await db.query(
      `insert into public.customer_packages
         (business_id, customer_id, package_id, service_id, name, sessions_total, price_cents)
       values ($1, $2, $3, $4, 'Pacote 2', 2, 7000) returning id`,
      [BIZ_A, appt.customer_id, pkg.id, appt.service_id],
    );
    return { appt, cp };
  }

  it("desconta uma sessão, zera o valor do agendamento e não desconta duas vezes", async () => {
    const { appt, cp } = await setup();
    await actAs(db, OWNER_A);
    const { rows } = await db.query(`select public.use_package_session($1, $2) as left`, [
      cp.id,
      appt.id,
    ]);
    expect(rows[0].left).toBe(1);
    const { rows: a } = await db.query(
      `select price_cents from public.appointments where id = $1`,
      [appt.id],
    );
    expect(a[0].price_cents).toBe(0);
    await db.query("savepoint denied");
    await expect(
      db.query(`select public.use_package_session($1, $2)`, [cp.id, appt.id]),
    ).rejects.toThrow(/duplicate key/);
    await db.query("rollback to savepoint denied");
  });

  it("dono de outro negócio não usa o pacote", async () => {
    const { appt, cp } = await setup();
    await actAs(db, OWNER_B);
    await db.query("savepoint denied");
    await expect(
      db.query(`select public.use_package_session($1, $2)`, [cp.id, appt.id]),
    ).rejects.toThrow(/not_found/);
    await db.query("rollback to savepoint denied");
  });
});

describe("RLS: visitante anônimo", () => {
  it.each(["businesses", ...TENANT_TABLES])("não lê %s", async (table) => {
    await actAs(db, null);
    await expectDenied(`select * from public.${table}`);
  });
});

describe("RLS: imagens no Storage", () => {
  it("dono só pode gravar na pasta do próprio negócio", async () => {
    await actAs(db, OWNER_A);
    const own = await db.query(`select public.owns_media_path($1) as ok`, [`${BIZ_A}/logo/x.webp`]);
    const other = await db.query(`select public.owns_media_path($1) as ok`, [
      `${BIZ_B}/logo/x.webp`,
    ]);
    const junk = await db.query(`select public.owns_media_path('qualquer/coisa.webp') as ok`);
    expect(own.rows[0].ok).toBe(true);
    expect(other.rows[0].ok).toBe(false);
    expect(junk.rows[0].ok).toBe(false);
  });

  it("não envia arquivo para a pasta de outro negócio", async () => {
    await actAs(db, OWNER_A);
    await expectDenied(
      `insert into storage.objects (bucket_id, name, owner) values ('business-media', $1, $2)`,
      [`${BIZ_B}/logo/x.webp`, OWNER_A],
    );
  });

  it("galeria de fotos isolada por negócio", async () => {
    await actAs(db, OWNER_A);
    await expectDenied(`insert into public.business_photos (business_id, url) values ($1, 'x')`, [
      BIZ_B,
    ]);
  });
});
