import type { UserRole } from "./rbacRole";

export type OfficerJobRole =
  | "Super Admin"
  | "Area Officer"
  | "Headquarter Officer"
  | "Station HQ Officer";

export const HIERARCHY_ORDER: OfficerJobRole[] = [
  "Super Admin",
  "Area Officer",
  "Headquarter Officer",
  "Station HQ Officer",
];

export const CREATABLE_OFFICER_ROLES: Record<UserRole, OfficerJobRole[]> = {
  super_admin: ["Super Admin", "Area Officer", "Headquarter Officer", "Station HQ Officer"],
  area: ["Headquarter Officer", "Station HQ Officer"],
  headquarter: ["Station HQ Officer"],
  station_hq: [],
  user: [],
};

export function getCreatableRoles(actorRole?: UserRole | string | null): OfficerJobRole[] {
  if (!actorRole) return [];
  return CREATABLE_OFFICER_ROLES[actorRole as UserRole] ?? [];
}

export const HIERARCHY_LABEL =
  "Vitric Super Admin → Area → Headquarter → Station HQ (L1 / L2 / L3 at each level)";
