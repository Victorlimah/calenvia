"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Prévia isolada (CAL-148): um iframe vazio (about:blank, sem navegar e sem carregar o painel)
 * onde o React desenha por portal. Assim as regras de tela (md:) seguem a largura escolhida
 * — 390 px ou 1280 px — e não a janela do painel. O CSS da página é copiado para dentro e
 * cliques em links são ignorados.
 */
export function PreviewFrame({
  width,
  title,
  children,
}: {
  width: number;
  title: string;
  children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState({ w: width, h: 700 });

  useEffect(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(
      '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>',
    );
    doc.close();
    const copy = (node: Node) => {
      if (
        node instanceof HTMLStyleElement ||
        (node instanceof HTMLLinkElement && node.rel === "stylesheet")
      ) {
        doc.head.appendChild(node.cloneNode(true));
      }
    };
    document.head.querySelectorAll("style, link[rel=stylesheet]").forEach(copy);
    // Estilos que chegam depois (fontes e trechos carregados sob demanda).
    const observer = new MutationObserver((list) =>
      list.forEach((m) => m.addedNodes.forEach(copy)),
    );
    observer.observe(document.head, { childList: true });
    doc.documentElement.className = document.documentElement.className;
    doc.body.className = document.body.className;
    doc.body.style.margin = "0";
    const block = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("a")) e.preventDefault();
    };
    doc.addEventListener("click", block, true);
    setBody(doc.body);
    return () => {
      observer.disconnect();
      doc.removeEventListener("click", block, true);
    };
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = Math.min(1, box.w / width);
  return (
    <div ref={boxRef} className="relative size-full overflow-hidden">
      <iframe
        ref={frameRef}
        title={title}
        className="absolute top-0 left-1/2 origin-top border-0 bg-white shadow-xl"
        style={{
          width,
          height: box.h / scale,
          transform: `translateX(-50%) scale(${scale})`,
        }}
      />
      {body ? createPortal(children, body) : null}
    </div>
  );
}
