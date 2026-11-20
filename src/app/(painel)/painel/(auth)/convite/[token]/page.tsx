import type { Metadata } from "next";
import Link from "next/link";
import { Alert, buttonClasses } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken, invitationProblem } from "@/lib/team/invitations";
import { loadOwnerInvitation } from "@/lib/admin/owner-invitations-accept";
import { EXPIRED_INVITE_TEXT, supportWaLink } from "@/lib/config/support";
import { AcceptInvitation } from "./accept-invitation";
import { OwnerAcceptForm } from "./owner-accept-form";

export const metadata: Metadata = { title: "Convite — Calenvia" };
export const dynamic = "force-dynamic";

/** CAL-112: o link do convite mostra de qual negócio é, e pede login ou cadastro para aceitar. */
export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // CAL-137: convite de dono (pré-cadastrado pelo /admin) vem primeiro.
  const owner = await loadOwnerInvitation(token, { markOpened: true });
  if (owner.kind === "valid") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            Você foi convidado(a) para a {owner.businessName}
          </h1>
          <p className="mt-2 text-ink-2">
            Olá, {owner.ownerName.split(" ")[0]}! Sua conta na Calenvia já está pronta, sem
            cobrança. Crie sua senha e termine de montar a página de agendamento.
          </p>
        </div>
        <OwnerAcceptForm token={token} email={owner.email} hasAccount={owner.hasAccount} />
      </div>
    );
  }
  if (owner.kind === "problem") {
    return <OwnerInviteProblem problem={owner.problem} businessName={owner.businessName} />;
  }

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

/** Convite de dono que não vale mais: mensagem clara e o caminho certo (CAL-137). */
function OwnerInviteProblem({
  problem,
  businessName,
}: {
  problem: "canceled" | "used" | "expired";
  businessName: string;
}) {
  if (problem === "used") {
    return (
      <div className="space-y-6" data-testid="owner-invite-problem">
        <h1 className="font-display text-3xl font-extrabold text-ink">Convite já usado</h1>
        <Alert tone="info">
          O convite da <strong>{businessName}</strong> já foi aceito. Entre com seu e-mail e senha.
        </Alert>
        <Link href="/entrar" className={buttonClasses({ className: "w-full" })}>
          Entrar
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-6" data-testid="owner-invite-problem">
      <h1 className="font-display text-3xl font-extrabold text-ink">
        {problem === "expired" ? "Este convite expirou" : "Este convite foi cancelado"}
      </h1>
      <Alert tone="warning">
        {problem === "expired"
          ? "O link vale por 7 dias. Peça um novo ao suporte da Calenvia: mandamos outro na hora."
          : "Peça um novo convite ao suporte da Calenvia."}
      </Alert>
      <a
        href={supportWaLink(EXPIRED_INVITE_TEXT)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses({ className: "w-full" })}
      >
        Pedir um novo link no WhatsApp
      </a>
      <Link href="/entrar" className={buttonClasses({ variant: "outline", className: "w-full" })}>
        Já tenho conta, entrar
      </Link>
    </div>
  );
}
