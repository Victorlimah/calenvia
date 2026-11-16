import type { Metadata } from "next";
import { NewPasswordForm } from "@/app/(painel)/painel/(app)/nova-senha/new-password-form";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { SignOutButton } from "@/components/painel/shell";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { requireReadyMember } from "@/lib/business/current";
import { ROLE_LABELS } from "@/lib/permissions";
import { AccountEmailForm, AccountNameForm } from "./account-forms";

export const metadata: Metadata = { title: "Sua conta — Calenvia" };

export default async function ContaPage() {
  const member = await requireReadyMember();
  const user = await requireUser();
  const name =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) || "";
  return (
    <PageBody>
      <PageHeader
        title="Sua conta"
        description={`Seu acesso como ${ROLE_LABELS[member.role].toLowerCase()} em ${member.business.name}.`}
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <AccountNameForm name={name} />
      <AccountEmailForm email={user.email ?? ""} />
      <Card className="space-y-4">
        <h2 className="font-display text-xl font-bold">Trocar a senha</h2>
        <NewPasswordForm />
      </Card>
      <Card className="space-y-2">
        <h2 className="font-display text-xl font-bold">Sair</h2>
        <p className="text-ink-2">Encerra o acesso neste aparelho.</p>
        <SignOutButton className="justify-center border border-line" />
      </Card>
    </PageBody>
  );
}
