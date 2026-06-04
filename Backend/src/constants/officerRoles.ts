import { RbacRole } from "./permissions";

export const OFFICER_JOB_ROLES = [
  "Super Admin",
  "Area Officer",
  "Headquarter Officer",
  "Station HQ Officer",
] as const;

export type OfficerJobRole = (typeof OFFICER_JOB_ROLES)[number];

export const OFFICER_ROLE_TO_RBAC: Record<string, RbacRole> = {
  "Super Admin": "super_admin",
  "Area Officer": "area",
  "Headquarter Officer": "headquarter",
  "Station HQ Officer": "station_hq",
};

export function rbacRoleFromJobRole(jobRole: string): RbacRole {
  return OFFICER_ROLE_TO_RBAC[jobRole] ?? "station_hq";
}
