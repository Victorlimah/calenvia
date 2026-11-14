"use client";

import { useState } from "react";
import { useAction } from "@/components/painel/use-action";
import { Alert, Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { INVITABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/permissions";
import { waMeLink } from "@/lib/phone";
import { invitationMessage } from "@/lib/team/invitation-text";
import {
  changeMemberRoleAction,
  createInvitationAction,
  linkMemberStaffAction,
  removeMemberAction,
  resendInvitationAction,
  revokeInvitationAction,
} from "../../../_actions/team";

export type TeamPerson = {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  staffMemberId: string | null;
  staffName: string | null;
  self: boolean;
  editable: boolean;
  canLink: boolean;
};
export type TeamInvite = {
  id: string;
  email: string | null;
  role: Role;
  staffName: string | null;
  expired: boolean;
};
type Staff = { id: string; name: string; linked: boolean };

const NEW_STAFF = "__novo__";

export function TeamManager({
  businessName,
  people,
  invites,
  staff,
  canInvite,
}: {
  businessName: string;
  people: TeamPerson[];
  invites: TeamInvite[];
  staff: Staff[];
  canInvite: boolean;
}) {
  const action = useAction();
  const [link, setLink] = useState<{ url: string; role: Role } | null>(null);
  const [copied, setCopied] = useState(false);

  const showLink = (url: string, role: Role) => {
    setCopied(false);
    setLink({ url, role });
  };

  return (
    <div className="space-y-6">
      {action.error ? <Alert tone="danger">{action.error}</Alert> : null}
      {action.message && !link ? <Alert tone="success">{action.message}</Alert> : null}

      {link ? (
        <Card className="space-y-3" aria-live="polite">
          <p className="font-semibold">Convite pronto. Envie o link para a pessoa:</p>
          <Input readOnly value={link.url} aria-label="Link do convite" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link.url);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Link copiado" : "Copiar link"}
            </Button>
            <a
              href={waMeLink("", invitationMessage(businessName, link.role, link.url))}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border-[1.5px] border-ink bg-white px-4 font-semibold"
            >
              Enviar pelo WhatsApp
            </a>
          </div>
          <p className="text-sm text-muted">O link vale por 7 dias e só pode ser usado uma vez.</p>
        </Card>
      ) : null}

      {canInvite ? (
        <InviteForm staff={staff} onCreated={showLink} run={action.run} pending={action.pending} />
      ) : null}

      <section aria-labelledby="equipe-pessoas" className="space-y-2">
        <h2 id="equipe-pessoas" className="font-display text-lg font-bold">
          Pessoas com acesso
        </h2>
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <PersonCard person={p} staff={staff} run={action.run} pending={action.pending} />
            </li>
          ))}
        </ul>
      </section>

      {invites.length ? (
        <section aria-labelledby="equipe-convites" className="space-y-2">
          <h2 id="equipe-convites" className="font-display text-lg font-bold">
            Convites pendentes
          </h2>
          <ul className="space-y-2">
            {invites.map((i) => (
              <li key={i.id}>
                <Card className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{i.email || "Convite por link"}</p>
                      <p className="text-sm text-ink-2">
                        {ROLE_LABELS[i.role]}
                        {i.staffName ? ` · ${i.staffName}` : ""}
                      </p>
                    </div>
                    <Badge tone={i.expired ? "danger" : "warning"}>
                      {i.expired ? "Expirado" : "Pendente"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={action.pending}
                      onClick={() =>
                        action.run(() => resendInvitationAction(i.id), {
                          onSuccess: (r) => r.data && showLink(r.data.link, i.role),
                        })
                      }
                    >
                      Reenviar convite
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-danger"
                      disabled={action.pending}
                      onClick={() => action.run(() => revokeInvitationAction(i.id))}
                    >
                      Cancelar convite
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

type Run = ReturnType<typeof useAction>["run"];

function InviteForm({
  staff,
  onCreated,
  run,
  pending,
}: {
  staff: Staff[];
  onCreated: (url: string, role: Role) => void;
  run: Run;
  pending: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<Role, "owner">>("staff");
  const free = staff.filter((s) => !s.linked);
  const [staffChoice, setStaffChoice] = useState(free[0]?.id ?? NEW_STAFF);
  const [newName, setNewName] = useState("");

  return (
    <Card className="space-y-4">
      <h2 className="font-display text-lg font-bold">Convidar pessoa</h2>
      <Field label="E-mail (opcional)" hint="Só para você lembrar quem é. O convite vai por link.">
        {({ id }) => (
          <Input
            id={id}
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>
      <Field label="Papel" hint={ROLE_DESCRIPTIONS[role]}>
        {({ id }) => (
          <Select
            id={id}
            value={role}
            onChange={(e) => setRole(e.target.value as Exclude<Role, "owner">)}
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {role === "staff" ? (
        <>
          <Field label="Cadastro de profissional">
            {({ id }) => (
              <Select id={id} value={staffChoice} onChange={(e) => setStaffChoice(e.target.value)}>
                {free.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value={NEW_STAFF}>+ Criar um novo profissional</option>
              </Select>
            )}
          </Field>
          {staffChoice === NEW_STAFF ? (
            <Field label="Nome do profissional">
              {({ id }) => (
                <Input
                  id={id}
                  value={newName}
                  maxLength={80}
                  onChange={(e) => setNewName(e.target.value)}
                />
              )}
            </Field>
          ) : null}
        </>
      ) : null}
      <Button
        className="w-full"
        loading={pending}
        onClick={() =>
          run(
            () =>
              createInvitationAction({
                email,
                role,
                staffMemberId: role === "staff" && staffChoice !== NEW_STAFF ? staffChoice : null,
                newStaffName: role === "staff" && staffChoice === NEW_STAFF ? newName : undefined,
              }),
            {
              onSuccess: (r) => {
                if (r.data) onCreated(r.data.link, role);
                setEmail("");
                setNewName("");
              },
            },
          )
        }
      >
        Gerar convite
      </Button>
    </Card>
  );
}

function PersonCard({
  person,
  staff,
  run,
  pending,
}: {
  person: TeamPerson;
  staff: Staff[];
  run: Run;
  pending: boolean;
}) {
  const [role, setRole] = useState(person.role);
  const [staffId, setStaffId] = useState(person.staffMemberId ?? "");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const options = staff.filter((s) => !s.linked || s.id === person.staffMemberId);

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {person.name}
            {person.self ? " (você)" : ""}
          </p>
          {person.email && person.email !== person.name ? (
            <p className="truncate text-sm text-muted">{person.email}</p>
          ) : null}
          <p className="text-sm text-ink-2">
            {ROLE_LABELS[person.role]}
            {person.staffName ? ` · atende como ${person.staffName}` : ""}
          </p>
        </div>
        <Badge tone="success">Ativo</Badge>
      </div>

      {person.editable ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Papel">
            {({ id }) => (
              <Select
                id={id}
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                disabled={pending}
              >
                {INVITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <StaffSelect
            value={staffId}
            onChange={setStaffId}
            options={options}
            required={role === "staff"}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={pending || (role === person.role && staffId === (person.staffMemberId ?? ""))}
            onClick={() =>
              run(() =>
                changeMemberRoleAction({
                  memberId: person.id,
                  role,
                  staffMemberId: staffId || null,
                }),
              )
            }
          >
            Salvar
          </Button>
          {confirmRemove ? (
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => run(() => removeMemberAction(person.id))}
            >
              Confirmar remoção
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-danger"
              onClick={() => setConfirmRemove(true)}
            >
              Remover acesso
            </Button>
          )}
        </div>
      ) : person.canLink ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <StaffSelect value={staffId} onChange={setStaffId} options={options} required={false} />
          <Button
            variant="outline"
            size="sm"
            className="self-end"
            disabled={pending || staffId === (person.staffMemberId ?? "")}
            onClick={() =>
              run(() =>
                linkMemberStaffAction({ memberId: person.id, staffMemberId: staffId || null }),
              )
            }
          >
            Salvar
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function StaffSelect({
  value,
  onChange,
  options,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Staff[];
  required: boolean;
}) {
  return (
    <Field label="Atende como" hint="Ligue ao cadastro de profissional para ver a própria agenda.">
      {({ id }) => (
        <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {required ? null : <option value="">Não atende</option>}
          {required && !value ? <option value="">Escolha</option> : null}
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
