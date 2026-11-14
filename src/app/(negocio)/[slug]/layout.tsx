import { requireBusinessHost } from "@/lib/host-guard";
import { readableTextOn } from "@/lib/color";
import { getPublicBusiness } from "@/lib/public/business";

export default async function NegocioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireBusinessHost(slug);
  const business = await getPublicBusiness(slug);
  const accent = business?.accent_color ?? "#4B3FD9";
  return (
    <div
      className="min-h-dvh bg-night text-night-fg"
      style={{ ["--accent" as string]: accent, ["--accent-fg" as string]: readableTextOn(accent) }}
    >
      {children}
    </div>
  );
}
