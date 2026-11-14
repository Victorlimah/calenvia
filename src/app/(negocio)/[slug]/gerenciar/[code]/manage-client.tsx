"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TimeStep } from "@/components/agendar/time-step";
import { cancelByCodeAction, rescheduleByCodeAction } from "../actions";

type Props = {
  slug: string;
  code: string;
  serviceId: string;
  staffId: string;
  timezone: string;
  accent: string;
};

export function ManageClient({ slug, code, serviceId, staffId, timezone, accent }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"menu" | "reschedule" | "cancel">("menu");
  const [pick, setPick] = useState<{ date: string | null; start: string | null }>({
    date: null,
    start: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const done = () => router.push(`/confirmado/${code}`);

  function confirmReschedule() {
    if (!pick.start) return;
    setError(null);
    start(async () => {
      const r = await rescheduleByCodeAction({ slug, code, start: pick.start });
      if (r.ok) done();
      else setError(r.error);
    });
  }

  function confirmCancel() {
    setError(null);
    start(async () => {
      const r = await cancelByCodeAction({ slug, code });
      if (r.ok) done();
      else setError(r.error);
    });
  }

  const primary =
    "inline-flex min-h-14 w-full items-center justify-center rounded-[var(--radius-control)] text-[17px] font-bold disabled:opacity-50";
  const secondary =
    "inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] border border-white/20 font-semibold";

  return (
    <div className="mt-8 space-y-3">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 font-semibold"
        >
          {error}
        </p>
      ) : null}

      {mode === "menu" ? (
        <>
          <button
            type="button"
            className={primary}
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            onClick={() => setMode("reschedule")}
          >
            Remarcar
          </button>
          <button type="button" className={secondary} onClick={() => setMode("cancel")}>
            Cancelar agendamento
          </button>
        </>
      ) : null}

      {mode === "reschedule" ? (
        <section aria-labelledby="novo-horario" className="space-y-4">
          <h2 id="novo-horario" className="font-display text-2xl font-extrabold">
            Escolha o novo horário
          </h2>
          <TimeStep
            slug={slug}
            serviceId={serviceId}
            staffId={staffId}
            timezone={timezone}
            accent={accent}
            date={pick.date}
            start={pick.start}
            onChange={setPick}
            manageCode={code}
          />
          <button
            type="button"
            className={primary}
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            disabled={!pick.start || pending}
            onClick={confirmReschedule}
          >
            {pending ? "Remarcando…" : "Confirmar novo horário"}
          </button>
          <button type="button" className={secondary} onClick={() => setMode("menu")}>
            Voltar
          </button>
        </section>
      ) : null}

      {mode === "cancel" ? (
        <section
          aria-labelledby="cancelar"
          className="space-y-3 rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-5"
        >
          <h2 id="cancelar" className="font-display text-2xl font-extrabold">
            Cancelar este horário?
          </h2>
          <p className="text-night-sub">
            O horário fica livre para outra pessoa. Se quiser, você agenda de novo depois.
          </p>
          <button
            type="button"
            className={primary + " bg-red-600 text-white"}
            disabled={pending}
            onClick={confirmCancel}
          >
            {pending ? "Cancelando…" : "Sim, cancelar"}
          </button>
          <button type="button" className={secondary} onClick={() => setMode("menu")}>
            Não, manter o horário
          </button>
        </section>
      ) : null}
    </div>
  );
}
