"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export const ONBOARDING_STEPS = [
  { path: "/onboarding", label: "Negócio" },
  { path: "/onboarding/servicos", label: "Serviços" },
  { path: "/onboarding/profissionais", label: "Equipe" },
  { path: "/onboarding/horarios", label: "Horários" },
  { path: "/onboarding/tema", label: "Tema" },
  { path: "/onboarding/pronto", label: "Pronto" },
];

export function OnboardingProgress() {
  const pathname = usePathname().replace(/^\/painel/, "");
  const current = Math.max(
    0,
    ONBOARDING_STEPS.findIndex((s) => s.path === pathname),
  );
  return (
    <nav aria-label="Etapas do cadastro" className="mt-5">
      <p className="text-sm font-medium text-ink-2">
        Etapa {current + 1} de {ONBOARDING_STEPS.length}: {ONBOARDING_STEPS[current].label}
      </p>
      <ol className="mt-2 grid grid-cols-6 gap-1.5">
        {ONBOARDING_STEPS.map((s, i) => (
          <li
            key={s.path}
            aria-current={i === current ? "step" : undefined}
            className={cn("h-1.5 rounded-full", i <= current ? "bg-brand" : "bg-line")}
          >
            <span className="sr-only">{s.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
