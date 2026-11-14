"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Badge, Button, Card, EmptyState, Field, Input } from "@/components/ui";
import { staffSchema, type StaffInput } from "@/lib/validation/business";
import {
  addOwnerAsStaffAction,
  deleteStaffAction,
  saveStaffAction,
} from "@/app/(painel)/painel/(app)/_actions/staff";
import { setStaffPhotoAction } from "@/app/(painel)/painel/(app)/_actions/media";
import { ImageUpload } from "./image-upload";
import { Checkbox } from "./services-editor";
import { useAction } from "./use-action";

export type StaffRow = {
  id: string;
  name: string;
  role: string | null;
  photo_url: string | null;
  is_active: boolean;
  service_ids: string[];
};

export type ServiceOption = { id: string; name: string };

export function StaffEditor({
  staff,
  services,
  ownerName,
  businessId,
}: {
  staff: StaffRow[];
  services: ServiceOption[];
  ownerName?: string;
  /** Quando informado, permite enviar a foto do profissional (CAL-038). */
  businessId?: string;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const quick = useAction();

  return (
    <div className="space-y-3">
      {quick.error ? <Alert tone="danger">{quick.error}</Alert> : null}
      {staff.length === 0 && editing !== "new" ? (
        <EmptyState
          title="Quem atende?"
          description="Cadastre você e sua equipe. Se você atende sozinho, é só um clique."
          action={
            <div className="flex flex-col gap-2">
              <Button
                loading={quick.pending}
                onClick={() => quick.run(() => addOwnerAsStaffAction(ownerName ?? ""))}
              >
                Eu mesmo atendo
              </Button>
              <Button variant="ghost" onClick={() => setEditing("new")}>
                Cadastrar profissional
              </Button>
            </div>
          }
        />
      ) : null}

      <ul className="space-y-3">
        {staff.map((p) => (
          <li key={p.id}>
            {editing === p.id ? (
              <StaffForm
                member={p}
                services={services}
                businessId={businessId}
                onDone={() => setEditing(null)}
              />
            ) : (
              <Card className="flex items-center gap-3 p-4">
                <Avatar name={p.name} url={p.photo_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{p.name}</p>
                    {!p.is_active ? <Badge>Desativado</Badge> : null}
                  </div>
                  <p className="truncate text-sm text-ink-2">
                    {p.role ? `${p.role} · ` : ""}
                    {p.service_ids.length === 0
                      ? "Nenhum serviço"
                      : p.service_ids.length === services.length
                        ? "Todos os serviços"
                        : `${p.service_ids.length} serviço(s)`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditing(p.id)}>
                  Editar
                </Button>
              </Card>
            )}
          </li>
        ))}
      </ul>

      {editing === "new" ? (
        <StaffForm services={services} onDone={() => setEditing(null)} />
      ) : staff.length ? (
        <Button variant="secondary" block onClick={() => setEditing("new")}>
          + Adicionar profissional
        </Button>
      ) : null}
    </div>
  );
}

export function Avatar({
  name,
  url,
  size = 48,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand"
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </span>
  );
}

function StaffForm({
  member,
  services,
  businessId,
  onDone,
}: {
  member?: StaffRow;
  services: ServiceOption[];
  businessId?: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const del = useAction();
  const form = useForm<StaffInput>({
    resolver: zodResolver(staffSchema, undefined, { raw: true }),
    defaultValues: {
      id: member?.id,
      name: member?.name ?? "",
      role: member?.role ?? "",
      is_active: member?.is_active ?? true,
      service_ids: member?.service_ids ?? services.map((s) => s.id),
    },
  });
  const { errors } = form.formState;
  const selected = form.watch("service_ids") ?? [];

  const onSubmit = form.handleSubmit((values) =>
    run(() => saveStaffAction(values), { onSuccess: onDone }),
  );

  return (
    <Card className="border-brand-soft">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <p className="font-display text-lg font-bold">
          {member ? "Editar profissional" : "Novo profissional"}
        </p>
        {error || del.error ? <Alert tone="danger">{error ?? del.error}</Alert> : null}
        {member && businessId ? (
          <div className="flex items-center gap-4">
            <Avatar name={member.name} url={member.photo_url} size={64} />
            <div className="flex flex-wrap gap-2">
              <ImageUpload
                businessId={businessId}
                kind="staff"
                label={member.photo_url ? "Trocar foto" : "Enviar foto"}
                onUploaded={async (url) => {
                  const r = await setStaffPhotoAction(member.id, url);
                  router.refresh();
                  return r.ok ? { ok: true } : { ok: false, error: r.error };
                }}
              />
              {member.photo_url ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await setStaffPhotoAction(member.id, null);
                    router.refresh();
                  }}
                >
                  Remover foto
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
        <Field label="Nome" error={errors.name?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...form.register("name")}
            />
          )}
        </Field>
        <Field label="Cargo (opcional)" error={errors.role?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              placeholder="Ex.: Barbeiro"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...form.register("role")}
            />
          )}
        </Field>
        <fieldset className="space-y-1">
          <legend className="mb-1 text-sm font-semibold">Serviços que faz</legend>
          {services.length === 0 ? (
            <p className="text-sm text-muted">Cadastre serviços primeiro.</p>
          ) : null}
          {services.map((s) => (
            <Checkbox
              key={s.id}
              label={s.name}
              checked={selected.includes(s.id)}
              onChange={(e) =>
                form.setValue(
                  "service_ids",
                  e.target.checked ? [...selected, s.id] : selected.filter((x) => x !== s.id),
                )
              }
            />
          ))}
        </fieldset>
        <Checkbox label="Ativo (aparece para agendar)" {...form.register("is_active")} />
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" loading={pending} className="sm:flex-1">
            Salvar profissional
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
          {member ? (
            <Button
              variant="ghost"
              className="text-danger"
              loading={del.pending}
              onClick={() => {
                if (confirm(`Excluir “${member.name}”?`)) {
                  del.run(() => deleteStaffAction(member.id), { onSuccess: onDone });
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
