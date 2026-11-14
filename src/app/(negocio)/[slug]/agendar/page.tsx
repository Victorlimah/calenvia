import type { Metadata } from "next";
import { siteUrl } from "@/lib/hosts";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/agendar/booking-flow";
import { parseFlowParams } from "@/components/agendar/flow-params";
import { canSendAutomaticMessages, isBookingOpen } from "@/lib/plans";
import { getPublicBusiness, getPublicCatalog } from "@/lib/public/business";
import { Unavailable } from "../unavailable";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await getPublicBusiness(slug);
  return { title: b ? `Agendar — ${b.name}` : "Agendar", robots: { index: false } };
}

export default async function AgendarPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const initial = parseFlowParams(
    new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
    ),
  );
  const business = await getPublicBusiness(slug);
  if (!business) notFound();
  if (!isBookingOpen(business)) return <Unavailable name={business.name} />;
  const { services, staff } = await getPublicCatalog(business.id);
  return (
    <BookingFlow
      business={{
        slug: business.slug,
        name: business.name,
        accent: business.accent_color,
        timezone: business.timezone,
        automaticMessages: canSendAutomaticMessages(business),
        privacyUrl: siteUrl("/privacidade"),
      }}
      services={services}
      staff={staff}
      initial={initial}
    />
  );
}
