import type { Metadata } from "next";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Nova senha — Calenvia" };

export default function NovaSenhaPage() {
  return (
    <main className="mx-auto w-full max-w-md space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-ink text-3xl font-extrabold">Criar nova senha</h1>
        <p className="text-ink-2 mt-1">Escolha uma senha que você não usa em outros sites.</p>
      </div>
      <NewPasswordForm />
    </main>
  );
}
