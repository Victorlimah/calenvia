import { STEPS, type Selection, type Step } from "./types";

export type FlowState = { step: Step; selection: Selection };

export function parseFlowParams(params: URLSearchParams): FlowState {
  const raw = params.get("passo");
  const staff = params.get("profissional");
  return {
    step: (STEPS as readonly string[]).includes(raw ?? "") ? (raw as Step) : "servico",
    selection: {
      serviceId: params.get("servico"),
      staffId: staff && staff !== "qualquer" ? staff : null,
      date: params.get("data"),
      start: params.get("hora"),
    },
  };
}
