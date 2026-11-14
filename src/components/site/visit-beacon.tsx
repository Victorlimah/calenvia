"use client";

import { useEffect } from "react";

/** Conta uma visita por sessão do navegador (CAL-085). */
export function VisitBeacon() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("cv-visit")) return;
      sessionStorage.setItem("cv-visit", "1");
    } catch {
      // sem sessionStorage: conta mesmo assim
    }
    const ref = new URLSearchParams(window.location.search).get("utm_source") ?? "";
    navigator.sendBeacon?.(`/api/metrics/visit${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`);
  }, []);
  return null;
}
