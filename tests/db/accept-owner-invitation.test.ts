import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { hashInviteToken, newInviteToken } from "@/lib/team/invitations";
import { OWNER_A, actAs, connect } from "./helpers";

// CAL-137: aceite do convite de dono — uso único, validade, e-mail certo, atômico.
let db: Client;
const USER = "cccccccc-0000-0000-0000-000000000001";
const OTHER = "cccccccc-0000-0000-0000-000000000002";
let biz: string;
let hash: string;

beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});
beforeEach(async () => {
  await db.query("begin");
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values ($1, 'dona@teste.dev', '{"name":"Dona"}'), ($2, 'outra@teste.dev', '{}'), ($3, 'dono-a@teste.dev', '{}')`,
    [USER, OTHER, OWNER_A],
  );
  const { rows } = await db.query(
    `insert into public.businesses (slug, name, plan_status) values ('convidada-teste', 'Convidada', 'active') returning id`,
  );
  biz = rows[0].id;
  hash = hashInviteToken(newInviteToken());
  await db.query(
    `insert into public.owner_invitations (business_id, email, owner_name, token_hash) values ($1, 'dona@teste.dev', 'Dona', $2)`,
    [biz, hash],
  );
});
afterEach(async () => {
  await db.query("rollback");
});

async function accept(tokenHash: string, userId: string) {
  return db.query(`select public.accept_owner_invitation($1, $2) as id`, [tokenHash, userId]);
}

async function expectError(fn: () => Promise<unknown>, pattern: RegExp) {
  await db.query("savepoint x");
  await expect(fn()).rejects.toThrow(pattern);
  await db.query("rollback to savepoint x");
}

describe("accept_owner_invitation (CAL-137)", () => {
  it("vincula a conta como dona do negócio e marca o convite como aceito", async () => {
    const { rows } = await accept(hash, USER);
    expect(rows[0].id).toBe(biz);
    const b = await db.query(`select owner_id from public.businesses where id = $1`, [biz]);
    expect(b.rows[0].owner_id).toBe(USER);
    const m = await db.query(
      `select role, display_name, email from public.business_members where business_id = $1`,
      [biz],
    );
    expect(m.rows).toEqual([{ role: "owner", display_name: "Dona", email: "dona@teste.dev" }]);
    const i = await db.query(
      `select accepted_by from public.owner_invitations where token_hash = $1`,
      [hash],
    );
    expect(i.rows[0].accepted_by).toBe(USER);
  });

  it("token usado duas vezes é recusado", async () => {
    await accept(hash, USER);
    await expectError(() => accept(hash, USER), /invitation_used/);
  });

  it("token adulterado, expirado ou cancelado é recusado", async () => {
    await expectError(
      () => accept(hashInviteToken("adulterado-" + "x".repeat(20)), USER),
      /invitation_not_found/,
    );
    await db.query(`update public.owner_invitations set expires_at = now() - interval '1 second'`);
    await expectError(() => accept(hash, USER), /invitation_expired/);
    await db.query(
      `update public.owner_invitations set expires_at = now() + interval '1 day', canceled_at = now()`,
    );
    await expectError(() => accept(hash, USER), /invitation_canceled/);
  });

  it("conta de outro e-mail não aceita o convite", async () => {
    await expectError(() => accept(hash, OTHER), /invitation_email_mismatch/);
  });

  it("negócio que já tem dono não troca de dono", async () => {
    await db.query(`update public.businesses set owner_id = $1 where id = $2`, [OWNER_A, biz]);
    await expectError(() => accept(hash, USER), /business_has_owner/);
  });

  it("dono e anônimo não chamam a função", async () => {
    await actAs(db, OWNER_A);
    await expectError(() => accept(hash, OWNER_A), /permission denied/);
    await db.query("reset role");
    await actAs(db, null);
    await expectError(() => accept(hash, USER), /permission denied/);
    await expectError(
      () => db.query(`select public.auth_user_id_by_email('dona@teste.dev')`),
      /permission denied/,
    );
  });
});
