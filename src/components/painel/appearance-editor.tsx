"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Hero } from "@/components/negocio/hero";
import { resolveTheme, themeCssVars } from "@/lib/themes/resolve";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { ACCENT_PRESETS, isHexColor } from "@/lib/color";
import { MAX_GALLERY_PHOTOS } from "@/lib/images";
import { cn } from "@/lib/cn";
import type { AppearanceInput, TestimonialInput } from "@/lib/validation/business";
import {
  addTestimonialAction,
  removeTestimonialAction,
  saveAppearanceAction,
} from "@/app/(painel)/painel/(app)/_actions/appearance";
import {
  addGalleryPhotoAction,
  removeGalleryPhotoAction,
  setBusinessImageAction,
} from "@/app/(painel)/painel/(app)/_actions/media";
import { ImageUpload } from "./image-upload";
import { useAction } from "./use-action";

type Props = {
  business: {
    id: string;
    name: string;
    segmentLabel: string;
    accent_color: string;
    headline: string | null;
    subheadline: string | null;
    logo_url: string | null;
    cover_url: string | null;
  };
  photos: { id: string; url: string }[];
  testimonials: { id: string; author_name: string; text: string }[];
};

export function AppearanceEditor({ business, photos, testimonials }: Props) {
  const router = useRouter();
  const { run, pending, error, message } = useAction();
  const form = useForm<AppearanceInput>({
    defaultValues: {
      accent_color: business.accent_color,
      headline: business.headline ?? "",
      subheadline: business.subheadline ?? "",
    },
  });
  const values = form.watch();
  const accent = isHexColor(values.accent_color) ? values.accent_color : business.accent_color;

  const onSubmit = form.handleSubmit((v) => run(() => saveAppearanceAction(v)));

  async function saveImage(kind: "logo" | "cover", url: string | null) {
    const r = await setBusinessImageAction(kind, url);
    router.refresh();
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="space-y-6">
        <Card className="space-y-4">
          <h2 className="font-display text-xl font-bold">Logo e capa</h2>
          <div className="flex flex-wrap items-center gap-3">
            <ImageUpload
              businessId={business.id}
              kind="logo"
              label={business.logo_url ? "Trocar logo" : "Enviar logo"}
              onUploaded={(url) => saveImage("logo", url)}
            />
            {business.logo_url ? (
              <Button variant="ghost" size="sm" onClick={() => saveImage("logo", null)}>
                Remover logo
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ImageUpload
              businessId={business.id}
              kind="cover"
              label={business.cover_url ? "Trocar foto de capa" : "Enviar foto de capa"}
              onUploaded={(url) => saveImage("cover", url)}
            />
            {business.cover_url ? (
              <Button variant="ghost" size="sm" onClick={() => saveImage("cover", null)}>
                Remover capa
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            Dica: use uma foto do seu espaço ou do seu trabalho, na horizontal.
          </p>
        </Card>

        <Card>
          <form onSubmit={onSubmit} className="space-y-5">
            <h2 className="font-display text-xl font-bold">Cor e textos</h2>
            {error ? <Alert tone="danger">{error}</Alert> : null}
            {message ? <Alert tone="success">{message}</Alert> : null}
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Cor de destaque</legend>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    aria-pressed={accent.toUpperCase() === c}
                    onClick={() => form.setValue("accent_color", c)}
                    className={cn(
                      "size-11 rounded-full border-2",
                      accent.toUpperCase() === c
                        ? "border-ink ring-2 ring-white ring-inset"
                        : "border-transparent",
                    )}
                    style={{ background: c }}
                  />
                ))}
                <label className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-dashed border-ink-2 text-xs font-semibold">
                  <span aria-hidden="true">+</span>
                  <input
                    type="color"
                    aria-label="Escolher outra cor"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={accent}
                    onChange={(e) => form.setValue("accent_color", e.target.value.toUpperCase())}
                  />
                </label>
              </div>
            </fieldset>
            <Field
              label="Título da página"
              hint="Até 90 caracteres. Deixe vazio para usar o padrão."
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  maxLength={90}
                  placeholder={`Agende seu horário na ${business.name}`}
                  {...form.register("headline")}
                />
              )}
            </Field>
            <Field label="Subtítulo" hint="Até 200 caracteres.">
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  maxLength={200}
                  {...form.register("subheadline")}
                />
              )}
            </Field>
            <Button type="submit" block loading={pending}>
              Salvar aparência
            </Button>
          </form>
        </Card>

        <GalleryCard businessId={business.id} photos={photos} />
        <TestimonialsCard testimonials={testimonials} />
      </div>

      <aside className="lg:sticky lg:top-6" aria-label="Prévia da página">
        <p className="mb-2 text-sm font-semibold text-ink-2">Prévia ao vivo</p>
        <div style={themeCssVars(resolveTheme(null, accent)) as React.CSSProperties}>
          <Hero
            preview
            name={business.name}
            segmentLabel={business.segmentLabel}
            headline={values.headline || null}
            subheadline={values.subheadline || null}
            logoUrl={business.logo_url}
            coverUrl={business.cover_url}
          />
        </div>
      </aside>
    </div>
  );
}

function GalleryCard({
  businessId,
  photos,
}: {
  businessId: string;
  photos: { id: string; url: string }[];
}) {
  const router = useRouter();
  const remove = useAction();
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Fotos do trabalho</h2>
        <p className="text-sm text-muted">
          Até {MAX_GALLERY_PHOTOS} fotos. Aparecem na sua página.
        </p>
      </div>
      {photos.length ? (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <li key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <button
                type="button"
                aria-label="Remover foto"
                className="absolute top-1 right-1 inline-flex size-9 items-center justify-center rounded-full bg-night/80 text-lg text-white"
                onClick={() => remove.run(() => removeGalleryPhotoAction(p.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {photos.length < MAX_GALLERY_PHOTOS ? (
        <ImageUpload
          businessId={businessId}
          kind="gallery"
          label="Adicionar foto"
          onUploaded={async (url) => {
            const r = await addGalleryPhotoAction(url);
            router.refresh();
            return r.ok ? { ok: true } : { ok: false, error: r.error };
          }}
        />
      ) : null}
    </Card>
  );
}

function TestimonialsCard({
  testimonials,
}: {
  testimonials: { id: string; author_name: string; text: string }[];
}) {
  const add = useAction();
  const remove = useAction();
  const [open, setOpen] = useState(false);
  const form = useForm<TestimonialInput>({ defaultValues: { author_name: "", text: "" } });
  const onSubmit = form.handleSubmit((v) =>
    add.run(() => addTestimonialAction(v), {
      onSuccess: () => {
        form.reset();
        setOpen(false);
      },
    }),
  );
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Depoimentos</h2>
        <p className="text-sm text-muted">
          Copie elogios que você recebeu no WhatsApp ou no Instagram.
        </p>
      </div>
      {testimonials.length ? (
        <ul className="space-y-2">
          {testimonials.map((t) => (
            <li key={t.id} className="flex gap-3 rounded-xl bg-paper-2 p-3">
              <div className="min-w-0 flex-1 text-sm">
                <p>“{t.text}”</p>
                <p className="mt-1 font-semibold">{t.author_name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove.run(() => removeTestimonialAction(t.id))}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {open ? (
        <form onSubmit={onSubmit} className="space-y-3">
          {add.error ? <Alert tone="danger">{add.error}</Alert> : null}
          <Field label="Nome de quem falou">
            {({ id }) => <Input id={id} maxLength={60} {...form.register("author_name")} />}
          </Field>
          <Field label="Depoimento">
            {({ id }) => <Textarea id={id} maxLength={400} {...form.register("text")} />}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={add.pending}>
              Adicionar
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          + Adicionar depoimento
        </Button>
      )}
    </Card>
  );
}
