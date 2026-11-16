"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { serviceSchema, type ServiceInput } from "@/lib/validation/business";
import {
  deleteServiceAction,
  moveServiceAction,
  saveServiceAction,
} from "@/app/(painel)/painel/(app)/_actions/services";
import { useAction } from "./use-action";

export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number;
  is_active: boolean;
  is_featured: boolean;
  staff_ids: string[];
};

export type StaffOption = { id: string; name: string };

const DURATIONS = [15, 20, 30, 40, 45, 60, 75, 90, 120, 150, 180, 240];

export function ServicesEditor({
  services,
  staff,
  layout = "inline",
}: {
  services: ServiceRow[];
  staff: StaffOption[];
  /** "panel": lista sempre visível e edição num painel lateral (Meu negócio, CAL-118). */
  layout?: "inline" | "panel";
}) {
  const panel = layout === "panel";
  const [editing, setEditing] = useState<string | "new" | null>(
    services.length || panel ? null : "new",
  );
  const list = useAction();
  const editingService = services.find((s) => s.id === editing);

  return (
    <div className="space-y-3">
      {list.error ? <Alert tone="danger">{list.error}</Alert> : null}
      {list.message ? <Alert tone="success">{list.message}</Alert> : null}

      {services.length === 0 && editing !== "new" ? (
        <EmptyState
          title="Nenhum serviço ainda"
          description="Cadastre o que você oferece, com duração e preço."
          action={<Button onClick={() => setEditing("new")}>Adicionar serviço</Button>}
        />
      ) : null}

      <ul className="space-y-3">
        {services.map((s, i) => (
          <li key={s.id}>
            {editing === s.id && !panel ? (
              <ServiceForm service={s} staff={staff} onDone={() => setEditing(null)} />
            ) : (
              <Card className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{s.name}</p>
                    {s.is_featured ? <Badge tone="brand">Mais pedido</Badge> : null}
                    {s.is_active ? (
                      panel ? (
                        <Badge tone="success">Ativo</Badge>
                      ) : null
                    ) : (
                      <Badge>Desativado</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-2">
                    {formatDuration(s.duration_min)} · {formatPrice(s.price_cents)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <IconButton
                    label={`Subir ${s.name}`}
                    disabled={i === 0 || list.pending}
                    onClick={() => list.run(() => moveServiceAction(s.id, "up"))}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    label={`Descer ${s.name}`}
                    disabled={i === services.length - 1 || list.pending}
                    onClick={() => list.run(() => moveServiceAction(s.id, "down"))}
                  >
                    ↓
                  </IconButton>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Editar ${s.name}`}
                    onClick={() => setEditing(s.id)}
                  >
                    Editar
                  </Button>
                </div>
              </Card>
            )}
          </li>
        ))}
      </ul>

      {panel ? (
        <Drawer
          open={editing !== null}
          title={editingService ? `Editar ${editingService.name}` : "Novo serviço"}
          onClose={() => setEditing(null)}
        >
          {editing !== null ? (
            <ServiceForm
              key={editing}
              service={editingService}
              staff={staff}
              bare
              onDone={() => setEditing(null)}
            />
          ) : null}
        </Drawer>
      ) : null}

      {editing === "new" && !panel ? (
        <ServiceForm staff={staff} onDone={() => setEditing(null)} />
      ) : services.length ? (
        <Button variant="secondary" block onClick={() => setEditing("new")}>
          + Adicionar serviço
        </Button>
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  children,
  ...props
}: { label: string; children: React.ReactNode } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex size-11 items-center justify-center rounded-xl text-lg text-ink-2 hover:bg-paper-2 disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  );
}

function ServiceForm({
  service,
  staff,
  onDone,
  bare = false,
}: {
  service?: ServiceRow;
  staff: StaffOption[];
  onDone: () => void;
  /** Sem cartão e sem título (dentro do painel lateral, que já tem os dois). */
  bare?: boolean;
}) {
  const { run, pending, error } = useAction();
  const del = useAction();
  const [staffIds, setStaffIds] = useState<string[]>(
    service ? service.staff_ids : staff.map((s) => s.id),
  );
  const form = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema, undefined, { raw: true }),
    defaultValues: {
      id: service?.id,
      name: service?.name ?? "",
      description: service?.description ?? "",
      duration_min: service?.duration_min ?? 30,
      price: service ? (service.price_cents / 100).toFixed(2).replace(".", ",") : "",
      is_active: service?.is_active ?? true,
      is_featured: service?.is_featured ?? false,
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    run(() => saveServiceAction({ ...values, staff_ids: staff.length ? staffIds : undefined }), {
      onSuccess: onDone,
    }),
  );

  return (
    <Card
      className={bare ? "border-0 bg-transparent p-0 shadow-none" : "space-y-4 border-brand-soft"}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {bare ? null : (
          <p className="font-display text-lg font-bold">
            {service ? "Editar serviço" : "Novo serviço"}
          </p>
        )}
        {error || del.error ? <Alert tone="danger">{error ?? del.error}</Alert> : null}
        <Field label="Nome" error={errors.name?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              placeholder="Ex.: Corte masculino"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...form.register("name")}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duração" error={errors.duration_min?.message}>
            {({ id, describedBy, invalid }) => (
              <select
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className="block min-h-12 w-full rounded-[var(--radius-control)] border border-line bg-white px-3 text-base"
                {...form.register("duration_min")}
              >
                {[...new Set([...DURATIONS, service?.duration_min ?? 30])]
                  .sort((a, b) => a - b)
                  .map((d) => (
                    <option key={d} value={d}>
                      {formatDuration(d)}
                    </option>
                  ))}
              </select>
            )}
          </Field>
          <Field label="Preço (R$)" error={errors.price?.message}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                inputMode="decimal"
                placeholder="40,00"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...form.register("price")}
              />
            )}
          </Field>
        </div>
        <Field label="Descrição (opcional)" error={errors.description?.message}>
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              placeholder="O que está incluso"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...form.register("description")}
            />
          )}
        </Field>
        <Checkbox label="Mostrar selo “mais pedido”" {...form.register("is_featured")} />
        <Checkbox label="Ativo (aparece na página)" {...form.register("is_active")} />

        {staff.length ? (
          <fieldset className="space-y-1">
            <legend className="mb-1 text-sm font-semibold">Quem faz este serviço</legend>
            {staff.map((p) => (
              <Checkbox
                key={p.id}
                label={p.name}
                checked={staffIds.includes(p.id)}
                onChange={(e) =>
                  setStaffIds((ids) =>
                    e.target.checked ? [...ids, p.id] : ids.filter((x) => x !== p.id),
                  )
                }
              />
            ))}
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" loading={pending} className="sm:flex-1">
            Salvar serviço
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
          {service ? (
            <Button
              variant="ghost"
              className="text-danger"
              loading={del.pending}
              onClick={() => {
                if (confirm(`Excluir “${service.name}”?`)) {
                  del.run(() => deleteServiceAction(service.id), { onSuccess: onDone });
                }
              }}
            >
              Excluir
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

export function Checkbox({ label, ...props }: { label: string } & React.ComponentProps<"input">) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink">
      <input type="checkbox" className="size-5 accent-brand" {...props} />
      {label}
    </label>
  );
}
