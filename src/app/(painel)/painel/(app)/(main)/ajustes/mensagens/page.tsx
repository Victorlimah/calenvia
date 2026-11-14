import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { Alert } from "@/components/ui";
import { requireReadyBusiness } from "@/lib/business/current";
import { canSendAutomaticMessages } from "@/lib/plans";
import { MessagesEditor } from "./messages-editor";

export const metadata: Metadata = { title: "Mensagens — Calenvia" };

export default async function MensagensPage() {
  const business = await requireReadyBusiness();
  const texts = (business.message_texts ?? {}) as Record<string, string>;
  return (
    <PageBody>
      <PageHeader
        title="Mensagens"
        description="O texto que vai pronto quando você envia pelo seu WhatsApp."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      {canSendAutomaticMessages(business) ? (
        <Alert tone="info">
          As mensagens automáticas usam o texto aprovado pelo WhatsApp e não podem ser alteradas.
          Estes textos valem quando você envia pelo seu WhatsApp (por exemplo, quando a cota do mês
          acaba).
        </Alert>
      ) : null}
      <MessagesEditor
        businessName={business.name}
        timezone={business.timezone}
        initial={{ confirmation: texts.confirmation ?? null, reminder: texts.reminder ?? null }}
      />
    </PageBody>
  );
}
