import RolePermission from "../models/RolePermission";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_KEYS,
  PermissionMap,
  RbacRole,
  SETTINGS_ROLES,
} from "../constants/permissions";
import { OFFICER_ROLE_TO_RBAC } from "../constants/officerRoles";
import { buildRbacChangeEntry, RequestActor } from "./auditService";
import { IRbacChangeEntry } from "../models/AuditLog";

export type RolePermissionsMap = Record<string, PermissionMap>;

export async function ensureRolePermissionsSeeded(): Promise<void> {
  const count = await RolePermission.countDocuments();
  if (count > 0) return;

  await RolePermission.insertMany(
    (Object.keys(DEFAULT_ROLE_PERMISSIONS) as RbacRole[]).map((role) => ({
      role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
      changeHistory: [],
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

export async function getRoleChangeHistory(role: RbacRole): Promise<IRbacChangeEntry[]> {
  await ensureRolePermissionsSeeded();
  const doc = await RolePermission.findOne({ role }).select("changeHistory").lean();
  return doc?.changeHistory ?? [];
}

export async function updateRolePermission(
  role: RbacRole,
  permission: string,
  value: boolean,
  actor: RequestActor
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
  const previousValue = base[permission as keyof PermissionMap] as boolean | undefined;
  const next = { ...base, [permission]: value };

  const changeEntry = buildRbacChangeEntry(actor, "toggle", {
    permission,
    previousValue,
    newValue: value,
  });

  await RolePermission.findOneAndUpdate(
    { role },
    {
      $set: { role, permissions: next },
      $push: { changeHistory: changeEntry },
    },
    { upsert: true, new: true }
  );

  return next as PermissionMap;
}

export async function resetRolePermissions(
  role: RbacRole,
  actor: RequestActor
): Promise<PermissionMap> {
  const defaults = DEFAULT_ROLE_PERMISSIONS[role];
  const existing = await RolePermission.findOne({ role });
  const current = existing?.permissions ?? defaults;

  const changedKeys = PERMISSION_KEYS.filter(
    (key) => (current[key as keyof PermissionMap] as boolean) !== (defaults[key as keyof PermissionMap] as boolean)
  );

  const changeEntry = buildRbacChangeEntry(actor, "reset", {
    note:
      changedKeys.length > 0
        ? `Reset ${changedKeys.length} permission(s) to defaults: ${changedKeys.join(", ")}`
        : "All permissions already at defaults",
  });

  await RolePermission.findOneAndUpdate(
    { role },
    {
      $set: { role, permissions: defaults },
      $push: { changeHistory: changeEntry },
    },
    { upsert: true, new: true }
  );

  return defaults;
}

export async function resetAllRolePermissions(actor: RequestActor): Promise<RolePermissionsMap> {
  for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS) as RbacRole[]) {
    if (role === "super_admin") continue;

    const defaults = DEFAULT_ROLE_PERMISSIONS[role];
    const changeEntry = buildRbacChangeEntry(actor, "reset_all", {
      note: "Bulk reset — all role permissions reset to defaults",
    });

    await RolePermission.findOneAndUpdate(
      { role },
      {
        $set: { role, permissions: defaults },
        $push: { changeHistory: changeEntry },
      },
      { upsert: true, new: true }
    );
  }

  return getAllRolePermissions();
}
