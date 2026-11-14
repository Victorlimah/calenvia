/**
 * CAL-112: RLS por papel. Para cada papel, o que pode e o que NÃO pode, direto no banco
 * (como a API do Supabase faria com o token da pessoa).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { BIZ_A, BIZ_B, OWNER_A, actAs, connect, seedTwoBusinesses } from "./helpers";

const MANAGER = "aaaaaaaa-0000-0000-0000-0000000000a2";
const RECEPTION = "aaaaaaaa-0000-0000-0000-0000000000a3";
const STAFF = "aaaaaaaa-0000-0000-0000-0000000000a4";

let db: Client;
let staffMine: string; // cadastro de profissional ligado ao login STAFF
let staffOther: string; // o "Pro" do seed (outro profissional)
let apptMine: string;
let apptOther: string;
let customerOther: string;

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
    [MANAGER, "gerente@teste.dev"],
    [RECEPTION, "recepcao@teste.dev"],
    [STAFF, "prof@teste.dev"],
  ]) {
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email]);
  }
  const other = await db.query(
    `select id from public.staff_members where business_id = $1 limit 1`,
    [BIZ_A],
  );
  staffOther = other.rows[0].id;
  const mine = await db.query(
    `insert into public.staff_members (business_id, name) values ($1, 'Minha') returning id`,
    [BIZ_A],
  );
  staffMine = mine.rows[0].id;
  await db.query(
    `insert into public.business_members (business_id, user_id, role, staff_member_id) values
       ($1, $2, 'manager', null), ($1, $3, 'reception', null), ($1, $4, 'staff', $5)`,
    [BIZ_A, MANAGER, RECEPTION, STAFF, staffMine],
  );
  const a = await db.query(
    `select id, customer_id, service_id from public.appointments where business_id = $1`,
    [BIZ_A],
  );
  apptOther = a.rows[0].id;
  customerOther = a.rows[0].customer_id;
  await db.query(`update public.appointments set price_cents = 4000 where id = $1`, [apptOther]);
  const myCustomer = await db.query(
    `insert into public.customers (business_id, name, whatsapp) values ($1, 'Meu', '5585933330000') returning id`,
    [BIZ_A],
  );
  const mineAppt = await db.query(
    `insert into public.appointments (business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, customer_name, customer_whatsapp, price_cents)
     values ($1, $2, $3, $4, '2030-01-02 13:00Z', '2030-01-02 13:30Z', 'Meu', '5585933330000', 5000) returning id`,
    [BIZ_A, myCustomer.rows[0].id, a.rows[0].service_id, staffMine],
  );
  apptMine = mineAppt.rows[0].id;
});
afterEach(async () => {
  await db.query("rollback");
});

async function denied(sql: string, params: unknown[] = []) {
  await db.query("savepoint d");
  await expect(db.query(sql, params)).rejects.toThrow(
    /row-level security|permission denied|not allowed|owner cannot/,
  );
  await db.query("rollback to savepoint d");
}

/** UPDATE/DELETE que a RLS filtra: não dá erro, só não afeta nenhuma linha. */
async function affects(sql: string, params: unknown[] = []) {
  return (await db.query(sql, params)).rowCount ?? 0;
}

describe("membros e dono (CAL-112)", () => {
  it("todo negócio tem o dono como membro owner", async () => {
    const { rows } = await db.query(
      `select business_id, role from public.business_members
       where role = 'owner' and business_id = any($1) order by business_id`,
      [[BIZ_A, BIZ_B]],
    );
    expect(rows).toEqual([
      { business_id: BIZ_A, role: "owner" },
      { business_id: BIZ_B, role: "owner" },
    ]);
  });

  it("dono não pode ser removido, rebaixado nem duplicado", async () => {
    await denied(
      `update public.business_members set status = 'removed' where business_id = $1 and role = 'owner'`,
      [BIZ_A],
    );
    await denied(
      `update public.business_members set role = 'manager' where business_id = $1 and role = 'owner'`,
      [BIZ_A],
    );
    await denied(`delete from public.business_members where business_id = $1 and role = 'owner'`, [
      BIZ_A,
    ]);
    await db.query("savepoint d");
    await expect(
      db.query(`update public.business_members set role = 'owner' where user_id = $1`, [MANAGER]),
    ).rejects.toThrow();
    await db.query("rollback to savepoint d");
  });

  it("ninguém do painel grava membros ou convites direto (só o servidor)", async () => {
    await actAs(db, OWNER_A);
    await denied(
      `insert into public.business_members (business_id, user_id, role) values ($1, $2, 'manager')`,
      [BIZ_A, OWNER_A],
    );
    await denied(`update public.business_members set role = 'staff' where user_id = $1`, [MANAGER]);
    await denied(
      `insert into public.business_invitations (business_id, role, token_hash) values ($1, 'manager', repeat('a', 64))`,
      [BIZ_A],
    );
    await denied(`select token_hash from public.business_invitations`);
  });

  it("membro removido perde o acesso na hora", async () => {
    await db.query(`update public.business_members set status = 'removed' where user_id = $1`, [
      RECEPTION,
    ]);
    await actAs(db, RECEPTION);
    expect((await db.query(`select id from public.businesses`)).rows).toEqual([]);
    expect((await db.query(`select id from public.appointments`)).rows).toEqual([]);
    expect((await db.query(`select id from public.customers`)).rows).toEqual([]);
  });

  it("membro de um negócio não vê outro negócio", async () => {
    await actAs(db, MANAGER);
    const { rows } = await db.query(`select id from public.businesses`);
    expect(rows.map((r) => r.id)).toEqual([BIZ_A]);
    expect(
      (await db.query(`select id from public.appointments where business_id = $1`, [BIZ_B])).rows,
    ).toEqual([]);
  });
});

describe("valores (nenhum papel lê price_cents direto)", () => {
  it("coluna price_cents negada para todos os papéis", async () => {
    for (const user of [OWNER_A, MANAGER, RECEPTION, STAFF]) {
      await actAs(db, user);
      await denied(`select price_cents from public.appointments`);
      await denied(`select * from public.appointments`);
      await db.query("reset role");
    }
  });

  it("dono e gerente leem por appointment_prices; recepção e profissional não", async () => {
    for (const [user, expected] of [
      [OWNER_A, 1],
      [MANAGER, 1],
      [RECEPTION, 0],
      [STAFF, 0],
    ] as const) {
      await actAs(db, user);
      const { rows } = await db.query(
        `select * from public.appointment_prices($1, array[$2::uuid])`,
        [BIZ_A, apptOther],
      );
      expect(rows.length, user).toBe(expected);
      await db.query("reset role");
    }
  });

  it("total gasto do cliente só para quem vê o faturamento", async () => {
    await db.query(`update public.appointments set status = 'completed' where id = $1`, [
      apptOther,
    ]);
    await actAs(db, MANAGER);
    const m = await db.query(
      `select total_spent_cents from public.customer_summaries where id = $1`,
      [customerOther],
    );
    expect(m.rows[0].total_spent_cents).toBe(4000);
    await db.query("reset role");
    await actAs(db, RECEPTION);
    const r = await db.query(
      `select total_spent_cents from public.customer_summaries where id = $1`,
      [customerOther],
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].total_spent_cents).toBeNull();
  });

  it("financeiro e pacotes: só dono e gerente", async () => {
    for (const user of [RECEPTION, STAFF]) {
      await actAs(db, user);
      expect((await db.query(`select id from public.finance_entries`)).rows).toEqual([]);
      expect((await db.query(`select id from public.service_packages`)).rows).toEqual([]);
      await denied(
        `insert into public.finance_entries (business_id, kind, amount_cents, category, occurred_on) values ($1, 'expense', 100, 'Outros', '2030-01-01')`,
        [BIZ_A],
      );
      await db.query("reset role");
    }
    await actAs(db, MANAGER);
    await db.query(
      `insert into public.finance_entries (business_id, kind, amount_cents, category, occurred_on) values ($1, 'expense', 100, 'Outros', '2030-01-01')`,
      [BIZ_A],
    );
  });
});

describe("agenda por papel", () => {
  it("recepção vê e agenda para todos; profissional só vê a própria agenda", async () => {
    await actAs(db, RECEPTION);
    expect((await db.query(`select id from public.appointments`)).rows).toHaveLength(2);
    expect(
      await affects(`update public.appointments set notes = 'x' where id = $1`, [apptOther]),
    ).toBe(1);
    await db.query("reset role");

    await actAs(db, STAFF);
    const { rows } = await db.query(`select id from public.appointments`);
    expect(rows.map((r) => r.id)).toEqual([apptMine]);
    // não remarca/cancela nem os próprios (só concluído/faltou pela função)
    expect(
      await affects(`update public.appointments set status = 'canceled' where id = $1`, [apptMine]),
    ).toBe(0);
    await denied(
      `insert into public.appointments (business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, customer_name, customer_whatsapp)
       select business_id, customer_id, service_id, staff_member_id, '2030-02-01 13:00Z', '2030-02-01 13:30Z', 'x', '5585900000000' from public.appointments where id = $1`,
      [apptMine],
    );
  });

  it("profissional marca concluído/faltou só nos próprios", async () => {
    await actAs(db, STAFF);
    await db.query(`select public.set_appointment_status($1, 'completed')`, [apptMine]);
    await denied(`select public.set_appointment_status($1, 'completed')`, [apptOther]);
    await db.query("reset role");
    const { rows } = await db.query(`select status from public.appointments where id = $1`, [
      apptMine,
    ]);
    expect(rows[0].status).toBe("completed");
  });

  it("profissional vê só os clientes dos próprios atendimentos", async () => {
    await actAs(db, STAFF);
    const { rows } = await db.query(`select name from public.customers`);
    expect(rows.map((r) => r.name)).toEqual(["Meu"]);
    const s = await db.query(`select name from public.customer_summaries`);
    expect(s.rows.map((r) => r.name)).toEqual(["Meu"]);
    await db.query("reset role");
    await actAs(db, RECEPTION);
    expect((await db.query(`select id from public.customers`)).rows.length).toBe(2);
  });

  it("profissional bloqueia só os próprios horários", async () => {
    await actAs(db, STAFF);
    await db.query(
      `insert into public.time_blocks (business_id, staff_member_id, starts_at, ends_at) values ($1, $2, '2030-03-01 13:00Z', '2030-03-01 14:00Z')`,
      [BIZ_A, staffMine],
    );
    await denied(
      `insert into public.time_blocks (business_id, staff_member_id, starts_at, ends_at) values ($1, $2, '2030-03-01 13:00Z', '2030-03-01 14:00Z')`,
      [BIZ_A, staffOther],
    );
    await denied(
      `insert into public.time_blocks (business_id, staff_member_id, starts_at, ends_at) values ($1, null, '2030-03-01 13:00Z', '2030-03-01 14:00Z')`,
      [BIZ_A],
    );
    await db.query("reset role");
    await actAs(db, RECEPTION);
    await db.query(
      `insert into public.time_blocks (business_id, staff_member_id, starts_at, ends_at) values ($1, null, '2030-03-02 13:00Z', '2030-03-02 14:00Z')`,
      [BIZ_A],
    );
  });

  it("profissional edita o próprio horário de trabalho, não o dos outros", async () => {
    const day = JSON.stringify([
      { weekday: 1, is_open: true, opens_at: "09:00", closes_at: "12:00" },
    ]);
    await actAs(db, STAFF);
    await db.query(`select public.save_staff_hours($1, $2::jsonb)`, [staffMine, day]);
    await denied(`select public.save_staff_hours($1, $2::jsonb)`, [staffOther, day]);
  });
});

describe("ajustes por papel", () => {
  it("dono e gerente mudam serviços e horários; recepção e profissional não", async () => {
    for (const [user, allowed] of [
      [OWNER_A, 1],
      [MANAGER, 1],
      [RECEPTION, 0],
      [STAFF, 0],
    ] as const) {
      await actAs(db, user);
      expect(
        await affects(`update public.services set name = 'Novo' where business_id = $1`, [BIZ_A]),
        user,
      ).toBe(allowed);
      expect(
        await affects(`update public.businesses set name = 'Novo nome' where id = $1`, [BIZ_A]),
        user,
      ).toBe(allowed);
      await db.query("reset role");
    }
    await actAs(db, RECEPTION);
    await denied(`select public.save_business_hours($1, '[]'::jsonb)`, [BIZ_A]);
  });

  it("todo membro lê a configuração (serviços, profissionais) para a agenda", async () => {
    await actAs(db, STAFF);
    expect((await db.query(`select id from public.services`)).rows.length).toBeGreaterThan(0);
    expect((await db.query(`select id from public.staff_members`)).rows.length).toBe(2);
  });

  it("assinatura só para o dono; gerente não vê", async () => {
    await db.query(
      `insert into public.subscriptions (business_id, plan, status, provider) values ($1, 'pro', 'active', 'teste')`,
      [BIZ_A],
    );
    await actAs(db, MANAGER);
    expect((await db.query(`select id from public.subscriptions`)).rows).toEqual([]);
    await db.query("reset role");
    await actAs(db, OWNER_A);
    expect((await db.query(`select id from public.subscriptions`)).rows).toHaveLength(1);
  });

  it("quem criou e quem alterou o agendamento ficam registrados", async () => {
    await actAs(db, RECEPTION);
    await db.query(`update public.appointments set notes = 'y' where id = $1`, [apptOther]);
    await db.query("reset role");
    const { rows } = await db.query(
      `select updated_by_user_id from public.appointments where id = $1`,
      [apptOther],
    );
    expect(rows[0].updated_by_user_id).toBe(RECEPTION);
  });
});
