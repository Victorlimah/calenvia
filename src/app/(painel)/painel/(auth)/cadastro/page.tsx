import Link from "next/link";
import type { Metadata } from "next";
import { buttonClasses } from "@/components/ui";
import { isInviteOnly } from "@/lib/config/access";
import { checkTeamInvitePath } from "@/lib/config/access-server";
import { supportWaLink } from "@/lib/config/support";
import { PLAN_LABELS, parsePlanParam } from "@/lib/plan-param";
import { GoogleButton } from "../google-button";
import { SignUpForm } from "./sign-up-form";
import { normalizeRefCode } from "@/lib/referrals";

export const metadata: Metadata = { title: "Criar conta — Calenvia" };
export const dynamic = "force-dynamic";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string; ref?: string; next?: string }>;
}) {
  const { plano, ref, next: nextParam } = await searchParams;
  // Convite da equipe (CAL-112): depois do cadastro, volta para aceitar o convite.
  const invite = nextParam?.startsWith("/convite/") ? nextParam : undefined;

  // CAL-135: no modo convite, sem um convite da equipe válido, não há cadastro.
  if (isInviteOnly()) {
    const team = await checkTeamInvitePath(invite);
    if (!team.valid) return <InviteOnly />;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Criar sua conta</h1>
          <p className="mt-1 text-ink-2">
            Crie sua senha para entrar na equipe.
            {team.email ? (
              <>
                {" "}
                Use o e-mail do convite: <strong className="text-ink">{team.email}</strong>.
              </>
            ) : null}
          </p>
        </div>
        <SignUpForm next={invite} defaultEmail={team.email ?? undefined} />
        <p className="text-center text-sm text-ink-2">
          Já tem conta?{" "}
          <Link
            href={`/entrar?next=${encodeURIComponent(invite!)}`}
            className="font-semibold text-brand underline-offset-2 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    );
  }

  const refCode = normalizeRefCode(ref) ?? undefined;
  const plan = parsePlanParam(plano);
  const next = invite ?? (plan ? `/onboarding?plano=${plan}` : "/onboarding");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink">Criar sua conta</h1>
        <p className="mt-1 text-ink-2">
          {plan ? (
            <>
              Plano escolhido: <strong>{PLAN_LABELS[plan]}</strong>.{" "}
            </>
          ) : null}
          Em poucos minutos sua página de agendamento fica pronta.
        </p>
      </div>
      <SignUpForm plan={plan ?? undefined} refCode={refCode} next={invite} />
      <div className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleButton next={next} label="Continuar com Google" />
      <p className="text-center text-sm text-ink-2">
        Já tem conta?{" "}
        <Link
          href={invite ? `/entrar?next=${encodeURIComponent(invite)}` : "/entrar"}
          className="font-semibold text-brand underline-offset-2 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}

/** Tela do modo convite: sem formulário, só pedir acesso ou entrar. */
function InviteOnly() {
  return (
    <div className="space-y-6" data-testid="invite-only">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink">
          A Calenvia está em acesso por convite
        </h1>
        <p className="mt-2 text-ink-2">
          Enquanto montamos a nova fase, as contas são criadas pela nossa equipe. Peça seu acesso e
          mandamos um link para você terminar a configuração do seu negócio.
        </p>
      </div>
      <div className="grid gap-2">
        <a
          href={supportWaLink()}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ size: "lg", className: "w-full" })}
        >
          Pedir meu acesso no WhatsApp
        </a>
        <Link href="/entrar" className={buttonClasses({ variant: "outline", className: "w-full" })}>
          Já tenho convite, entrar
        </Link>
      </div>
      <p className="text-sm text-muted">
        Recebeu um link de convite? Abra o link direto: ele leva à tela de criar sua senha.
      </p>
    </div>
  );
}
