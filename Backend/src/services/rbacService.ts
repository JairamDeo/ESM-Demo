import RolePermission from "../models/RolePermission";
import {
  DEFAULT_ROLE_PERMISSIONS,
  OFFICER_ROLE_TO_RBAC,
  PERMISSION_KEYS,
  PermissionMap,
  RbacRole,
  SETTINGS_ROLES,
} from "../constants/permissions";

export type RolePermissionsMap = Record<string, PermissionMap>;

export async function ensureRolePermissionsSeeded(): Promise<void> {
  const count = await RolePermission.countDocuments();
  if (count > 0) return;

  await RolePermission.insertMany(
    (Object.keys(DEFAULT_ROLE_PERMISSIONS) as RbacRole[]).map((role) => ({
      role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
    }))
  );
}

export async function getAllRolePermissions(): Promise<RolePermissionsMap> {
  await ensureRolePermissionsSeeded();
  const docs = await RolePermission.find().lean();
  const map: RolePermissionsMap = { ...DEFAULT_ROLE_PERMISSIONS };

  for (const doc of docs) {
    map[doc.role] = { ...DEFAULT_ROLE_PERMISSIONS[doc.role as RbacRole], ...doc.permissions };
  }

  // Settings matrix expects these four roles always present
  for (const role of SETTINGS_ROLES) {
    if (!map[role]) map[role] = { ...DEFAULT_ROLE_PERMISSIONS[role] };
  }
  if (!map.user) map.user = { ...DEFAULT_ROLE_PERMISSIONS.user };

  return map;
}

export async function getPermissionsForRole(role: RbacRole): Promise<PermissionMap> {
  const all = await getAllRolePermissions();
  return all[role] ?? DEFAULT_ROLE_PERMISSIONS[role];
}

export async function getPermissionsForOfficerRole(officerRole: string): Promise<PermissionMap> {
  const rbacRole = OFFICER_ROLE_TO_RBAC[officerRole] ?? "station_hq";
  return getPermissionsForRole(rbacRole);
}

export async function updateRolePermission(
  role: RbacRole,
  permission: string,
  value: boolean,
  actor?: { id: string; name?: string; email?: string; role?: string }
): Promise<PermissionMap> {
  if (role === "super_admin") {
    throw new Error("Super Admin permissions cannot be modified");
  }
  if (!PERMISSION_KEYS.includes(permission as any)) {
    throw new Error("Invalid permission key");
  }

  await ensureRolePermissionsSeeded();
  const existing = await RolePermission.findOne({ role });
  const base = existing?.permissions ?? DEFAULT_ROLE_PERMISSIONS[role];
  const next = { ...base, [permission]: value };

  await RolePermission.findOneAndUpdate(
    { role },
    {
      role,
      permissions: next,
      updatedBy: actor,
    },
    { upsert: true, new: true }
  );

  return next as PermissionMap;
}

export async function resetRolePermissions(
  role: RbacRole,
  actor?: { id: string; name?: string; email?: string; role?: string }
): Promise<PermissionMap> {
  const defaults = DEFAULT_ROLE_PERMISSIONS[role];
  await RolePermission.findOneAndUpdate(
    { role },
    { role, permissions: defaults, updatedBy: actor },
    { upsert: true, new: true }
  );
  return defaults;
}

export async function resetAllRolePermissions(
  actor?: { id: string; name?: string; email?: string; role?: string }
): Promise<RolePermissionsMap> {
  for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS) as RbacRole[]) {
    await resetRolePermissions(role, actor);
  }
  return getAllRolePermissions();
}
