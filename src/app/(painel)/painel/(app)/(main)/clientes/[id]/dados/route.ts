import { NextResponse } from "next/server";
import { loadAppointmentPrices } from "@/lib/appointments/prices";
import { getCurrentMember } from "@/lib/business/current";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** LGPD (CAL-091): exporta tudo o que o negócio guarda sobre um cliente, em JSON. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member || !can(member, "customers.erase"))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { business } = member;
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
      "id, starts_at, ends_at, status, source, notes, created_at, canceled_at, services(name), staff_members(name), messages(type, status, sent_at)",
    )
    .eq("customer_id", customer.id)
    .eq("business_id", business.id)
    .order("starts_at");
  const prices = await loadAppointmentPrices(
    supabase,
    business.id,
    (appointments ?? []).map((a) => a.id),
  );
  const body = {
    exportado_em: new Date().toISOString(),
    controlador: { negocio: business.name, endereco: business.address },
    operador: "Calenvia",
    cliente: customer,
    agendamentos: (appointments ?? []).map(({ id: apptId, ...a }) => ({
      ...a,
      price_cents: prices.get(apptId) ?? null,
    })),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cliente-${customer.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
