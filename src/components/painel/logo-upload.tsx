"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Alert, Button } from "@/components/ui";
import {
  LOGO_ACCEPTED_TYPES,
  logoCropRect,
  MAX_DIMENSION,
  storagePath,
  validateLogoFile,
} from "@/lib/images";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  businessId: string;
  kind: "logo" | "logo_alt";
  label: string;
  /** "free" mantém a proporção do logo (sem recorte quadrado). */
  free?: boolean;
  onUploaded: (url: string) => Promise<{ ok: boolean; error?: string } | void>;
};

const OUT = MAX_DIMENSION.logo;

/**
 * Logo (CAL-143): escolhe PNG/JPG/SVG/WebP de até 2 MB, ajusta zoom e posição num quadrado e
 * salva como PNG de até 512 px (o SVG é convertido no navegador; nunca vai para o servidor).
 */
export function LogoUpload({ businessId, kind, label, free = false, onUploaded }: Props) {
  const inputId = useId();
  const zoomId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => () => void (srcUrl && URL.revokeObjectURL(srcUrl)), [srcUrl]);

  function pick(file: File) {
    setError(null);
    const invalid = validateLogoFile(file);
    if (invalid) return setError(invalid);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      // SVG sem tamanho declarado: usa um quadrado padrão.
      if (!image.naturalWidth || !image.naturalHeight) {
        image.width = OUT;
        image.height = OUT;
      }
      setImg(image);
      setSrcUrl(url);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.onerror = () => setError("Não conseguimos abrir esse arquivo. Tente outro.");
    image.src = url;
  }

  const w = img ? img.naturalWidth || img.width : 1;
  const h = img ? img.naturalHeight || img.height : 1;

  async function save() {
    if (!img) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      if (free) {
        const ratio = Math.min(1, OUT / Math.max(w, h));
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } else {
        const r = logoCropRect(w, h, zoom, offset.x, offset.y);
        const out = Math.min(OUT, Math.round(r.size));
        canvas.width = Math.max(out, 64);
        canvas.height = canvas.width;
        ctx.drawImage(img, r.sx, r.sy, r.size, r.size, 0, 0, canvas.width, canvas.height);
      }
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("Não foi possível preparar o logo.");
      const supabase = createSupabaseBrowserClient();
      const path = storagePath(businessId, kind, "png");
      const { error: upErr } = await supabase.storage
        .from("business-media")
        .upload(path, blob, { contentType: "image/png", upsert: false });
      if (upErr) throw new Error("Não foi possível enviar o logo. Tente de novo.");
      const { data } = supabase.storage.from("business-media").getPublicUrl(path);
      const result = await onUploaded(data.publicUrl);
      if (result && !result.ok) throw new Error(result.error ?? "Não foi possível salvar o logo.");
      setImg(null);
      setSrcUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar o logo.");
    } finally {
      setBusy(false);
    }
  }

  // Prévia: mesma conta do recorte, em CSS (quadro de 200 px).
  const FRAME = 200;
  const r = img ? logoCropRect(w, h, zoom, offset.x, offset.y) : null;
  const scale = r ? FRAME / r.size : 1;

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={LOGO_ACCEPTED_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
          e.target.value = "";
        }}
      />
      {!img ? (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          {label}
        </Button>
      ) : (
        <div className="space-y-3 rounded-[var(--radius-control)] border border-line bg-paper-2 p-3">
          <p className="text-sm font-semibold text-ink">
            {free ? "Prévia do logo" : "Arraste para posicionar e ajuste o zoom"}
          </p>
          <div
            className="relative mx-auto [touch-action:none] overflow-hidden rounded-[var(--radius-control)] border border-line bg-white"
            style={{ width: FRAME, height: FRAME, cursor: free ? "default" : "grab" }}
            onPointerDown={(e) => {
              if (free) return;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
            }}
            onPointerMove={(e) => {
              if (!drag.current || !r) return;
              const maxX = (w - r.size) / 2 || 1;
              const maxY = (h - r.size) / 2 || 1;
              const dx = (e.clientX - drag.current.x) / scale / maxX;
              const dy = (e.clientY - drag.current.y) / scale / maxY;
              setOffset({
                x: Math.max(-1, Math.min(1, drag.current.ox - dx)),
                y: Math.max(-1, Math.min(1, drag.current.oy - dy)),
              });
            }}
            onPointerUp={() => (drag.current = null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={srcUrl ?? ""}
              alt="Prévia do logo"
              draggable={false}
              className="absolute max-w-none select-none"
              style={
                free
                  ? { inset: 0, width: "100%", height: "100%", objectFit: "contain" }
                  : {
                      width: w * scale,
                      height: h * scale,
                      left: -r!.sx * scale,
                      top: -r!.sy * scale,
                    }
              }
            />
          </div>
          {!free ? (
            <div>
              <label htmlFor={zoomId} className="mb-1 block text-sm font-semibold text-ink">
                Zoom
              </label>
              <input
                id={zoomId}
                type="range"
                min={1}
                max={4}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="min-h-11 w-full accent-brand"
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={busy} onClick={save}>
              Salvar logo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setImg(null);
                setSrcUrl(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
