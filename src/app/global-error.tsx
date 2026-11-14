"use client";

import { useEffect } from "react";
import { reportClientError } from "@/components/report-client-error";

/** Erro no layout raiz: página mínima, sem depender de nada do app. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => reportClientError(error), [error]);
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
        <title>Algo deu errado — Calenvia</title>
        <h1>Algo deu errado</h1>
        <p>Já fomos avisados. Tente de novo em instantes.</p>
        <button type="button" onClick={reset} style={{ minHeight: 48, padding: "0 24px" }}>
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
