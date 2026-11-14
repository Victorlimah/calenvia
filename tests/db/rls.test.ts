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
