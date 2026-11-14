import { Client } from "pg";

export const DB_URL =
  process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export const OWNER_A = "aaaaaaaa-0000-0000-0000-000000000001";
export const OWNER_B = "bbbbbbbb-0000-0000-0000-000000000001";
export const BIZ_A = "aaaaaaaa-1111-0000-0000-000000000001";
export const BIZ_B = "bbbbbbbb-1111-0000-0000-000000000001";

export async function connect(): Promise<Client> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  return client;
}

/** Cria dois negócios completos (A e B), cada um com seu dono, dentro da transação atual. */
export async function seedTwoBusinesses(db: Client) {
  for (const [owner, biz, slug, phone] of [
    [OWNER_A, BIZ_A, "negocio-a", "5585911110000"],
    [OWNER_B, BIZ_B, "negocio-b", "5585922220000"],
  ] as const) {
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      owner,
      `${slug}@teste.dev`,
    ]);
    await db.query(
      `insert into public.businesses (id, owner_id, slug, name) values ($1, $2, $3, $4)`,
      [biz, owner, slug, `Negócio ${slug}`],
    );
    const service = await db.query(
      `insert into public.services (business_id, name, duration_min) values ($1, 'Corte', 30) returning id`,
      [biz],
    );
    const staff = await db.query(
      `insert into public.staff_members (business_id, name) values ($1, 'Pro') returning id`,
      [biz],
    );
    const customer = await db.query(
      `insert into public.customers (business_id, name, whatsapp) values ($1, 'Cliente', $2) returning id`,
      [biz, phone],
    );
    await db.query(
      `insert into public.appointments (business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, customer_name, customer_whatsapp)
       values ($1, $2, $3, $4, '2030-01-01 13:00Z', '2030-01-01 13:30Z', 'Cliente', $5)`,
      [biz, customer.rows[0].id, service.rows[0].id, staff.rows[0].id, phone],
    );
    await db.query(
      `insert into public.messages (business_id, type, to_number, template) values ($1, 'confirmation', $2, 'confirmacao')`,
      [biz, phone],
    );
    await db.query(
      `insert into public.message_usage (business_id, period, count) values ($1, '2030-01', 1)`,
      [biz],
    );
  }
}

export async function actAs(db: Client, userId: string | null) {
  if (userId === null) {
    await db.query(`set local role anon`);
    await db.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
    return;
  }
  await db.query(`set local role authenticated`);
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
}
