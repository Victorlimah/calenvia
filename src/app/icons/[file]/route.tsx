import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export function generateStaticParams() {
  return ["icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png"].map(
    (file) => ({ file }),
  );
}

const SIZES: Record<string, { size: number; padding: number }> = {
  "icon-192.png": { size: 192, padding: 0 },
  "icon-512.png": { size: 512, padding: 0 },
  "maskable-512.png": { size: 512, padding: 96 }, // área segura para ícones recortados
  "apple-touch-icon.png": { size: 180, padding: 0 },
};

/** Ícones do app (CAL-065): calendário com check na cor da marca. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const spec = SIZES[file];
  if (!spec) return new Response("Não encontrado", { status: 404 });
  const { size, padding } = spec;
  const inner = size - padding * 2;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#4B3FD9",
        borderRadius: padding ? 0 : size * 0.22,
      }}
    >
      <svg width={inner * 0.62} height={inner * 0.62} viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M8 3v4M16 3v4M3 10h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M9 15l2 2 4-4"
          stroke="#fff"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    { width: size, height: size },
  );
}
