"use client";

import { useState, useTransition } from "react";
import { Alert, Button } from "@/components/ui";
import { signInWithGoogleAction } from "./actions";

export function GoogleButton({
  next,
  label = "Entrar com Google",
}: {
  next?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        block
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await signInWithGoogleAction(next);
            if (result && !result.ok) setError(result.error);
          })
        }
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"
          />
          <path
            fill="#34A853"
            d="M12 23c3 0 5.4-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8C3.9 20.5 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.7 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2.1C1.4 8.6 1 10.2 1 12s.4 3.4 1.1 4.9l3.6-2.8z"
          />
          <path
            fill="#EA4335"
            d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.4 2.1 15 1 12 1 7.7 1 3.9 3.5 2.1 7.1l3.6 2.8C6.6 7.4 9.1 5.4 12 5.4z"
          />
        </svg>
        {label}
      </Button>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
