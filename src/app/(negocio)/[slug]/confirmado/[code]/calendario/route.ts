import { headers } from "next/headers";
import { HOST_KIND_HEADER, HOST_SLUG_HEADER } from "@/lib/host-headers";
import { buildIcs } from "@/lib/ics";
import { getPublicAppointment } from "@/lib/public/appointment";
import { getPublicBusiness } from "@/lib/public/business";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; code: string }> },
) {
  const { slug, code } = await params;
  const h = await headers();
  if (h.get(HOST_KIND_HEADER) !== "business" || h.get(HOST_SLUG_HEADER) !== slug) {
    return new Response("Não encontrado", { status: 404 });
  }
  const business = await getPublicBusiness(slug);
  const appt = business ? await getPublicAppointment(business.id, code) : null;
  if (!business || !appt || appt.status === "canceled")
    return new Response("Não encontrado", { status: 404 });
  const ics = buildIcs({
    uid: `${appt.id}@calenvia.com.br`,
    title: `${appt.serviceName} — ${business.name}`,
    description: `Com ${appt.staffName}. Código: ${appt.code}`,
    location: business.address,
    start: appt.start,
    end: appt.end,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agendamento-${appt.code}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
