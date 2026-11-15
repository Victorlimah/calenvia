import { describe, expect, it } from "vitest";
import {
  can,
  canBlock,
  canChangeMember,
  canSeeAppointment,
  canSetStatus,
  PERMISSIONS,
  type Permission,
  type Role,
} from "./permissions";

// Matriz do card CAL-112: cada célula conferida.
const EXPECTED: Record<Permission, Role[]> = {
  "billing.manage": ["owner"],
  "billing.view": ["owner", "manager"],
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
const ROLES: Role[] = ["owner", "manager", "reception", "staff"];

describe("permissions (CAL-112)", () => {
  it("cobre todas as permissões", () => {
    expect([...PERMISSIONS].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const perm of Object.keys(EXPECTED) as Permission[]) {
    for (const role of ROLES) {
      const allowed = EXPECTED[perm].includes(role);
      it(`${role} ${allowed ? "pode" : "NÃO pode"} ${perm}`, () => {
        expect(can({ role }, perm)).toBe(allowed);
        expect(can(role, perm)).toBe(allowed);
      });
    }
  }

  it("sem papel ou papel desconhecido não pode nada", () => {
    for (const perm of PERMISSIONS) {
      expect(can(null, perm)).toBe(false);
      expect(can({ role: "admin" }, perm)).toBe(false);
    }
  });

  it("ninguém altera o dono; gerente altera os demais; recepção não altera ninguém", () => {
    expect(canChangeMember({ role: "manager" }, { role: "owner" })).toBe(false);
    expect(canChangeMember({ role: "owner" }, { role: "owner" })).toBe(false);
    expect(canChangeMember({ role: "manager" }, { role: "manager" })).toBe(true);
    expect(canChangeMember({ role: "owner" }, { role: "staff" })).toBe(true);
    expect(canChangeMember({ role: "reception" }, { role: "staff" })).toBe(false);
    expect(canChangeMember({ role: "staff" }, { role: "staff" })).toBe(false);
  });

  const staff = { role: "staff", staffMemberId: "s1" };
  const reception = { role: "reception", staffMemberId: null };

  it("profissional vê e marca só os próprios atendimentos", () => {
    expect(canSeeAppointment(staff, { staff_member_id: "s1" })).toBe(true);
    expect(canSeeAppointment(staff, { staff_member_id: "s2" })).toBe(false);
    expect(canSetStatus(staff, { staff_member_id: "s1" })).toBe(true);
    expect(canSetStatus(staff, { staff_member_id: "s2" })).toBe(false);
    expect(canSeeAppointment(reception, { staff_member_id: "s2" })).toBe(true);
    expect(canSetStatus(reception, { staff_member_id: "s2" })).toBe(true);
  });

  it("profissional bloqueia só os próprios horários, nunca o negócio todo", () => {
    expect(canBlock(staff, "s1")).toBe(true);
    expect(canBlock(staff, "s2")).toBe(false);
    expect(canBlock(staff, null)).toBe(false);
    expect(canBlock({ role: "staff", staffMemberId: null }, null)).toBe(false);
    expect(canBlock(reception, null)).toBe(true);
    expect(canBlock(reception, "s2")).toBe(true);
  });
});
