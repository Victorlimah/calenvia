import type { SupabaseClient } from "@supabase/supabase-js";
import { APPOINTMENT_COLUMNS } from "@/lib/appointments/columns";
import { localDateTimeToUtc } from "@/lib/dates";
import { WALK_IN_PHONE } from "@/lib/phone";
import type { Database, Tables } from "@/lib/supabase/types";
import { upsertCustomer } from "./customers";
import { BookingError, toBookingError } from "./errors";

type Client = SupabaseClient<Database>;

export type RegisterInput = {
  business: Pick<Tables<"businesses">, "id" | "timezone">;
  serviceId: string;
  staffId: string;
  /** Dia e hora locais do atendimento ("YYYY-MM-DD", "HH:mm"). */
  date: string;
  time: string;
  priceCents: number;
  /** Cliente já cadastrado, ou nome (+ WhatsApp opcional) para cadastrar. */
  customerId?: string | null;
  customer?: { name: string; whatsapp?: string | null } | null;
  notes?: string | null;
  /** Forma de pagamento (CAL-128). */
  paymentMethod?: "cash" | "pix" | "card" | "other" | null;
  now?: Date;
};

export type RegisterErrorCode = "future" | "overlap";

/** Cliente "avulso" do negócio: quem não deixou WhatsApp. Nunca recebe mensagem. */
async function walkInCustomer(db: Client, businessId: string) {
  const { data, error } = await db
    .from("customers")
    .upsert(
      {
        business_id: businessId,
        whatsapp: WALK_IN_PHONE,
        name: "Cliente avulso",
        opted_out_at: new Date().toISOString(),
      },
      { onConflict: "business_id,whatsapp", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (data) return data.id;
  const { data: existing } = await db
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .eq("whatsapp", WALK_IN_PHONE)
    .single();
  return existing!.id;
}

/**
 * "Registrar atendimento": lança um atendimento que já aconteceu (agora ou antes), direto como
 * concluído. Não confere horário de funcionamento nem envia mensagem. A constraint do banco
 * continua impedindo dois atendimentos sobrepostos do mesmo profissional.
 */
export async function registerAppointment(
  db: Client,
  input: RegisterInput,
): Promise<{ id: string } | { error: RegisterErrorCode | "invalid" }> {
  const { business } = input;
  const now = input.now ?? new Date();
  const start = localDateTimeToUtc(input.date, input.time, business.timezone);
  if (start.getTime() > now.getTime() + 60_000) return { error: "future" };

  const [{ data: service }, { data: staff }] = await Promise.all([
    db
      .from("services")
      .select("id, duration_min")
      .eq("id", input.serviceId)
      .eq("business_id", business.id)
      .maybeSingle(),
    db
      .from("staff_members")
      .select("id")
      .eq("id", input.staffId)
      .eq("business_id", business.id)
      .maybeSingle(),
  ]);
  if (!service || !staff) return { error: "invalid" };

  let customerId: string;
  let name: string;
  let whatsapp: string;
  try {
    if (input.customerId) {
      const { data } = await db
        .from("customers")
        .select("id, name, whatsapp")
        .eq("id", input.customerId)
        .eq("business_id", business.id)
        .maybeSingle();
      if (!data) return { error: "invalid" };
      ({ id: customerId, name, whatsapp } = data);
    } else if (input.customer?.whatsapp?.trim()) {
      const c = await upsertCustomer(db, business.id, {
        name: input.customer.name,
        whatsapp: input.customer.whatsapp,
      });
      ({ id: customerId, name, whatsapp } = c);
    } else {
      const typed = input.customer?.name?.trim().replace(/\s+/g, " ").slice(0, 80);
      customerId = await walkInCustomer(db, business.id);
      name = typed && typed.length >= 1 ? typed : "Cliente avulso";
      whatsapp = WALK_IN_PHONE;
    }

    const end = new Date(start.getTime() + service.duration_min * 60_000);
    const { data, error } = await db
      .from("appointments")
      .insert({
        business_id: business.id,
        customer_id: customerId,
        service_id: service.id,
        staff_member_id: staff.id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status: "confirmed",
        source: "manual",
        notes: input.notes ?? null,
        price_cents: input.priceCents,
        customer_name: name,
        customer_whatsapp: whatsapp,
        messages_enabled: false,
        payment_method: input.paymentMethod ?? null,
      })
      .select(APPOINTMENT_COLUMNS)
      .single();
    if (error) {
      if (toBookingError(error).code === "conflict") return { error: "overlap" };
      throw error;
    }
    // Conclui pela função do banco: ela também atualiza a última visita do cliente.
    const { error: statusError } = await db.rpc("set_appointment_status", {
      p_appointment_id: data.id,
      p_status: "completed",
    });
    if (statusError) throw statusError;
    return { id: data.id };
  } catch (e) {
    if (e instanceof BookingError && e.code === "invalid_customer") return { error: "invalid" };
    console.error("registerAppointment", e);
    throw e;
  }
}
