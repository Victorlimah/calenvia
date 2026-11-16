/**
 * M5 · Sprint 11: funções de métricas do dono (appointment_stats, customer_visit_stats,
 * finance_entry_stats, set_appointment_payment). Permissões por papel e desempenho.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { BIZ_A, OWNER_A, OWNER_B, actAs, connect, seedTwoBusinesses } from "./helpers";

const RECEPTION = "aaaaaaaa-0000-0000-0000-0000000000c3";
const STAFF = "aaaaaaaa-0000-0000-0000-0000000000c4";

let db: Client;
let staffMine: string;
let service: string;
let customer: string;

const FROM = "2029-12-01T00:00:00Z";
const TO = "2030-02-01T00:00:00Z";

beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});
beforeEach(async () => {
  await db.query("begin");
  await seedTwoBusinesses(db);
  for (const [id, email] of [
    [RECEPTION, "recep-m@teste.dev"],
    [STAFF, "prof-m@teste.dev"],
  ]) {
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email]);
  }
  const mine = await db.query(
    `insert into public.staff_members (business_id, name) values ($1, 'Minha') returning id`,
    [BIZ_A],
  );
  staffMine = mine.rows[0].id;
  await db.query(
    `insert into public.business_members (business_id, user_id, role, staff_member_id) values
       ($1, $2, 'reception', null), ($1, $3, 'staff', $4)`,
    [BIZ_A, RECEPTION, STAFF, staffMine],
  );
  service = (await db.query(`select id from public.services where business_id = $1`, [BIZ_A]))
    .rows[0].id;
  customer = (await db.query(`select id from public.customers where business_id = $1`, [BIZ_A]))
    .rows[0].id;
  // O seed tem 1 agendamento (confirmado, do "Pro") em 01/01/2030. Concluímos ele com R$ 40.
  await db.query(
    `update public.appointments set status = 'completed', price_cents = 4000 where business_id = $1`,
    [BIZ_A],
  );
  // Um concluído do profissional "Minha", R$ 25.
  await db.query(
    `insert into public.appointments (business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, customer_name, customer_whatsapp, status, price_cents)
     values ($1, $2, $3, $4, '2030-01-02 13:00Z', '2030-01-02 13:45Z', 'Cliente', '5585911110000', 'completed', 2500)`,
    [BIZ_A, customer, service, staffMine],
  );
  await db.query(
    `insert into public.finance_entries (business_id, kind, amount_cents, category, occurred_on)
     values ($1, 'expense', 1000, 'Aluguel', '2030-01-05')`,
    [BIZ_A],
  );
});
afterEach(async () => {
  await db.query("rollback");
});

const stats = async () =>
  (
    await db.query(
      `select staff_member_id, status, appointments, revenue_cents, minutes, day::text
         from public.appointment_stats($1, $2, $3) order by day`,
      [BIZ_A, FROM, TO],
    )
  ).rows;

describe("appointment_stats", () => {
  it("dono vê tudo com valores, agrupado por dia no fuso do negócio", async () => {
    await actAs(db, OWNER_A);
    const rows = await stats();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => Number(r.revenue_cents))).toEqual([4000, 2500]);
    expect(rows[1]).toMatchObject({ day: "2030-01-02", minutes: "45" });
  });

  it("recepção vê todos, mas sem valores", async () => {
    await actAs(db, RECEPTION);
    const rows = await stats();
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.revenue_cents === null)).toBe(true);
  });

  it("profissional vê só os próprios atendimentos, sem valores", async () => {
    await actAs(db, STAFF);
    const rows = await stats();
    expect(rows).toHaveLength(1);
    expect(rows[0].staff_member_id).toBe(staffMine);
    expect(rows[0].revenue_cents).toBeNull();
  });

  it("dono de outro negócio e anônimo não veem nada", async () => {
    await actAs(db, OWNER_B);
    expect(await stats()).toHaveLength(0);
    await db.query("reset role");
    await actAs(db, null);
    await expect(stats()).rejects.toThrow(/permission denied/);
  });
});

describe("customer_visit_stats e finance_entry_stats", () => {
  it("visitas concluídas por cliente, com o valor de cada uma só para quem vê o financeiro", async () => {
    await actAs(db, OWNER_A);
    const { rows } = await db.query(
      `select visit_days::text[] as days, visit_cents from public.customer_visit_stats($1)`,
      [BIZ_A],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].days).toEqual(["2030-01-01", "2030-01-02"]);
    expect(rows[0].visit_cents).toEqual([4000, 2500]);
    await db.query("reset role");
    await actAs(db, RECEPTION);
    const hidden = await db.query(`select visit_cents from public.customer_visit_stats($1)`, [
      BIZ_A,
    ]);
    expect(hidden.rows[0].visit_cents).toEqual([null, null]);
  });

  it("cliente avulso fica fora", async () => {
    const walkIn = await db.query(
      `insert into public.customers (business_id, name, whatsapp) values ($1, 'Avulso', '5500000000000') returning id`,
      [BIZ_A],
    );
    await db.query(
      `insert into public.appointments (business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, customer_name, customer_whatsapp, status, price_cents)
       values ($1, $2, $3, $4, '2030-01-03 13:00Z', '2030-01-03 13:30Z', 'X', '5500000000000', 'completed', 1000)`,
      [BIZ_A, walkIn.rows[0].id, service, staffMine],
    );
    await actAs(db, OWNER_A);
    const { rows } = await db.query(`select name from public.customer_visit_stats($1)`, [BIZ_A]);
    expect(rows.map((r) => r.name)).toEqual(["Cliente"]);
  });

  it("entradas e despesas só para quem vê o financeiro", async () => {
    await actAs(db, OWNER_A);
    const own = await db.query(
      `select * from public.finance_entry_stats($1, '2030-01-01', '2030-02-01')`,
      [BIZ_A],
    );
    expect(own.rows).toHaveLength(1);
    await db.query("reset role");
    await actAs(db, RECEPTION);
    const rec = await db.query(
      `select * from public.finance_entry_stats($1, '2030-01-01', '2030-02-01')`,
      [BIZ_A],
    );
    expect(rec.rows).toHaveLength(0);
  });
});

describe("set_appointment_payment (CAL-128)", () => {
  it("quem conclui informa a forma de pagamento; profissional só nos próprios", async () => {
    const other = (
      await db.query(
        `select id from public.appointments where business_id = $1 and staff_member_id <> $2`,
        [BIZ_A, staffMine],
      )
    ).rows[0].id;
    const mineAppt = (
      await db.query(`select id from public.appointments where staff_member_id = $1`, [staffMine])
    ).rows[0].id;
    await actAs(db, STAFF);
    await db.query(`select public.set_appointment_payment($1, 'pix')`, [mineAppt]);
    await db.query("savepoint s");
    await expect(
      db.query(`select public.set_appointment_payment($1, 'pix')`, [other]),
    ).rejects.toThrow(/forbidden/);
    await db.query("rollback to savepoint s");
    await expect(
      db.query(`select public.set_appointment_payment($1, 'cheque')`, [mineAppt]),
    ).rejects.toThrow(/invalid_method/);
    await db.query("rollback to savepoint s");
    await db.query("reset role");
    const r = await db.query(`select payment_method from public.appointments where id = $1`, [
      mineAppt,
    ]);
    expect(r.rows[0].payment_method).toBe("pix");
  });
});

describe("desempenho (CAL-123)", () => {
  it("agrega 5 mil agendamentos em menos de 1 s", async () => {
    await db.query(
      `insert into public.appointments (business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, customer_name, customer_whatsapp, status, price_cents)
       select $1, $2, $3, $4,
              timestamptz '2028-01-01 12:00Z' + (g * interval '61 minutes'),
              timestamptz '2028-01-01 12:30Z' + (g * interval '61 minutes'),
              'Cliente', '5585911110000',
              (array['completed','no_show','canceled','completed'])[1 + g % 4], 4000
         from generate_series(1, 5000) g`,
      [BIZ_A, customer, service, staffMine],
    );
    await actAs(db, OWNER_A);
    const t0 = performance.now();
    await db.query(`select * from public.appointment_stats($1, '2027-12-01', '2028-12-31')`, [
      BIZ_A,
    ]);
    await db.query(`select * from public.customer_visit_stats($1)`, [BIZ_A]);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(1000);
  });
});
