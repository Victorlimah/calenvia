import Link from "next/link";
import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { isInviteOnly } from "@/lib/config/access";
import { GoogleButton } from "../google-button";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Entrar — Calenvia" };
export const dynamic = "force-dynamic";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next, erro } = await searchParams;
  const teamInvite = next?.startsWith("/convite/") ? next : undefined;
  const inviteOnly = isInviteOnly();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink">Entrar</h1>
        <p className="mt-1 text-ink-2">Acesse a agenda do seu negócio.</p>
      </div>
      {erro === "link" ? (
        <Alert tone="warning">Esse link expirou ou já foi usado. Entre ou peça um novo link.</Alert>
      ) : null}
      {erro === "convite" ? (
        <Alert tone="warning">
          Não encontramos uma conta da Calenvia para esse login. Por enquanto o acesso é por
          convite.
        </Alert>
      ) : null}
      <SignInForm next={next} />
      <Divider />
      <GoogleButton next={next} />
      {inviteOnly && !teamInvite ? (
        <p className="text-center text-sm text-ink-2">
          Ainda não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-semibold text-brand underline-offset-2 hover:underline"
          >
            Pedir acesso
          </Link>
        </p>
      ) : (
        <p className="text-center text-sm text-ink-2">
          Ainda não tem conta?{" "}
          <Link
            href={teamInvite ? `/cadastro?next=${encodeURIComponent(teamInvite)}` : "/cadastro"}
            className="font-semibold text-brand underline-offset-2 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      ou
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
