import { IGrievance } from "../models/Grievance";

export function isSuperAdmin(user: any): boolean {
  return user?.role === "super_admin";
}

/** Only the currently assigned officer (or super admin) may take action on a case. */
export function canActOnGrievance(user: any, grievance: IGrievance): boolean {
  if (isSuperAdmin(user)) return true;
  if (!grievance.officerId || !user?.id) return false;
  return String(grievance.officerId) === String(user.id);
}

export function assertCanActOnGrievance(user: any, grievance: IGrievance): string | null {
  if (canActOnGrievance(user, grievance)) return null;
  return "Only the assigned officer can take action on this grievance. You have view-only access.";
}
