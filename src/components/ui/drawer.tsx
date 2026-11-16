"use client";

import { useEffect, useRef } from "react";

/**
 * Painel lateral (computador) / folha de baixo para cima (celular), com o <dialog> nativo:
 * prende o foco, fecha com Esc e devolve o foco a quem abriu.
 */
export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-paper p-0 backdrop:bg-ink/40 md:mt-0 md:ml-auto md:h-dvh md:max-h-none md:w-[28rem] md:rounded-none md:rounded-l-3xl"
    >
      {open ? (
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-xl font-bold">{title}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="inline-flex size-11 items-center justify-center rounded-xl text-xl text-ink-2 hover:bg-paper-2"
            >
              ×
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
