import Link from "next/link";
import type { Metadata } from "next";
import { PLAN_LABELS, parsePlanParam } from "@/lib/plan-param";
import { GoogleButton } from "../google-button";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Criar conta — Calenvia" };

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { plano } = await searchParams;
  const plan = parsePlanParam(plano);
  const next = plan ? `/onboarding?plano=${plan}` : "/onboarding";
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
      <SignUpForm plan={plan ?? undefined} />
      <div className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleButton next={next} label="Continuar com Google" />
      <p className="text-center text-sm text-ink-2">
        Já tem conta?{" "}
        <Link
          href="/entrar"
          className="font-semibold text-brand underline-offset-2 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
