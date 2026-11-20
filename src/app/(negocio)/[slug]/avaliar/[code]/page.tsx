import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDayLabel } from "@/lib/dates";
import { getPublicAppointment } from "@/lib/public/appointment";
import { getPublicBusiness } from "@/lib/public/business";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { canReview } from "@/lib/reviews";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ReviewForm } from "./review-form";

type Props = { params: Promise<{ slug: string; code: string }> };

export const metadata: Metadata = { title: "Avaliar atendimento", robots: { index: false } };

export default async function AvaliarPage({ params }: Props) {
  const { slug, code } = await params;
  const business = await getPublicBusiness(slug);
  if (!business) notFound();
  if (!(await checkRateLimit("lookup"))) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-16 text-center">
        <p>{RATE_LIMIT_MESSAGE}</p>
      </main>
    );
  }
  const appt = await getPublicAppointment(business.id, code);
  if (!appt) notFound();
  const { data: existing } = await createSupabaseAdminClient()
    .from("reviews")
    .select("id")
    .eq("appointment_id", appt.id)
    .maybeSingle();
  const check = canReview(appt, Boolean(existing));

  return (
    <main className="mx-auto max-w-xl px-4 pt-10 pb-16">
      <h1 className="font-t-display text-3xl font-extrabold">Como foi na {business.name}?</h1>
      <p className="mt-2 text-t-sub">
        {appt.serviceName} com {appt.staffName}, {formatDayLabel(appt.start, business.timezone)}.
      </p>
      {check.ok ? (
        <ReviewForm slug={slug} code={appt.code} accent={business.accent_color} />
      ) : (
        <p
          role="status"
          className="mt-8 rounded-xl border border-t-text/10 bg-t-text/5 p-4 font-semibold"
        >
          {check.reason === "reviewed"
            ? "Você já avaliou este atendimento. Obrigado!"
            : check.reason === "too_late"
              ? "O prazo para avaliar este atendimento já passou."
              : "Você poderá avaliar depois do atendimento."}
        </p>
      )}
      <p className="mt-10 text-center">
        <Link href="/" className="text-sm underline underline-offset-4">
          Voltar para a página da {business.name}
        </Link>
      </p>
    </main>
  );
}
