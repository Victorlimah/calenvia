import type { Metadata } from "next";
import Link from "next/link";
import { Alert, buttonClasses } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken, invitationProblem } from "@/lib/team/invitations";
import { AcceptInvitation } from "./accept-invitation";

export const metadata: Metadata = { title: "Convite para a equipe — Calenvia" };
export const dynamic = "force-dynamic";

/** CAL-112: o link do convite mostra de qual negócio é, e pede login ou cadastro para aceitar. */
export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[A-Za-z0-9_-]{20,100}$/.test(token);
  const db = createSupabaseAdminClient();
  const { data: inv } = valid
    ? await db
        .from("business_invitations")
        .select("role, expires_at, accepted_at, revoked_at, businesses(name)")
        .eq("token_hash", hashInviteToken(token))
        .maybeSingle()
    : { data: null };
  const problem = invitationProblem(inv);
  const user = await getCurrentUser();
  const next = `/convite/${token}`;

  if (problem || !inv) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-extrabold text-ink">Convite para a equipe</h1>
        <Alert tone="danger" title="Este convite não vale">
          {problem}
        </Alert>
        <Link href="/" className={buttonClasses({ variant: "outline", className: "w-full" })}>
          Ir para o painel
        </Link>
      </div>
    );
  }

  const role = inv.role as Role;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink">Convite para a equipe</h1>
        <p className="mt-2 text-ink-2">
          Você foi convidado(a) para a equipe da <strong>{inv.businesses?.name}</strong> como{" "}
          <strong>{ROLE_LABELS[role].toLowerCase()}</strong>.
        </p>
        <p className="mt-1 text-sm text-muted">{ROLE_DESCRIPTIONS[role]}</p>
      </div>
      {user ? (
        <AcceptInvitation token={token} email={user.email ?? ""} />
      ) : (
        <div className="grid gap-2">
          <Link
            href={`/cadastro?next=${encodeURIComponent(next)}`}
            className={buttonClasses({ className: "w-full" })}
          >
            Criar minha conta
          </Link>
          <Link
            href={`/entrar?next=${encodeURIComponent(next)}`}
            className={buttonClasses({ variant: "outline", className: "w-full" })}
          >
            Já tenho conta, entrar
          </Link>
        </div>
      )}
    </div>
  );
}
