"use client";

import { useState } from "react";
import { Button, ButtonLink, Card } from "@/components/ui";

/** Link da página do negócio: copiar, abrir e dica para a bio do Instagram (CAL-062). */
export function ShareLinkCard({ url, displayHost }: { url: string; displayHost: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-ink-2">Sua página de agendamento</p>
        <p className="mt-1 font-display text-xl font-bold break-all text-brand">{displayHost}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={copy} aria-live="polite">
          {copied ? "Link copiado!" : "Copiar link"}
        </Button>
        <ButtonLink href={url} target="_blank" rel="noopener" variant="outline">
          Ver minha página
        </ButtonLink>
      </div>
      <div className="rounded-[var(--radius-control)] bg-paper-2 p-4 text-sm text-ink-2">
        <p className="font-semibold text-ink">Dica: coloque na bio do Instagram</p>
        <p className="mt-1">
          No Instagram, toque em <strong>Editar perfil → Links → Adicionar link externo</strong> e
          cole o link. Assim seus seguidores agendam sem precisar chamar no direct.
        </p>
      </div>
    </Card>
  );
}
