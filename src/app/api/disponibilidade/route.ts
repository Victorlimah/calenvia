import { NextResponse, type NextRequest } from "next/server";
import { queryPublicAvailability } from "@/lib/public/availability-query";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Horários livres do fluxo público (GET). O passo de horários busca por aqui com fetch:
 * as server actions entram numa fila do roteador do Next e, como o fluxo atualiza a URL a
 * cada escolha, uma action em andamento podia ficar pendente para sempre.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const result = await queryPublicAvailability(
    {
      slug: q.get("slug") ?? "",
      serviceId: q.get("servico") ?? "",
      staffId: q.get("profissional") || null,
      from: q.get("de") || null,
      date: q.get("data") || null,
      manageCode: q.get("codigo") || null,
    },
    clientIp(req.headers),
  );
  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: { "Cache-Control": "no-store" },
  });
}
