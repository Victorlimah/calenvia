import { redirect } from "next/navigation";

/** Endereço antigo (antes do CAL-118): Avaliações agora fica em "Meu negócio". */
export default function Page() {
  redirect("/negocio/avaliacoes");
}
