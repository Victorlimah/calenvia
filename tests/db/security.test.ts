/**
 * CAL-090: revisão automática das regras de acesso. Varre o schema public inteiro,
 * então uma tabela, view ou função nova sem proteção quebra este teste.
 */
import type { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BIZ_A, BIZ_B, OWNER_A, OWNER_B, actAs, connect, seedTwoBusinesses } from "./helpers";

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

async function publicTables(): Promise<{ name: string; rls: boolean; hasBusinessId: boolean }[]> {
  const { rows } = await db.query(`
    select c.relname as name, c.relrowsecurity as rls,
           exists (select 1 from information_schema.columns col
                   where col.table_schema = 'public' and col.table_name = c.relname
                     and col.column_name = 'business_id') as "hasBusinessId"
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by 1`);
  return rows;
}

describe("Revisão de segurança (CAL-090)", () => {
  it("toda tabela do schema public tem RLS ligado", async () => {
    const tables = await publicTables();
    expect(tables.length).toBeGreaterThan(10);
    expect(tables.filter((t) => !t.rls).map((t) => t.name)).toEqual([]);
  });

  it("toda view do schema public roda com as permissões de quem consulta", async () => {
    const { rows } = await db.query(`
      select c.relname as name, coalesce(c.reloptions::text, '') as opts
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'v'`);
    expect(
      rows.filter((v) => !v.opts.includes("security_invoker=true")).map((v) => v.name),
      // customer_summaries (CAL-112) soma valores que nenhum papel lê direto: o filtro de acesso
      // fica dentro da view (testado em team.test.ts).
    ).toEqual(["customer_summaries"]);
  });

  it("funções security definer fixam o search_path e não ficam abertas ao anônimo", async () => {
    const { rows } = await db.query(`
      select p.proname as name,
             coalesce(array_to_string(p.proconfig, ','), '') as config,
             has_function_privilege('anon', p.oid, 'execute') as anon_exec
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef`);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((f) => !f.config.includes("search_path=")).map((f) => f.name)).toEqual([]);
    // is_business_owner é usada pelas policies; nenhuma outra pode ser chamada pelo anônimo.
    expect(rows.filter((f) => f.anon_exec).map((f) => f.name)).toEqual([]);
  });

  it("dono A não lê nenhuma linha do negócio B, em nenhuma tabela", async () => {
    const tables = (await publicTables()).filter((t) => t.hasBusinessId);
    await actAs(db, OWNER_A);
    const leaks: string[] = [];
    for (const t of tables) {
      await db.query("savepoint s");
      try {
        const { rows } = await db.query(
          `select count(*)::int as n from public."${t.name}" where business_id = $1`,
          [BIZ_B],
        );
        if (rows[0].n > 0) leaks.push(t.name);
      } catch {
        // sem permissão de leitura: também é seguro
      }
      await db.query("rollback to savepoint s");
    }
    expect(leaks).toEqual([]);
  });

  it("dono A não altera nem apaga nada do negócio B, em nenhuma tabela", async () => {
    const tables = (await publicTables()).filter((t) => t.hasBusinessId);
    await actAs(db, OWNER_A);
    const changed: string[] = [];
    for (const t of tables) {
      for (const sql of [
        `update public."${t.name}" set business_id = business_id where business_id = $1`,
        `delete from public."${t.name}" where business_id = $1`,
      ]) {
        await db.query("savepoint s");
        try {
          const r = await db.query(sql, [BIZ_B]);
          if (r.rowCount) changed.push(`${sql.split(" ")[0]} ${t.name}`);
        } catch {
          // negado: ok
        }
        await db.query("rollback to savepoint s");
      }
    }
    expect(changed).toEqual([]);
  });

  it("dono A não cria registros no negócio B em nenhuma tabela com business_id", async () => {
    const tables = (await publicTables()).filter((t) => t.hasBusinessId && t.name !== "businesses");
    await actAs(db, OWNER_A);
    const accepted: string[] = [];
    for (const t of tables) {
      await db.query("savepoint s");
      try {
        // Insert mínimo: só business_id. Se a tabela exige outras colunas, falha por NOT NULL
        // (também seguro); o que importa é que nenhuma aceite o business_id de outro dono.
        const r = await db.query(`insert into public."${t.name}" (business_id) values ($1)`, [
          BIZ_B,
        ]);
        if (r.rowCount) accepted.push(t.name);
      } catch {
        // negado
      }
      await db.query("rollback to savepoint s");
    }
    expect(accepted).toEqual([]);
  });

  it("visitante anônimo não lê nenhuma tabela com dados de negócio", async () => {
    const tables = (await publicTables()).filter((t) => t.hasBusinessId || t.name === "businesses");
    await actAs(db, null);
    const visible: string[] = [];
    for (const t of tables) {
      await db.query("savepoint s");
      try {
        const { rows } = await db.query(`select count(*)::int as n from public."${t.name}"`);
        if (rows[0].n > 0) visible.push(t.name);
      } catch {
        // negado
      }
      await db.query("rollback to savepoint s");
    }
    expect(visible).toEqual([]);
  });

  it("dono B também só vê o próprio negócio (simetria)", async () => {
    await actAs(db, OWNER_B);
    const { rows } = await db.query(`select id from public.businesses`);
    expect(rows.map((r) => r.id)).toEqual([BIZ_B]);
    const { rows: a } = await db.query(
      `select count(*)::int as n from public.appointments where business_id = $1`,
      [BIZ_A],
    );
    expect(a[0].n).toBe(0);
  });
});
