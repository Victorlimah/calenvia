import Link from "next/link";
import type { Metadata } from "next";
import { PLAN_LABELS, parsePlanParam } from "@/lib/plan-param";
import { GoogleButton } from "../google-button";
import { SignUpForm } from "./sign-up-form";
import { normalizeRefCode } from "@/lib/referrals";

export const metadata: Metadata = { title: "Criar conta — Calenvia" };

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string; ref?: string; next?: string }>;
}) {
  const { plano, ref, next: nextParam } = await searchParams;
  const refCode = normalizeRefCode(ref) ?? undefined;
  const plan = parsePlanParam(plano);
  // Convite da equipe (CAL-112): depois do cadastro, volta para aceitar o convite.
  const invite = nextParam?.startsWith("/convite/") ? nextParam : undefined;
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
