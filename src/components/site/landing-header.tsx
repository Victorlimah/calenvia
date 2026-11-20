"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";

/** Cabeçalho da landing com menu no celular. */
export function LandingHeader({
  loginUrl,
  billing = false,
}: {
  loginUrl: string;
  /** Cobrança ligada: mostra "Planos"; senão, "Pedir acesso" (CAL-138). */
  billing?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cta = billing ? "#planos" : "#acesso";
  const close = () => setOpen(false);
  return (
    <header className="header">
      <div className="header-inner container">
        <a href="#topo" className="logo" aria-label="Calenvia, início">
          <span className="logo-mark">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M8 3v4M16 3v4M3 10h18" />
              <path d="M9 15l2 2 4-4" />
            </svg>
          </span>
          <span className="logo-text">Calenvia</span>
        </a>
        <button
          type="button"
          className="menu-toggle"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <nav className={cn("nav", open && "open")} id="menu" aria-label="Principal">
          <a href="#como-funciona" onClick={close}>
            Como funciona
          </a>
          <a href="#recursos" onClick={close}>
            Recursos
          </a>
          {billing ? (
            <a href={cta} onClick={close}>
              Planos
            </a>
          ) : null}
          <a href="#duvidas" onClick={close}>
            Dúvidas
          </a>
          <a href={loginUrl}>Entrar</a>
          <a href={cta} className="btn btn-dark" onClick={close}>
            {billing ? "Começar agora" : "Pedir meu acesso"}
          </a>
        </nav>
      </div>
    </header>
  );
}
