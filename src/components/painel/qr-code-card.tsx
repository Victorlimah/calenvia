import { Card } from "@/components/ui";
import { qrMatrix, qrSvgPath } from "@/lib/qr";

/** QR code da página (CAL-118): para imprimir no balcão, cartão ou espelho. */
export function QrCodeCard({
  url,
  name,
  color = "#14161A",
}: {
  url: string;
  name: string;
  /** Cor dos módulos (tema do negócio, CAL-150); sempre escura o bastante para ler. */
  color?: string;
}) {
  const { path, size } = qrSvgPath(qrMatrix(url));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="1024" height="1024" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="${color}"/></svg>`;
  const href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <Card className="flex items-center gap-4 p-4">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`QR code que abre a página de agendamento: ${url}`}
        shapeRendering="crispEdges"
        className="size-28 shrink-0 rounded-lg border border-line bg-white"
      >
        <path d={path} fill={color} />
      </svg>
      <div className="min-w-0 space-y-2">
        <p className="font-semibold text-ink">QR code da página</p>
        <p className="text-sm text-ink-2">
          Imprima e deixe no balcão: o cliente aponta a câmera e já cai no agendamento.
        </p>
        <a
          href={href}
          download={`qr-code-${name}.svg`}
          className="inline-flex min-h-11 items-center font-semibold text-brand underline-offset-4 hover:underline"
        >
          Baixar QR code
        </a>
      </div>
    </Card>
  );
}
