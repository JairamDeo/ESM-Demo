// ─── Role-Based Access Control ───────────────────────────────────────────────
// Central store for what each role can do.
// super_admin can change these at runtime via Settings page.
// Stored in localStorage so they persist across refreshes.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "super_admin" | "esm_officer" | "station_officer" | "record_office" | "user";

export interface Permission {
  viewDashboard: boolean;
  viewGrievances: boolean;
  createGrievance: boolean;
  updateGrievanceStatus: boolean;
  deleteGrievance: boolean;
  escalateGrievance: boolean;
  reassignOfficer: boolean;
  viewCaseTypes: boolean;
  manageCaseTypes: boolean;
  viewStations: boolean;
  manageStations: boolean;
  viewQRCodes: boolean;
  manageQRCodes: boolean;
  viewOfficers: boolean;
  manageOfficers: boolean; // add/edit/delete officers
  viewEscalations: boolean;
  resolveEscalations: boolean;
  viewReports: boolean;
  exportReports: boolean;
  viewSettings: boolean;
  manageSettings: boolean; // only super_admin
  manageRoles: boolean;    // only super_admin
  loginAsVeteran: boolean; // officer can use veteran portal
}

export type RolePermissions = Record<UserRole, Permission>;

const DEFAULT_PERMISSIONS: RolePermissions = {
  super_admin: {
    viewDashboard: true, viewGrievances: true, createGrievance: true,
    updateGrievanceStatus: true, deleteGrievance: true, escalateGrievance: true,
    reassignOfficer: true, viewCaseTypes: true, manageCaseTypes: true,
    viewStations: true, manageStations: true, viewQRCodes: true, manageQRCodes: true,
    viewOfficers: true, manageOfficers: true, viewEscalations: true,
    resolveEscalations: true, viewReports: true, exportReports: true,
    viewSettings: true, manageSettings: true, manageRoles: true, loginAsVeteran: false,
  },
  esm_officer: {
    viewDashboard: true, viewGrievances: true, createGrievance: true,
    updateGrievanceStatus: true, deleteGrievance: false, escalateGrievance: true,
    reassignOfficer: true, viewCaseTypes: true, manageCaseTypes: false,
    viewStations: true, manageStations: false, viewQRCodes: true, manageQRCodes: false,
    viewOfficers: true, manageOfficers: false, viewEscalations: true,
    resolveEscalations: true, viewReports: true, exportReports: true,
    viewSettings: true, manageSettings: false, manageRoles: false, loginAsVeteran: true,
  },
  station_officer: {
    viewDashboard: true, viewGrievances: true, createGrievance: true,
    updateGrievanceStatus: true, deleteGrievance: false, escalateGrievance: true,
    reassignOfficer: false, viewCaseTypes: true, manageCaseTypes: false,
    viewStations: false, manageStations: false, viewQRCodes: true, manageQRCodes: false,
    viewOfficers: false, manageOfficers: false, viewEscalations: false,
    resolveEscalations: false, viewReports: false, exportReports: false,
    viewSettings: false, manageSettings: false, manageRoles: false, loginAsVeteran: true,
  },
  record_office: {
    viewDashboard: true, viewGrievances: true, createGrievance: false,
    updateGrievanceStatus: false, deleteGrievance: false, escalateGrievance: false,
    reassignOfficer: false, viewCaseTypes: true, manageCaseTypes: false,
    viewStations: false, manageStations: false, viewQRCodes: false, manageQRCodes: false,
    viewOfficers: false, manageOfficers: false, viewEscalations: false,
    resolveEscalations: false, viewReports: true, exportReports: true,
    viewSettings: false, manageSettings: false, manageRoles: false, loginAsVeteran: true,
  },
  user: {
    viewDashboard: false, viewGrievances: true, createGrievance: true,
    updateGrievanceStatus: false, deleteGrievance: false, escalateGrievance: false,
    reassignOfficer: false, viewCaseTypes: false, manageCaseTypes: false,
    viewStations: false, manageStations: false, viewQRCodes: false, manageQRCodes: false,
    viewOfficers: false, manageOfficers: false, viewEscalations: false,
    resolveEscalations: false, viewReports: false, exportReports: false,
    viewSettings: false, manageSettings: false, manageRoles: false, loginAsVeteran: false,
  },
};

interface RBACStore {
  permissions: RolePermissions;
  updateRolePermission: (role: UserRole, permission: keyof Permission, value: boolean) => void;
  resetRole: (role: UserRole) => void;
  resetAll: () => void;
}

export const useRBACStore = create<RBACStore>()(
  persist(
    (set) => ({
      permissions: DEFAULT_PERMISSIONS,
      updateRolePermission: (role, permission, value) =>
        set((state) => ({
          permissions: {
            ...state.permissions,
            [role]: { ...state.permissions[role], [permission]: value },
          },
        })),
      resetRole: (role) =>
        set((state) => ({
          permissions: { ...state.permissions, [role]: DEFAULT_PERMISSIONS[role] },
        })),
      resetAll: () => set({ permissions: DEFAULT_PERMISSIONS }),
    }),
    { name: "vitric-rbac-permissions" }
  )
);

// ─── Hook to check a single permission ───────────────────────────────────────
import { useAuth } from "@/contexts/AuthContext";

export function usePermission(permission: keyof Permission): boolean {
  const { user } = useAuth();
  const { permissions } = useRBACStore();
  if (!user) return false;
  const role = (user.role as UserRole) || "user";
  return permissions[role]?.[permission] ?? false;
}

export function usePermissions(): Permission {
  const { user } = useAuth();
  const { permissions } = useRBACStore();
  if (!user) return DEFAULT_PERMISSIONS.user;
  const role = (user.role as UserRole) || "user";
  return permissions[role] ?? DEFAULT_PERMISSIONS.user;
}

export { DEFAULT_PERMISSIONS };
