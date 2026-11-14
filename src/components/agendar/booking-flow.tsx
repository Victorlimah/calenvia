"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { readableTextOn } from "@/lib/color";
import { cn } from "@/lib/cn";
import { ServiceStep } from "./service-step";
import { StaffStep } from "./staff-step";
import {
  STEPS,
  STEP_TITLES,
  type FlowBusiness,
  type PublicService,
  type PublicStaff,
  type Step,
} from "./types";
import { useFlowState, type FlowState } from "./use-flow-state";

type Props = {
  business: FlowBusiness;
  services: PublicService[];
  staff: PublicStaff[];
  initial: FlowState;
};

export function BookingFlow({ business, services, staff, initial }: Props) {
  const { step, selection, update } = useFlowState(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const index = STEPS.indexOf(step);
  const service = services.find((s) => s.id === selection.serviceId) ?? null;
  const eligible = service ? staff.filter((s) => s.serviceIds.includes(service.id)) : [];
  // Só um profissional faz o serviço: ele é o escolhido.
  const staffId = eligible.length === 1 ? eligible[0].id : selection.staffId;
  const chosenStaff = eligible.find((s) => s.id === staffId) ?? null;

  const canContinue: Record<Step, boolean> = {
    servico: Boolean(service),
    profissional: Boolean(service),
    horario: Boolean(service && selection.start),
    dados: false,
  };

  function goTo(next: Step) {
    update({ step: next }, "push");
    window.scrollTo({ top: 0 });
  }

  function back() {
    if (index === 0) window.location.href = "/";
    else window.history.back();
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col" data-ready={ready || undefined}>
      <header className="bg-night/95 sticky top-0 z-30 border-b border-white/10 px-4 pt-3 pb-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={back}
            className="-ml-2 inline-flex size-11 items-center justify-center rounded-xl text-2xl hover:bg-white/10"
            aria-label={index === 0 ? "Voltar para a página" : "Voltar ao passo anterior"}
          >
            ←
          </button>
          <p className="min-w-0 flex-1 truncate font-semibold">{business.name}</p>
          <Link href="/" className="text-night-sub text-sm underline underline-offset-4">
            Sair
          </Link>
        </div>
        <div className="mt-3">
          <p className="text-night-sub text-sm" aria-live="polite">
            Passo {index + 1} de {STEPS.length}
          </p>
          <ol className="mt-2 grid grid-cols-4 gap-1.5" aria-label="Progresso">
            {STEPS.map((s, i) => (
              <li
                key={s}
                aria-current={i === index ? "step" : undefined}
                className={cn("h-1.5 rounded-full", i > index && "bg-white/15")}
                style={i <= index ? { background: business.accent } : undefined}
              >
                <span className="sr-only">{STEP_TITLES[s]}</span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className="flex-1 px-4 pt-6 pb-40">
        <h1 className="font-display text-3xl font-extrabold">{STEP_TITLES[step]}</h1>
        <div className="mt-6">
          {step === "servico" ? (
            <ServiceStep
              services={services}
              selectedId={selection.serviceId}
              accent={business.accent}
              onSelect={(id) => {
                const stillEligible = staff.some(
                  (s) => s.id === selection.staffId && s.serviceIds.includes(id),
                );
                update({
                  serviceId: id,
                  staffId: stillEligible ? selection.staffId : null,
                  date: null,
                  start: null,
                });
              }}
            />
          ) : null}
          {step === "profissional" && service ? (
            <StaffStep
              staff={eligible}
              selectedId={selection.staffId}
              accent={business.accent}
              onSelect={(id) => update({ staffId: id, start: null })}
            />
          ) : null}
          {step !== "servico" && !service ? (
            <p className="text-night-sub">
              Escolha um serviço primeiro.{" "}
              <button type="button" className="underline" onClick={() => goTo("servico")}>
                Ver serviços
              </button>
            </p>
          ) : null}
        </div>
      </main>

      {step !== "dados" ? (
        <footer className="bg-night/95 fixed inset-x-0 bottom-0 z-30 border-t border-white/10 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto max-w-xl">
            <Summary
              service={service}
              staffName={step === "servico" ? undefined : (chosenStaff?.name ?? "Sem preferência")}
            />
            <button
              type="button"
              disabled={!canContinue[step]}
              onClick={() => goTo(STEPS[index + 1])}
              className="mt-3 inline-flex min-h-14 w-full items-center justify-center rounded-[var(--radius-control)] text-[17px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: business.accent, color: readableTextOn(business.accent) }}
            >
              Continuar
            </button>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

function Summary({
  service,
  staffName,
  when,
}: {
  service: PublicService | null;
  staffName?: string;
  when?: string;
}) {
  if (!service) return <p className="text-night-sub text-sm">Nenhum serviço escolhido</p>;
  return (
    <div className="text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate">
          <span className="font-semibold">{service.name}</span>
          <span className="text-night-sub"> · {formatDuration(service.duration_min)}</span>
        </p>
        <p className="font-bold">{formatPrice(service.price_cents)}</p>
      </div>
      {staffName || when ? (
        <p className="text-night-sub mt-0.5 truncate">
          {[staffName, when].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
