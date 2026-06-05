export type UserRole = "super_admin" | "area" | "headquarter" | "station_hq" | "user";

export const OFFICER_ROLE_TO_RBAC: Record<string, UserRole> = {
  "Super Admin": "super_admin",
  "Area Officer": "area",
  "Headquarter Officer": "headquarter",
  "Station HQ Officer": "station_hq",
};

const RBAC_ROLE_KEYS: UserRole[] = ["super_admin", "area", "headquarter", "station_hq", "user"];

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  esm_officer: "area",
  station_officer: "station_hq",
  record_office: "headquarter",
};

/** Normalize JWT / stored user / job title to a permissions matrix key. */
export function resolveRbacRole(role: string | null | undefined): UserRole {
  if (!role) return "user";
  if (RBAC_ROLE_KEYS.includes(role as UserRole)) return role as UserRole;
  if (OFFICER_ROLE_TO_RBAC[role]) return OFFICER_ROLE_TO_RBAC[role];
  if (LEGACY_ROLE_MAP[role]) return LEGACY_ROLE_MAP[role];
  return "user";
}
