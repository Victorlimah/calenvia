import { NextResponse } from "next/server";
import { getCurrentBusiness } from "@/lib/business/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** LGPD (CAL-091): exporta tudo o que o negócio guarda sobre um cliente, em JSON. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, whatsapp, created_at, last_visit_at, opted_out_at, erased_at")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "starts_at, ends_at, status, source, price_cents, notes, created_at, canceled_at, services(name), staff_members(name), messages(type, status, sent_at)",
    )
    .eq("customer_id", customer.id)
    .eq("business_id", business.id)
    .order("starts_at");
  const body = {
    exportado_em: new Date().toISOString(),
    controlador: { negocio: business.name, endereco: business.address },
    operador: "Calenvia",
    cliente: customer,
    agendamentos: appointments ?? [],
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cliente-${customer.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
