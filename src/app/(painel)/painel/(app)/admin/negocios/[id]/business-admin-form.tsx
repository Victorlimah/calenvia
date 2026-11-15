"use client";

import { useForm, useWatch } from "react-hook-form";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import {
  type AdminBusinessInput,
  PLAN_STATUS_LABELS,
  PLAN_STATUSES,
} from "@/lib/admin/business-update";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { updateBusinessAdminAction } from "../../actions";

type Values = Record<keyof AdminBusinessInput, string>;

export function BusinessAdminForm({
  businessId,
  defaults,
  planDefaults,
}: {
  businessId: string;
  defaults: Values;
  planDefaults: Record<string, { members: number | null; messages: number }>;
}) {
  const { run, pending, error, message, fieldErrors } = useAction();
  const form = useForm<Values>({ defaultValues: defaults });
  const plan = useWatch({ control: form.control, name: "plan" });
  const d = planDefaults[plan] ?? { members: null, messages: 0 };

  const onSubmit = form.handleSubmit((values) =>
    run(() => updateBusinessAdminAction(businessId, values)),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plano" error={fieldErrors.plan}>
          {({ id, describedBy }) => (
            <Select id={id} aria-describedby={describedBy} {...form.register("plan")}>
              {PLAN_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PLANS[p].name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Status da assinatura"
          hint="Suspensa ou cancelada tira a página do ar."
          error={fieldErrors.plan_status}
        >
          {({ id, describedBy }) => (
            <Select id={id} aria-describedby={describedBy} {...form.register("plan_status")}>
              {PLAN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PLAN_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Limite de pessoas com acesso"
          hint={`Vazio = padrão do plano (${d.members ?? "ilimitado"}). Conta o dono e os convites pendentes.`}
          error={fieldErrors.member_limit_override}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="number"
              inputMode="numeric"
              min={1}
              placeholder={d.members?.toString() ?? "ilimitado"}
              {...form.register("member_limit_override")}
            />
          )}
        </Field>
        <Field
          label="Mensagens automáticas por mês"
          hint={`Vazio = padrão do plano (${d.messages}). Vale em qualquer plano; 0 desliga o automático.`}
          error={fieldErrors.message_limit_override}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={String(d.messages)}
              {...form.register("message_limit_override")}
            />
          )}
        </Field>
      </div>

      <Field
        label="Observação interna"
        hint="Só a equipe da Calenvia vê. Ex.: paga R$ 10 por fora pelo 4º acesso."
        error={fieldErrors.notes}
      >
        {({ id, describedBy }) => (
          <Textarea id={id} aria-describedby={describedBy} rows={3} {...form.register("notes")} />
        )}
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar alterações"}
      </Button>
    </form>
  );
}
