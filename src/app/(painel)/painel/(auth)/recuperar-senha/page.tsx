import Link from "next/link";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Recuperar senha — Calenvia" };

export default function RecuperarSenhaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink">Recuperar senha</h1>
        <p className="mt-1 text-ink-2">Enviamos um link para você criar uma nova senha.</p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm">
        <Link href="/entrar" className="font-semibold text-brand">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
