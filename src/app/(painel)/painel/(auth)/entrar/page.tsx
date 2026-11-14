import Link from "next/link";
import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { GoogleButton } from "../google-button";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Entrar — Calenvia" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next, erro } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-ink text-3xl font-extrabold">Entrar</h1>
        <p className="text-ink-2 mt-1">Acesse a agenda do seu negócio.</p>
      </div>
      {erro === "link" ? (
        <Alert tone="warning">Esse link expirou ou já foi usado. Entre ou peça um novo link.</Alert>
      ) : null}
      <SignInForm next={next} />
      <Divider />
      <GoogleButton next={next} />
      <p className="text-ink-2 text-center text-sm">
        Ainda não tem conta?{" "}
        <Link
          href="/cadastro"
          className="text-brand font-semibold underline-offset-2 hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}

function Divider() {
  return (
    <div className="text-muted flex items-center gap-3 text-sm" aria-hidden="true">
      <span className="bg-line h-px flex-1" />
      ou
      <span className="bg-line h-px flex-1" />
    </div>
  );
}
