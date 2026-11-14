"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  ACCEPTED_TYPES,
  MAX_UPLOAD_BYTES,
  compressImage,
  storagePath,
  validateImageFile,
  type ImageKind,
} from "@/lib/images";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  businessId: string;
  kind: ImageKind;
  label: string;
  /** Recebe a URL pública depois do upload. Deve salvar no banco. */
  onUploaded: (url: string) => Promise<{ ok: boolean; error?: string } | void>;
  children?: React.ReactNode;
  className?: string;
};

/** Botão que escolhe a foto, comprime no navegador e envia ao Supabase Storage. */
export function ImageUpload({ businessId, kind, label, onUploaded, children, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File) {
    setError(null);
    const invalid = validateImageFile(file);
    if (invalid) return setError(invalid);
    setBusy(true);
    try {
      let blob: Blob = file;
      let ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      try {
        const out = await compressImage(file, kind);
        blob = out.blob;
        ext = out.ext;
      } catch {
        // Navegador sem suporte (ex.: HEIC): envia o original se couber.
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error("Formato não suportado neste aparelho. Use JPG ou PNG.");
        }
      }
      if (blob.size > MAX_UPLOAD_BYTES)
        throw new Error("A foto ficou maior que 5 MB. Tente outra.");
      const supabase = createSupabaseBrowserClient();
      const path = storagePath(businessId, kind, ext);
      const { error: upErr } = await supabase.storage.from("business-media").upload(path, blob, {
        contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}`,
        upsert: false,
      });
      if (upErr) throw new Error("Não foi possível enviar a foto. Tente de novo.");
      const { data } = supabase.storage.from("business-media").getPublicUrl(path);
      const result = await onUploaded(data.publicUrl);
      if (result && !result.ok) throw new Error(result.error ?? "Não foi possível salvar.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar a foto.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-1", className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-brand disabled:opacity-60",
        )}
      >
        {busy ? <Spinner label="Enviando" /> : null}
        {children ?? label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        aria-label={label}
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f);
        }}
      />
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
