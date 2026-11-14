"use client";

import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      appearance: "interaction-only";
      language: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
};

/**
 * Captcha invisível (Cloudflare Turnstile). Só aparece quando NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * existe; na maioria das vezes o cliente nem vê. Entrega o token por onToken.
 */
export function Captcha({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let widget: string | null = null;
    let alive = true;
    const render = () => {
      const ts = (window as unknown as { turnstile?: Turnstile }).turnstile;
      if (!alive || !ts || !ref.current) return;
      widget = ts.render(ref.current, {
        sitekey: SITE_KEY,
        appearance: "interaction-only",
        language: "pt-br",
        callback: (t) => onToken(t),
        "expired-callback": () => onToken(null),
      });
    };
    if ((window as unknown as { turnstile?: Turnstile }).turnstile) render();
    else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
      if (!s) {
        s = document.createElement("script");
        s.src = SCRIPT;
        s.async = true;
        document.head.appendChild(s);
      }
      s.addEventListener("load", render);
    }
    return () => {
      alive = false;
      const ts = (window as unknown as { turnstile?: Turnstile }).turnstile;
      if (widget && ts) ts.remove(widget);
    };
  }, [onToken]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="min-h-0" />;
}
