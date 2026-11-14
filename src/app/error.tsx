"use client";

import { useEffect } from "react";
import { reportClientError } from "@/components/report-client-error";

/** Erro inesperado numa página: avisa com calma e permite tentar de novo. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => reportClientError(error), [error]);
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl font-extrabold">Algo deu errado</h1>
      <p className="text-ink-2">
        Não foi possível carregar esta tela. Já fomos avisados. Tente de novo em instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-12 rounded-[var(--radius-control)] bg-brand px-6 font-semibold text-white"
      >
        Tentar de novo
      </button>
    </main>
  );
}
