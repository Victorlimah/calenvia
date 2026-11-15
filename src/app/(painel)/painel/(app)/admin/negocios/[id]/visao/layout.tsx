import Link from "next/link";
import { loadViewAsBusiness } from "@/lib/admin/view-as-server";
import { ViewAsTabs } from "./tabs";

export default async function ViewAsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await loadViewAsBusiness(id);
  return (
    <>
      <div
        role="status"
        className="sticky top-0 z-20 border-b border-warning/40 bg-warning-50 text-ink"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
          <p>
            Você está vendo o painel de <strong>{business.name}</strong> como administrador. Nada
            aqui pode ser alterado.
          </p>
          <Link
            href={`/admin/negocios/${business.id}`}
            className="inline-flex min-h-11 items-center font-semibold text-brand underline"
          >
            Voltar para a administração
          </Link>
        </div>
      </div>
      <ViewAsTabs base={`/admin/negocios/${business.id}/visao`} />
      {children}
    </>
  );
}
