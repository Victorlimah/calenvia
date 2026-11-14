"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseFlowParams, type FlowState } from "./flow-params";
import type { Selection, Step } from "./types";

export { parseFlowParams, type FlowState };

function writeToUrl(state: FlowState, mode: "push" | "replace") {
  const next = new URLSearchParams();
  next.set("passo", state.step);
  const { serviceId, staffId, date, start } = state.selection;
  if (serviceId) next.set("servico", serviceId);
  if (state.step !== "servico" || staffId) next.set("profissional", staffId ?? "qualquer");
  if (date) next.set("data", date);
  if (start) next.set("hora", start);
  const url = `${window.location.pathname}?${next.toString()}`;
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

/**
 * Estado do fluxo, espelhado na URL (?passo=&servico=&profissional=&data=&hora=)
 * para que o botão voltar do celular e o recarregar da página funcionem.
 * O estado inicial vem do servidor (searchParams) para não haver diferença na hidratação.
 */
export function useFlowState(initial: FlowState) {
  const [state, setState] = useState<FlowState>(initial);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const onPop = () => {
      const next = parseFlowParams(new URLSearchParams(window.location.search));
      stateRef.current = next;
      setState(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const update = useCallback(
    (patch: Partial<Selection> & { step?: Step }, mode: "push" | "replace" = "replace") => {
      const prev = stateRef.current;
      const { step, ...sel } = patch;
      const next: FlowState = { step: step ?? prev.step, selection: { ...prev.selection, ...sel } };
      stateRef.current = next;
      setState(next);
      writeToUrl(next, mode);
    },
    [],
  );

  return { step: state.step, selection: state.selection, update };
}
