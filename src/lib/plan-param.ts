import type { PlanId } from "./plans";

export type { PlanId };

export const PLAN_LABELS: Record<PlanId, string> = {
  basic: "Básico",
  pro: "Pro",
  pro_plus: "Pro+",
};

/** Lê ?plano=basic|pro|pro_plus (aceita "pro+" e "proplus"). */
export function parsePlanParam(value: string | null | undefined): PlanId | null {
  const v = (value ?? "").toLowerCase().replace(/\s/g, "");
  if (v === "basic" || v === "basico" || v === "básico") return "basic";
  if (v === "pro") return "pro";
  if (v === "pro_plus" || v === "pro+" || v === "proplus" || v === "pro-plus") return "pro_plus";
  return null;
}
