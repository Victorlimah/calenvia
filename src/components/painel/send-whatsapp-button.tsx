"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { markManualMessageAction } from "@/app/(painel)/painel/(app)/_actions/messages";

/** Abre o WhatsApp com a mensagem pronta e registra o envio manual. */
export function SendWhatsAppButton({
  appointmentId,
  href,
  type = "confirmation",
  sent = false,
  className,
}: {
  appointmentId: string;
  href: string;
  type?: "confirmation" | "reminder";
  sent?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const label =
    type === "confirmation"
      ? sent
        ? "Reenviar confirmação"
        : "Enviar confirmação no WhatsApp"
      : "Enviar lembrete no WhatsApp";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-busy={pending}
      onClick={() =>
        start(async () => {
          await markManualMessageAction(appointmentId, type);
          router.refresh();
        })
      }
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 font-semibold",
        sent ? "border border-line bg-white text-ink" : "bg-[#25D366] text-[#0b3d1f]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
      </svg>
      {label}
    </a>
  );
}
