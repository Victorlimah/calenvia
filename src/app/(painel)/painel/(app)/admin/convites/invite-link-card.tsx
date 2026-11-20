"use client";

import { useId, useState } from "react";
import { Button, buttonClasses } from "@/components/ui";
import type { InviteLink } from "@/lib/admin/owner-invitations";

/** Link recém-gerado: só aparece agora (o banco guarda o hash). Copiar, WhatsApp ou e-mail. */
export function InviteLinkCard({ invite }: { invite: InviteLink }) {
  const id = useId();
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="space-y-3 rounded-[var(--radius-card)] border border-success/30 bg-success-50 p-4"
      data-testid="invite-link-card"
    >
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        Link do convite
      </label>
      <input
        id={id}
        readOnly
        value={invite.link}
        onFocus={(e) => e.currentTarget.select()}
        className="min-h-11 w-full rounded-[var(--radius-control)] border border-line bg-white px-3 font-mono text-sm text-ink"
      />
      <p className="text-sm text-ink-2">
        Guarde ou envie agora: por segurança, o link não aparece de novo. Se perder, gere outro na
        lista. Vale por 7 dias e só pode ser usado uma vez.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="dark"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(invite.link);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copiado!" : "Copiar link"}
        </Button>
        {invite.whatsappLink ? (
          <a
            href={invite.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ size: "sm" })}
          >
            Enviar pelo WhatsApp
          </a>
        ) : null}
        <a href={invite.mailtoLink} className={buttonClasses({ size: "sm", variant: "outline" })}>
          Enviar por e-mail
        </a>
      </div>
    </div>
  );
}
