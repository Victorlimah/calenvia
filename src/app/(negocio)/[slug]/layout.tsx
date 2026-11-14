import { requireBusinessHost } from "@/lib/host-guard";

export default async function NegocioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireBusinessHost(slug);
  return children;
}
