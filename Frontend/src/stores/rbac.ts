// ─── Role-Based Access Control ───────────────────────────────────────────────
// Permissions are loaded from the backend (MongoDB) and cached in memory.
// super_admin can change role templates via Settings page.

import { create } from "zustand";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  OFFICER_ROLE_TO_RBAC,
  resolveRbacRole,
  type UserRole,
} from "@/lib/rbacRole";

export type { UserRole };
export { OFFICER_ROLE_TO_RBAC, resolveRbacRole };

export interface Permission {
  viewDashboard: boolean;
  viewGrievances: boolean;
  createGrievance: boolean;
  updateGrievanceStatus: boolean;
  deleteGrievance: boolean;
  escalateGrievance: boolean;
  reassignOfficer: boolean;
  viewSlaSettings: boolean;
  manageSlaSettings: boolean;
  viewCaseTypes: boolean;
  manageCaseTypes: boolean;
  viewRequiredDocuments: boolean;
  manageRequiredDocuments: boolean;
  viewCategories: boolean;
  manageCategories: boolean;
  viewStations: boolean;
  manageStations: boolean;
  viewQRCodes: boolean;
  manageQRCodes: boolean;
  viewOfficers: boolean;
  manageOfficers: boolean;
  viewEscalations: boolean;
  resolveEscalations: boolean;
  viewReports: boolean;
  exportReports: boolean;
  viewSettings: boolean;
  manageSettings: boolean;
  manageRoles: boolean;
  loginAsVeteran: boolean;
  viewAnnouncements: boolean;
  manageAnnouncements: boolean;
}

export type RolePermissions = Record<UserRole, Permission>;

const DEFAULT_PERMISSIONS: RolePermissions = {
  super_admin: {
    viewDashboard: true, viewGrievances: true, createGrievance: true,
    updateGrievanceStatus: true, deleteGrievance: true, escalateGrievance: true,
    reassignOfficer: true, viewSlaSettings: true, manageSlaSettings: true,
    viewCaseTypes: true, manageCaseTypes: true,
    viewRequiredDocuments: true, manageRequiredDocuments: true,
    viewCategories: true, manageCategories: true,
    viewStations: true, manageStations: true, viewQRCodes: true, manageQRCodes: true,
    viewOfficers: true, manageOfficers: true, viewEscalations: true,
    resolveEscalations: true, viewReports: true, exportReports: true,
    viewSettings: true, manageSettings: true, manageRoles: true, loginAsVeteran: false,
    viewAnnouncements: true, manageAnnouncements: true,
  },
  area: {
    viewDashboard: true, viewGrievances: true, createGrievance: true,
    updateGrievanceStatus: true, deleteGrievance: false, escalateGrievance: true,
    reassignOfficer: true, viewSlaSettings: true, manageSlaSettings: true,
    viewCaseTypes: true, manageCaseTypes: false,
    viewRequiredDocuments: true, manageRequiredDocuments: true,
    viewCategories: true, manageCategories: false,
    viewStations: true, manageStations: true, viewQRCodes: true, manageQRCodes: false,
    viewOfficers: true, manageOfficers: true, viewEscalations: true,
    resolveEscalations: true, viewReports: true, exportReports: true,
    viewSettings: true, manageSettings: false, manageRoles: false, loginAsVeteran: true,
    viewAnnouncements: true, manageAnnouncements: false,
  },
  headquarter: {
    viewDashboard: true, viewGrievances: true, createGrievance: true,
    updateGrievanceStatus: true, deleteGrievance: false, escalateGrievance: true,
    reassignOfficer: false, viewSlaSettings: true, manageSlaSettings: false,
    viewCaseTypes: true, manageCaseTypes: false,
    viewRequiredDocuments: true, manageRequiredDocuments: true,
    viewCategories: true, manageCategories: false,
    viewStations: true, manageStations: true, viewQRCodes: true, manageQRCodes: false,
    viewOfficers: true, manageOfficers: true, viewEscalations: false,
    resolveEscalations: false, viewReports: false, exportReports: false,
    viewSettings: false, manageSettings: false, manageRoles: false, loginAsVeteran: true,
    viewAnnouncements: true, manageAnnouncements: true,
  },
  station_hq: {
    viewDashboard: true, viewGrievances: true, createGrievance: false,
    updateGrievanceStatus: true, deleteGrievance: false, escalateGrievance: true,
    reassignOfficer: false, viewSlaSettings: false, manageSlaSettings: false,
    viewCaseTypes: true, manageCaseTypes: false,
    viewRequiredDocuments: true, manageRequiredDocuments: false,
    viewCategories: true, manageCategories: false,
    viewStations: false, manageStations: false, viewQRCodes: false, manageQRCodes: false,
    viewOfficers: false, manageOfficers: false, viewEscalations: false,
    resolveEscalations: false, viewReports: true, exportReports: true,
    viewSettings: false, manageSettings: false, manageRoles: false, loginAsVeteran: true,
    viewAnnouncements: false, manageAnnouncements: false,
  },
  user: {
    viewDashboard: false, viewGrievances: true, createGrievance: true,
    updateGrievanceStatus: false, deleteGrievance: false, escalateGrievance: false,
    reassignOfficer: false, viewSlaSettings: false, manageSlaSettings: false,
    viewCaseTypes: false, manageCaseTypes: false,
    viewRequiredDocuments: false, manageRequiredDocuments: false,
    viewCategories: false, manageCategories: false,
    viewStations: false, manageStations: false, viewQRCodes: false, manageQRCodes: false,
    viewOfficers: false, manageOfficers: false, viewEscalations: false,
    resolveEscalations: false, viewReports: false, exportReports: false,
    viewSettings: false, manageSettings: false, manageRoles: false, loginAsVeteran: false,
    viewAnnouncements: false, manageAnnouncements: false,
  },
};

function mergeWithDefaults(fetched: Partial<RolePermissions>): RolePermissions {
  const merged = { ...DEFAULT_PERMISSIONS };
  for (const role of Object.keys(DEFAULT_PERMISSIONS) as UserRole[]) {
    merged[role] = { ...DEFAULT_PERMISSIONS[role], ...(fetched[role] ?? {}) };
  }
  return merged;
}

interface RBACStore {
  permissions: RolePermissions;
  loaded: boolean;
  setPermissions: (permissions: RolePermissions) => void;
  fetchPermissions: () => Promise<void>;
  updateRolePermission: (role: UserRole, permission: keyof Permission, value: boolean) => Promise<void>;
  resetRole: (role: UserRole) => Promise<void>;
  resetAll: () => Promise<void>;
}

export const useRBACStore = create<RBACStore>((set, get) => ({
  permissions: DEFAULT_PERMISSIONS,
  loaded: false,

  setPermissions: (permissions) => set({ permissions: mergeWithDefaults(permissions), loaded: true }),

  fetchPermissions: async () => {
    try {
      const { data } = await api.get("/rbac/permissions");
      if (data.success && data.data) {
        set({ permissions: mergeWithDefaults(data.data), loaded: true });
      }
    } catch {
      // Keep in-memory defaults if API unavailable
    }
  },

  updateRolePermission: async (role, permission, value) => {
    const prev = get().permissions;
    set((state) => ({
      permissions: {
        ...state.permissions,
        [role]: { ...(state.permissions[role] ?? DEFAULT_PERMISSIONS[role]), [permission]: value },
      },
    }));
    try {
      const { data } = await api.patch(`/rbac/roles/${role}`, { permission, value });
      if (data.success && data.data?.all) {
        set({ permissions: mergeWithDefaults(data.data.all) });
      }
    } catch (err) {
      set({ permissions: prev });
      throw err;
    }
  },

  resetRole: async (role) => {
    const prev = get().permissions;
    set((state) => ({
      permissions: { ...state.permissions, [role]: DEFAULT_PERMISSIONS[role] },
    }));
    try {
      const { data } = await api.post(`/rbac/roles/${role}/reset`);
      if (data.success && data.data) {
        set({ permissions: mergeWithDefaults(data.data) });
      }
    } catch (err) {
      set({ permissions: prev });
      throw err;
    }
  },

  resetAll: async () => {
    const prev = get().permissions;
    set({ permissions: DEFAULT_PERMISSIONS });
    try {
      const { data } = await api.post("/rbac/reset-all");
      if (data.success && data.data) {
        set({ permissions: mergeWithDefaults(data.data) });
      }
    } catch (err) {
      set({ permissions: prev });
      throw err;
    }
  },
}));

export function getTemplateForOfficerRole(officerRole: string): Permission {
  const rbacRole = OFFICER_ROLE_TO_RBAC[officerRole] ?? "station_hq";
  return useRBACStore.getState().permissions[rbacRole] ?? DEFAULT_PERMISSIONS[rbacRole];
}

export function usePermission(permission: keyof Permission): boolean {
  const { user } = useAuth();
  const { permissions } = useRBACStore();
  if (!user) return false;
  const role = resolveRbacRole(user.role);
  return permissions[role]?.[permission] ?? DEFAULT_PERMISSIONS[role]?.[permission] ?? false;
}

export function usePermissions(): Permission {
  const { user } = useAuth();
  const { permissions } = useRBACStore();
  if (!user) return DEFAULT_PERMISSIONS.user;
  const role = resolveRbacRole(user.role);
  return permissions[role] ?? DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS.user;
}

export { DEFAULT_PERMISSIONS };
