import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { hashInviteToken, newInviteToken } from "@/lib/team/invitations";
import { BIZ_A, OWNER_A, actAs, connect, seedTwoBusinesses } from "./helpers";

// CAL-136: convites de dono só pelo servidor (service role); só o hash do token no banco.
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

async function expectRejected(sql: string, params: unknown[], pattern: RegExp) {
  await db.query("savepoint x");
  await expect(db.query(sql, params)).rejects.toThrow(pattern);
  await db.query("rollback to savepoint x");
}

const INSERT = `insert into public.owner_invitations (business_id, email, owner_name, token_hash)
  values ($1, $2, 'Dona', $3) returning id`;

describe("owner_invitations (CAL-136)", () => {
  it("negócio convidado pode nascer sem dono", async () => {
    const { rows } = await db.query(
      `insert into public.businesses (slug, name, plan_status) values ('convidado-x', 'Convidado X', 'active') returning owner_id`,
    );
    expect(rows[0].owner_id).toBeNull();
    const { rows: members } = await db.query(
      `select count(*)::int as n from public.business_members b join public.businesses x on x.id = b.business_id where x.slug = 'convidado-x'`,
    );
    expect(members[0].n).toBe(0);
  });

  it("dono e anônimo não leem nem gravam convites", async () => {
    await db.query(INSERT, [BIZ_A, "dona@teste.dev", hashInviteToken(newInviteToken())]);
    await actAs(db, OWNER_A);
    await expectRejected(`select * from public.owner_invitations`, [], /permission denied/);
    await expectRejected(
      INSERT,
      [BIZ_A, "outra@teste.dev", hashInviteToken("x".repeat(32))],
      /permission denied/,
    );
    await db.query("reset role");
    await db.query("set local role anon");
    await expectRejected(`select * from public.owner_invitations`, [], /permission denied/);
  });

  it("guarda só hash SHA-256 (64 hex) e o hash é único", async () => {
    const hash = hashInviteToken(newInviteToken());
    await expectRejected(INSERT, [BIZ_A, "a@teste.dev", "token-em-claro"], /check constraint/);
    await db.query(INSERT, [BIZ_A, "a@teste.dev", hash]);
    await db.query(
      `update public.owner_invitations set canceled_at = now() where token_hash = $1`,
      [hash],
    );
    await expectRejected(INSERT, [BIZ_A, "b@teste.dev", hash], /duplicate key/);
  });

  it("um convite em aberto por negócio; cancelado ou aceito libera outro", async () => {
    const first = await db.query(INSERT, [BIZ_A, "a@teste.dev", hashInviteToken(newInviteToken())]);
    await expectRejected(
      INSERT,
      [BIZ_A, "a@teste.dev", hashInviteToken(newInviteToken())],
      /owner_invitations_one_open/,
    );
    await db.query(`update public.owner_invitations set canceled_at = now() where id = $1`, [
      first.rows[0].id,
    ]);
    await db.query(INSERT, [BIZ_A, "a@teste.dev", hashInviteToken(newInviteToken())]);
  });

  it("e-mail sempre minúsculo e convite não pode estar aceito e cancelado", async () => {
    await expectRejected(
      INSERT,
      [BIZ_A, "Maiuscula@Teste.dev", hashInviteToken(newInviteToken())],
      /check constraint/,
    );
    const { rows } = await db.query(INSERT, [
      BIZ_A,
      "a@teste.dev",
      hashInviteToken(newInviteToken()),
    ]);
    await expectRejected(
      `update public.owner_invitations set accepted_at = now(), canceled_at = now() where id = $1`,
      [rows[0].id],
      /owner_invitations_not_both/,
    );
  });
});
