"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { newBookingText, shouldNotify, type BookingEvent } from "@/lib/agenda/new-booking";
import { showSystemNotification } from "@/lib/notify";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Toast = { id: string; title: string; body: string };

/**
 * Aviso de novo agendamento (CAL-064): enquanto o painel estiver aberto (aba ou app
 * instalado), um agendamento feito pela página mostra um aviso na tela e, se o dono
 * permitiu, uma notificação do sistema.
 */
export function NewBookingNotifier({
  businessId,
  timezone,
}: {
  businessId: string;
  timezone: string;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let alive = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`novos-${businessId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "appointments",
            filter: `business_id=eq.${businessId}`,
          },
          (payload) => {
            const row = payload.new as Partial<BookingEvent>;
            if (!shouldNotify(row)) return;
            const text = newBookingText(row, timezone);
            setToasts((list) => [...list.slice(-2), { id: row.id, ...text }]);
            setTimeout(() => setToasts((list) => list.filter((t) => t.id !== row.id)), 15_000);
            void showSystemNotification(text.title, {
              body: text.body,
              tag: row.id,
              url: `/agendamento/${row.id}`,
            });
          },
        )
        .subscribe();
    });
    return () => {
      alive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [businessId, timezone]);

  if (!toasts.length) return null;
  return (
    <div
      aria-live="polite"
      className="fixed inset-x-4 top-4 z-50 flex flex-col gap-2 md:right-6 md:left-auto md:w-96"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="flex items-start gap-3 rounded-[var(--radius-card)] border border-brand-soft bg-white p-4 shadow-lg"
        >
          <span aria-hidden="true" className="text-xl">
            🗓️
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{t.title}</p>
            <p className="text-sm text-ink-2">{t.body}</p>
            <Link
              href={`/agendamento/${t.id}`}
              className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline"
            >
              Ver agendamento
            </Link>
          </div>
          <button
            type="button"
            aria-label="Fechar aviso"
            className="inline-flex size-11 items-center justify-center rounded-xl text-ink-2 hover:bg-paper-2"
            onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
