"use client";

import { useEffect } from "react";

/**
 * Animação de entrada ao rolar. Sem JavaScript (ou com movimento reduzido),
 * tudo aparece normalmente: só escondemos os blocos depois de ligar o observador.
 */
export function RevealOnScroll({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = [...root.querySelectorAll<HTMLElement>(".reveal")];
    const vh = window.innerHeight;
    // O que já está na tela não pisca.
    els.forEach((el) => {
      if (el.getBoundingClientRect().top < vh) el.classList.add("in");
    });
    root.classList.add("lp-js");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => !el.classList.contains("in") && io.observe(el));
    return () => io.disconnect();
  }, [rootId]);
  return null;
}
