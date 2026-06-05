import { OfficerJobRole } from "./officerRoles";
import { RbacRole } from "./permissions";

/** Who can create which officer job roles (Vitric → Area → HQ → Station HQ). */
export const CREATABLE_OFFICER_ROLES: Record<RbacRole, OfficerJobRole[]> = {
  super_admin: ["Super Admin", "Area Officer", "Headquarter Officer", "Station HQ Officer"],
  area: ["Headquarter Officer", "Station HQ Officer"],
  headquarter: ["Station HQ Officer"],
  station_hq: [],
  user: [],
};

export const HIERARCHY_ORDER: OfficerJobRole[] = [
  "Super Admin",
  "Area Officer",
  "Headquarter Officer",
  "Station HQ Officer",
];
