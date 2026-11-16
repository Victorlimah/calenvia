/**
 * Gráficos do painel em SVG próprio (M5: sem biblioteca nova). Uma série por gráfico, na cor
 * da marca; o título nomeia a série. Cada gráfico tem tabela alternativa ("Ver em tabela") e
 * estado vazio. Passar o mouse (ou focar) numa barra mostra o valor.
 */
import { cn } from "@/lib/cn";

export type BarDatum = { key: string; label: string; value: number; display: string };

const H = 160; // altura da área de barras (px do viewBox)
const GAP = 2;

/** Barras verticais (ex.: faturamento por dia). */
export function BarChart({
  title,
  data,
  empty = "Sem dados no período.",
  className,
}: {
  title: string;
  data: BarDatum[];
  empty?: string;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const hasData = max > 0;
  const w = Math.max(data.length * 24, 240);
  const barW = Math.max(w / Math.max(data.length, 1) - GAP, 2);
  // Rótulos do eixo X: no máximo ~8, para não encavalar.
  const step = Math.max(Math.ceil(data.length / 8), 1);
  const peak = data.reduce((best, d) => (d.value > (best?.value ?? -1) ? d : best), data[0]);
  return (
    <figure className={cn("space-y-2", className)}>
      <figcaption className="font-semibold text-ink">{title}</figcaption>
      {!hasData ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          {empty}
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${w} ${H + 22}`}
            className="h-auto w-full overflow-visible"
            role="img"
            aria-label={`${title}. Maior valor: ${peak.display} em ${peak.label}. Tabela com todos os valores logo abaixo.`}
          >
            <line x1={0} x2={w} y1={H} y2={H} className="stroke-line" strokeWidth={1} />
            {data.map((d, i) => {
              const h = (d.value / max) * (H - 18);
              const x = i * (barW + GAP);
              const y = H - h;
              return (
                <g key={d.key} className="group">
                  <title>{`${d.label}: ${d.display}`}</title>
                  {/* área de hover maior que a barra */}
                  <rect x={x} y={0} width={barW + GAP} height={H} fill="transparent" />
                  {h > 0 ? (
                    <path
                      d={roundedTop(x, y, barW, h, Math.min(4, barW / 2, h))}
                      className="fill-brand transition-opacity group-hover:opacity-80"
                    />
                  ) : null}
                  <text
                    x={x + barW / 2}
                    y={Math.max(y - 4, 10)}
                    textAnchor="middle"
                    className="pointer-events-none fill-ink text-[10px] font-semibold opacity-0 group-hover:opacity-100"
                  >
                    {d.display}
                  </text>
                  {i % step === 0 ? (
                    <text
                      x={x + barW / 2}
                      y={H + 15}
                      textAnchor="middle"
                      className="fill-muted text-[10px]"
                    >
                      {d.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          <DataTable
            caption={title}
            rows={data.map((d) => [d.label, d.display])}
            head={["Período", "Valor"]}
          />
        </>
      )}
    </figure>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Barras horizontais com rótulo e valor escritos (ex.: por serviço, por profissional). */
export function HBarList({
  title,
  rows,
  empty = "Sem dados no período.",
}: {
  title: string;
  rows: { key: string; label: string; value: number; display: string; detail?: string }[];
  empty?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  return (
    <figure className="space-y-2">
      <figcaption className="font-semibold text-ink">{title}</figcaption>
      {rows.length === 0 || max === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-ink">{r.label}</span>
                <span className="shrink-0 font-semibold text-ink tabular-nums">
                  {r.display}
                  {r.detail ? <span className="font-normal text-muted"> · {r.detail}</span> : null}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-paper-2" aria-hidden="true">
                <div
                  className="h-2 rounded-full bg-brand"
                  style={{ width: `${Math.max((r.value / max) * 100, 2)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

/** Tabela alternativa dos gráficos (acessibilidade): recolhida por padrão. */
export function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: string[][];
}) {
  return (
    <details className="text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-brand">
        Ver em tabela
      </summary>
      <div className="max-h-72 overflow-auto rounded-xl border border-line">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-paper-2 text-ink-2">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={cn("px-3 py-1.5", j > 0 && "tabular-nums")}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Cartão de número com comparação ao período anterior. */
export function StatCard({
  label,
  value,
  delta,
  hint,
  goodWhenUp = true,
}: {
  label: string;
  value: string;
  /** Variação (0.1 = +10%); null = sem comparação. */
  delta?: number | null;
  hint?: string;
  goodWhenUp?: boolean;
}) {
  const showDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const up = showDelta && delta! > 0;
  const good = showDelta && (delta === 0 || up === goodWhenUp);
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 font-display text-xl font-bold text-ink tabular-nums">{value}</p>
      {showDelta ? (
        <p className={cn("text-xs font-semibold", good ? "text-success" : "text-danger")}>
          <span aria-hidden="true">{delta! > 0 ? "▲" : delta! < 0 ? "▼" : "="}</span>{" "}
          {formatDelta(delta!)} <span className="font-normal text-muted">vs. anterior</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function formatDelta(delta: number): string {
  const pct = Math.round(delta * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export function formatPercent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}
