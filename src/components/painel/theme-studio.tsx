"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PublicPage } from "@/components/negocio/public-page";
import type { PageData } from "@/components/negocio/page-data";
import { Alert, Badge, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { themeFromTemplate } from "@/lib/themes/apply";
import { findFontPair, fontPairVars } from "@/lib/themes/font-pairs";
import { ALL_FONT_CLASSNAMES, fontPairClassName } from "@/lib/themes/fonts";
import { logoPlacements, pickLogo } from "@/lib/themes/logo";
import { findPalette, presetPalette } from "@/lib/themes/palettes";
import { getTemplate, TEMPLATES } from "@/lib/themes/registry";
import { NOTURNO_PALETTE, resolveTheme, themeCssVars } from "@/lib/themes/resolve";
import { needsSample, withSampleData } from "@/lib/themes/sample";
import { surpriseTheme } from "@/lib/themes/suggest";
import type { Theme } from "@/lib/themes/schema";
import type { TemplateMeta } from "@/lib/themes/template-meta";
import { saveThemeAction } from "@/app/(painel)/painel/(app)/_actions/appearance";
import { setBusinessImageAction } from "@/app/(painel)/painel/(app)/_actions/media";
import { LogoUpload } from "./logo-upload";
import { PaletteEditor } from "./palette-editor";
import { PreviewFrame } from "./preview-frame";
import { SectionsEditor } from "./sections-editor";
import { StyleEditor } from "./style-editor";
import { useAction } from "./use-action";

export type StudioProps = {
  businessId: string;
  data: PageData;
  initialTheme: Theme;
  accent: string;
  logoUrl: string | null;
  logoAltUrl: string | null;
  publicUrl: string;
  /** Ordem da galeria (CAL-149): ids dos templates, os indicados primeiro. */
  order?: string[];
  /** Ids indicados para o segmento (selo "Combina com …"). */
  recommended?: string[];
  segmentLabel?: string;
  /** Depois de salvar (ex.: onboarding segue para o próximo passo). */
  afterSaveHref?: string;
};

/** Cartão da galeria: miniatura com fundo, fonte e botão do template (sem imagem pesada). */
function TemplateCard({
  meta,
  current,
  recommended,
  segmentLabel,
  onOpen,
}: {
  meta: TemplateMeta;
  current: boolean;
  recommended: boolean;
  segmentLabel?: string;
  onOpen: () => void;
}) {
  const preset = findPalette(meta.paletteId);
  const p = preset ? presetPalette(preset, meta.mode) : { ...NOTURNO_PALETTE, primary: "#E8B04A" };
  const r = resolveTheme({ ...themeFromTemplate(meta), palette: p });
  const fonts = fontPairVars(meta.fontPairId);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Ver o tema ${meta.name}${current ? " (em uso)" : ""}`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white text-left transition-shadow hover:shadow-lg focus-visible:ring-4 focus-visible:ring-brand-soft"
    >
      <span
        aria-hidden="true"
        className="block h-36 w-full p-4"
        style={{ background: r.colors.bg, color: r.colors.text }}
      >
        <span
          className="block text-2xl leading-tight font-bold"
          style={{ fontFamily: fonts["--t-font-display"] }}
        >
          Aa · {meta.name}
        </span>
        <span
          className="mt-1 block text-xs"
          style={{ fontFamily: fonts["--t-font-body"], color: r.colors.sub }}
        >
          {findFontPair(meta.fontPairId).name}
        </span>
        <span
          className="mt-4 inline-block px-3 py-1.5 text-xs font-bold"
          style={{
            background: r.colors.primary,
            color: r.colors.primaryFg,
            borderRadius: meta.radius === "square" ? 4 : meta.radius === "round" ? 999 : 10,
          }}
        >
          Agendar meu horário
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-1 p-4">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-lg font-bold text-ink">{meta.name}</span>
          {current ? <Badge tone="success">Em uso</Badge> : null}
          {recommended && segmentLabel ? <Badge>Combina com {segmentLabel}</Badge> : null}
        </span>
        <span className="text-sm text-ink-2">{meta.description}</span>
      </span>
    </button>
  );
}

const TABS = [
  ["cores", "Cores"],
  ["estilo", "Fontes e estilo"],
  ["secoes", "Seções"],
  ["logo", "Logo"],
] as const;

export function ThemeStudio(props: StudioProps) {
  const { data, initialTheme, accent, publicUrl } = props;
  const router = useRouter();
  const save = useAction();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [saved, setSaved] = useState(() => JSON.stringify(initialTheme));
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("cores");
  const dirty = JSON.stringify(theme) !== saved;

  // Aviso ao sair com alterações não salvas.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const savedTheme = useMemo(() => JSON.parse(saved) as Theme, [saved]);
  const order = props.order ?? TEMPLATES.map((t) => t.meta.id);
  const metas = order.map((id) => getTemplate(id).meta);

  function openTemplate(meta: TemplateMeta) {
    setTheme(
      meta.id === savedTheme.templateId
        ? savedTheme
        : themeFromTemplate(meta, { accent, base: savedTheme }),
    );
    setOpen(true);
  }

  function back() {
    if (dirty && !confirm("Descartar as mudanças deste tema?")) return;
    setTheme(savedTheme);
    setOpen(false);
  }

  const preview = useMemo(() => {
    const d = withSampleData({ ...data, preview: true });
    return {
      ...d,
      logo: {
        url: pickLogo({
          name: d.name,
          logoUrl: props.logoUrl,
          logoAltUrl: props.logoAltUrl,
          mode: theme.palette.mode,
          show: theme.logo.show,
        }).url,
        placements: logoPlacements(theme),
      },
    };
  }, [data, props.logoUrl, props.logoAltUrl, theme]);
  const sample = needsSample(data);
  const template = getTemplate(theme.templateId);

  async function saveImage(kind: "logo" | "logo_alt", url: string | null) {
    const r = await setBusinessImageAction(kind, url);
    router.refresh();
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  if (!open) {
    return (
      <div className={cn("space-y-4", ALL_FONT_CLASSNAMES)}>
        {save.message ? <Alert tone="success">{save.message}</Alert> : null}
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setTheme(
              surpriseTheme(
                TEMPLATES.map((t) => t.meta),
                { segment: data.segment, base: savedTheme, accent },
              ),
            );
            setOpen(true);
          }}
        >
          ✨ Surpreenda-me
        </Button>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Temas">
          {metas.map((meta) => (
            <li key={meta.id}>
              <TemplateCard
                meta={meta}
                current={meta.id === savedTheme.templateId}
                recommended={props.recommended?.includes(meta.id) ?? false}
                segmentLabel={props.segmentLabel}
                onOpen={() => openTemplate(meta)}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const controls = (
    <div className="space-y-4">
      <div role="tablist" aria-label="Ajustes do tema" className="flex gap-1 overflow-x-auto">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold",
              tab === id ? "bg-ink text-white" : "bg-paper-2 text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={TABS.find((t) => t[0] === tab)?.[1]}>
        {tab === "cores" ? (
          <PaletteEditor
            key={theme.templateId}
            theme={theme}
            onChange={setTheme}
            logoUrl={props.logoUrl}
          />
        ) : tab === "estilo" ? (
          <StyleEditor theme={theme} onChange={setTheme} />
        ) : tab === "secoes" ? (
          <SectionsEditor theme={theme} onChange={setTheme} />
        ) : (
          <div className="space-y-3">
            <LogoUpload
              businessId={props.businessId}
              kind="logo"
              free={theme.logo.shape === "free"}
              label={props.logoUrl ? "Trocar logo" : "Subir logo"}
              onUploaded={(url) => saveImage("logo", url)}
            />
            {props.logoUrl ? (
              <Button variant="ghost" size="sm" onClick={() => saveImage("logo", null)}>
                Remover logo
              </Button>
            ) : (
              <p className="text-sm text-ink-2">Sem logo, a página usa as iniciais do negócio.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-paper-2"
      role="dialog"
      aria-modal="true"
      aria-label={`Prévia do tema ${template.meta.name}`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2">
        <Button variant="ghost" size="sm" onClick={back}>
          ← Voltar
        </Button>
        <p className="min-w-0 flex-1 truncate font-display font-bold text-ink">
          {template.meta.name}
        </p>
        <div
          className="inline-flex rounded-full bg-paper-2 p-1"
          role="group"
          aria-label="Tamanho da prévia"
        >
          {(
            [
              ["phone", "Celular"],
              ["desktop", "Computador"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={device === id}
              onClick={() => setDevice(id)}
              className={cn(
                "min-h-11 rounded-full px-3 text-sm font-semibold",
                device === id ? "bg-white text-ink shadow-sm" : "text-ink-2",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden min-h-11 items-center px-2 text-sm font-semibold text-brand underline-offset-2 hover:underline sm:inline-flex"
        >
          Ver como o cliente vê
        </a>
      </div>

      <p className="sr-only" aria-live="polite">
        Prévia atualizada: tema {template.meta.name},{" "}
        {theme.palette.mode === "dark" ? "escuro" : "claro"}.
      </p>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col p-3">
          {sample ? (
            <p className="mb-2 rounded-[var(--radius-control)] bg-warning-50 px-3 py-2 text-center text-sm font-semibold text-warning">
              Exemplo — seus dados entram aqui quando você cadastrar serviços e equipe.
            </p>
          ) : null}
          <div className="min-h-0 flex-1">
            <PreviewFrame
              width={device === "phone" ? 390 : 1280}
              title={`Prévia da página com o tema ${template.meta.name}`}
            >
              <div
                data-theme-root=""
                className={`min-h-dvh bg-t-bg text-t-text ${fontPairClassName(theme.fontPairId)}`}
                style={themeCssVars(resolveTheme(theme)) as React.CSSProperties}
              >
                <PublicPage data={preview} theme={theme} />
              </div>
            </PreviewFrame>
          </div>
        </div>
        <aside className="max-h-[45dvh] overflow-y-auto border-t border-line bg-white p-4 lg:max-h-none lg:w-[420px] lg:border-t-0 lg:border-l">
          {controls}
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-white px-3 py-3">
        {save.error ? <Alert tone="danger">{save.error}</Alert> : null}
        <p className="min-w-0 flex-1 text-sm text-ink-2">
          {dirty ? "Alterações não salvas" : "Nada mudou ainda"}
        </p>
        <Button
          loading={save.pending}
          onClick={() =>
            save.run(() => saveThemeAction(theme), {
              onSuccess: () => {
                setSaved(JSON.stringify(theme));
                setOpen(false);
                if (props.afterSaveHref) router.push(props.afterSaveHref);
              },
            })
          }
        >
          Usar este tema
        </Button>
      </div>
    </div>
  );
}
