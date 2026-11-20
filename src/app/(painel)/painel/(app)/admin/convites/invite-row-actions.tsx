"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { InviteLink } from "@/lib/admin/owner-invitations";
import { formatPhone } from "@/lib/phone";
import {
  cancelOwnerInviteAction,
  editOwnerInviteAction,
  regenerateOwnerInviteAction,
} from "./actions";
import { InviteLinkCard } from "./invite-link-card";

type EditValues = { businessName: string; ownerName: string; email: string; whatsapp: string };

/** Ações de um convite da lista: gerar novo link, cancelar, editar dados. */
export function InviteRowActions({
  invitationId,
  canRegenerate,
  canCancel,
  canEdit,
  defaults,
}: {
  invitationId: string;
  canRegenerate: boolean;
  canCancel: boolean;
  canEdit: boolean;
  defaults: EditValues;
}) {
  const { run, pending, error, message, fieldErrors } = useAction();
  const [link, setLink] = useState<InviteLink | null>(null);
  const [editing, setEditing] = useState(false);
  const form = useForm<EditValues>({
    defaultValues: {
      ...defaults,
      whatsapp: defaults.whatsapp ? formatPhone(defaults.whatsapp) : "",
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canRegenerate ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={pending}
            onClick={() =>
              run(() => regenerateOwnerInviteAction(invitationId), {
                onSuccess: (r) => r.data && setLink(r.data),
              })
            }
          >
            Gerar novo link
          </Button>
        ) : null}
        {canEdit ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Fechar edição" : "Editar dados"}
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm("Cancelar este convite? O link para de funcionar na hora."))
                run(() => cancelOwnerInviteAction(invitationId));
            }}
          >
            Cancelar convite
          </Button>
        ) : null}
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message && !link ? <Alert tone="success">{message}</Alert> : null}
      {link ? <InviteLinkCard invite={link} /> : null}
      {editing ? (
        <form
          noValidate
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={form.handleSubmit((v) =>
            run(() => editOwnerInviteAction(invitationId, v), {
              onSuccess: () => setEditing(false),
            }),
          )}
        >
          {(
            [
              ["businessName", "Nome do negócio"],
              ["ownerName", "Nome do dono"],
              ["email", "E-mail do dono"],
              ["whatsapp", "WhatsApp do negócio"],
            ] as const
          ).map(([name, label]) => (
            <Field key={name} label={label} error={fieldErrors[name]}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register(name)}
                />
              )}
            </Field>
          ))}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" loading={pending}>
              Salvar dados
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
