"use client";

import { useEffect } from "react";

/** Marca o <html> quando o React hidrata (usado pelos testes E2E para não clicar cedo demais). */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1";
  }, []);
  return null;
}
