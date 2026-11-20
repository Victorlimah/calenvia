import { NextResponse } from "next/server";
import { accessRequestsCsv } from "@/lib/access/requests";
import { getPlatformAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** CSV da lista de espera (CAL-138). Só a equipe da Calenvia. */
export async function GET() {
  if (!(await getPlatformAdmin())) return new NextResponse("Não encontrado.", { status: 404 });
  const { data } = await createSupabaseAdminClient()
    .from("access_requests")
    .select("created_at, name, business_name, whatsapp, segment, city, status")
    .order("created_at", { ascending: false });
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(accessRequestsCsv(data ?? []), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lista-de-espera-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
