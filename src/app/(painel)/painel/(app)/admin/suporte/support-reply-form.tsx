"use client";

import { useForm } from "react-hook-form";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Field, Select, Textarea } from "@/components/ui";
import { SUPPORT_STATUS_LABELS, SUPPORT_STATUSES, type SupportStatus } from "@/lib/admin/support";
import { updateSupportRequestAction } from "../actions";

type Values = { status: SupportStatus; admin_reply: string };

export function SupportReplyForm({ requestId, defaults }: { requestId: string; defaults: Values }) {
  const { run, pending, error, message, fieldErrors } = useAction();
  const form = useForm<Values>({ defaultValues: defaults });
  const onSubmit = form.handleSubmit((values) =>
    run(() => updateSupportRequestAction(requestId, values)),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <Field
        label="Resposta"
        hint="O dono vê esta resposta em Ajuda › Seus pedidos."
        error={fieldErrors.admin_reply}
      >
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            rows={3}
            {...form.register("admin_reply")}
          />
        )}
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Status" error={fieldErrors.status}>
          {({ id, describedBy }) => (
            <Select id={id} aria-describedby={describedBy} {...form.register("status")}>
              {SUPPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SUPPORT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar pedido"}
        </Button>
      </div>
    </form>
  );
}
