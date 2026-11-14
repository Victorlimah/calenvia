"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";

/** Roda uma server action, guarda erro/mensagem e atualiza os dados da página. */
export function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function run<T>(
    fn: () => Promise<ActionResult<T>>,
    opts: {
      onSuccess?: (r: Extract<ActionResult<T>, { ok: true }>) => void;
      refresh?: boolean;
    } = {},
  ) {
    setError(null);
    setMessage(null);
    setFieldErrors({});
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.ok) {
          setMessage(result.message ?? null);
          opts.onSuccess?.(result);
          if (opts.refresh !== false) router.refresh();
        } else {
          setError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
        }
      } catch (e) {
        // redirect() das server actions chega aqui como erro especial: deixa o Next tratar.
        if (
          e &&
          typeof e === "object" &&
          "digest" in e &&
          String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
        ) {
          throw e;
        }
        setError("Sem conexão ou erro inesperado. Tente de novo.");
      }
    });
  }

  return { run, pending, error, message, fieldErrors, setMessage, setError };
}
