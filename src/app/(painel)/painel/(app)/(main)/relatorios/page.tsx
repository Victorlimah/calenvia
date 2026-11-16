import { redirect } from "next/navigation";

/** Endereço antigo (antes do CAL-127): Relatórios agora é uma aba do Financeiro. */
export default async function Page({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  redirect(`/financeiro/relatorios${mes ? `?mes=${encodeURIComponent(mes)}` : ""}`);
}
