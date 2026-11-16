import { redirect } from "next/navigation";

/** Endereço antigo (antes do CAL-118): a tela mudou para "Meu negócio". */
export default function Page() {
  redirect("/negocio/horarios#regras");
}
