/**
 * Papéis e permissões da equipe (CAL-112). Único lugar com a matriz de acesso: a interface e as
 * server actions usam `can(member, perm)`. A garantia real é a RLS no banco, que espelha esta
 * matriz em `public.has_perm(business_id, perm)` (migration 20261114002300_team.sql).
 */
export type Role = "owner" | "manager" | "reception" | "staff";

export const ROLES: Role[] = ["owner", "manager", "reception", "staff"];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Dono",
  manager: "Gerente",
  reception: "Recepção",
  staff: "Profissional",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Acesso total, inclusive plano e pagamento.",
  manager: "Tudo, menos plano e pagamento.",
  reception: "Agenda de todos, clientes e bloqueios. Sem ajustes e sem valores.",
  staff: "Só a própria agenda e os próprios horários. Sem valores.",
};

/** Papéis que podem ser dados por convite (o dono é único e não se convida). */
export const INVITABLE_ROLES: Exclude<Role, "owner">[] = ["manager", "reception", "staff"];

export type Permission =
  /** Plano, pagamento, indicação e excluir o negócio. */
  | "billing.manage"
  /** Convidar, remover e mudar o papel da equipe (o dono nunca é alterado). */
  | "team.manage"
  /** Serviços, profissionais, horários do negócio, aparência, mensagens, domínio, pacotes. */
  | "settings.manage"
  /** Ver a agenda de todos os profissionais. */
  | "appointments.view_all"
  /** Criar, remarcar e cancelar agendamentos de qualquer profissional. */
  | "appointments.manage_all"
  /** Marcar concluído/faltou nos próprios atendimentos. */
  | "appointments.status_own"
  /** Editar o próprio horário de trabalho e bloquear os próprios horários. */
  | "hours.manage_own"
  /** Bloquear horários de qualquer profissional (ou do negócio todo). */
  | "blocks.manage_all"
  /** Ver valores, faturamento, financeiro, pacotes e relatórios. */
  | "finance.view"
  /** Ver a lista completa de clientes (sem isso, só os dos próprios atendimentos). */
  | "customers.view_all"
  /** Exportar e apagar os dados de um cliente (LGPD). */
  | "customers.erase";

const MATRIX: Record<Permission, Role[]> = {
  "billing.manage": ["owner"],
  "team.manage": ["owner", "manager"],
  "settings.manage": ["owner", "manager"],
  "appointments.view_all": ["owner", "manager", "reception"],
  "appointments.manage_all": ["owner", "manager", "reception"],
  "appointments.status_own": ["owner", "manager", "reception", "staff"],
  "hours.manage_own": ["owner", "manager", "reception", "staff"],
  "blocks.manage_all": ["owner", "manager", "reception"],
  "finance.view": ["owner", "manager"],
  "customers.view_all": ["owner", "manager", "reception"],
  "customers.erase": ["owner", "manager"],
};

export const PERMISSIONS = Object.keys(MATRIX) as Permission[];

export type MemberLike = { role: Role | string } | Role | null | undefined;

function roleOf(member: MemberLike): Role | null {
  const role = typeof member === "string" ? member : member?.role;
  return (ROLES as string[]).includes(role ?? "") ? (role as Role) : null;
}

export function can(member: MemberLike, perm: Permission): boolean {
  const role = roleOf(member);
  return role !== null && MATRIX[perm].includes(role);
}

/** Pode mudar o papel ou remover este membro? Ninguém altera o dono. */
export function canChangeMember(actor: MemberLike, target: { role: Role | string }): boolean {
  if (!can(actor, "team.manage")) return false;
  return roleOf(target) !== "owner";
}

/** Membro vê este agendamento? (espelha a policy de appointments) */
export function canSeeAppointment(
  member: { role: Role | string; staffMemberId: string | null },
  appointment: { staff_member_id: string },
): boolean {
  if (can(member, "appointments.view_all")) return true;
  return member.staffMemberId !== null && appointment.staff_member_id === member.staffMemberId;
}

/** Pode marcar concluído/faltou neste agendamento? */
export function canSetStatus(
  member: { role: Role | string; staffMemberId: string | null },
  appointment: { staff_member_id: string },
): boolean {
  if (can(member, "appointments.manage_all")) return true;
  return can(member, "appointments.status_own") && canSeeAppointment(member, appointment);
}

/** Pode bloquear horários deste profissional (null = o negócio todo)? */
export function canBlock(
  member: { role: Role | string; staffMemberId: string | null },
  staffMemberId: string | null,
): boolean {
  if (can(member, "blocks.manage_all")) return true;
  return (
    can(member, "hours.manage_own") &&
    staffMemberId !== null &&
    staffMemberId === member.staffMemberId
  );
}
