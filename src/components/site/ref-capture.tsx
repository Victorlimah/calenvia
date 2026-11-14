"use client";

import { useEffect } from "react";

/** Indicação (CAL-109): guarda ?ref= e o leva para os links de cadastro do site. */
export function RefCapture() {
  useEffect(() => {
    let ref = new URLSearchParams(window.location.search).get("ref");
    try {
      if (ref && /^[a-z0-9]{6,12}$/i.test(ref)) localStorage.setItem("cv-ref", ref.toLowerCase());
      ref = localStorage.getItem("cv-ref");
    } catch {
      // sem armazenamento: usa só o da URL
    }
    if (!ref || !/^[a-z0-9]{6,12}$/i.test(ref)) return;
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/cadastro"]').forEach((a) => {
      const url = new URL(a.href);
      url.searchParams.set("ref", ref!.toLowerCase());
      a.href = url.toString();
    });
  }, []);
  return null;
}
