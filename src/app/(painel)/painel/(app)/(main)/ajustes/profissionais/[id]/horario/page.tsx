import { redirect } from "next/navigation";

/** Endereço antigo (antes do CAL-118). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/negocio/equipe/${encodeURIComponent(id)}/horario`);
}
