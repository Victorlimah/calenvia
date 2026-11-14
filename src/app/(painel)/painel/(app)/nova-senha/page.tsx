import type { Metadata } from "next";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Nova senha — Calenvia" };

export default function NovaSenhaPage() {
  return (
    <main className="mx-auto w-full max-w-md space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink">Criar nova senha</h1>
        <p className="mt-1 text-ink-2">Escolha uma senha que você não usa em outros sites.</p>
      </div>
      <NewPasswordForm />
    </main>
  );
}
