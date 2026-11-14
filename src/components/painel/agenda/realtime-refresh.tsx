"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Atualiza a tela quando um agendamento ou bloqueio do negócio muda (CAL-060).
 * Usa o Supabase Realtime com a sessão do dono: o RLS garante que só chegam eventos dele.
 */
export function RealtimeRefresh({ businessId }: { businessId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300); // junta rajadas de eventos
    };
    const filter = `business_id=eq.${businessId}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let alive = true;
    // O canal precisa do token do dono (RLS); sem ele, nenhum evento chega.
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`agenda-${businessId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "appointments", filter },
          refresh,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "time_blocks", filter },
          refresh,
        )
        .subscribe();
    });
    // Ao voltar para a aba (celular bloqueado, app em segundo plano), atualiza também.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      alive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [businessId, router]);

  return null;
}
