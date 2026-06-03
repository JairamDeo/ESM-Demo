import { Request, Response } from "express";
import { RbacRole, SETTINGS_ROLES } from "../constants/permissions";
import {
  getAllRolePermissions,
  getPermissionsForRole,
  resetAllRolePermissions,
  resetRolePermissions,
  updateRolePermission,
} from "../services/rbacService";

export const getRolePermissions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await getAllRolePermissions();
    res.status(200).json({ success: true, data: permissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const role = (user?.role as RbacRole) || "user";
    const permissions = await getPermissionsForRole(role);
    res.status(200).json({ success: true, data: { role, permissions } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const patchRolePermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.params.role as RbacRole;
    const { permission, value } = req.body;

    if (!SETTINGS_ROLES.includes(role)) {
      res.status(400).json({ success: false, message: "Invalid role" });
      return;
    }
    if (typeof value !== "boolean") {
      res.status(400).json({ success: false, message: "value must be boolean" });
      return;
    }

    const actor = (req as any).user;
    const updated = await updateRolePermission(role, permission, value, actor);
    const all = await getAllRolePermissions();
    res.status(200).json({ success: true, data: { role, permissions: updated, all } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const resetRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.params.role as RbacRole;
    if (!SETTINGS_ROLES.includes(role)) {
      res.status(400).json({ success: false, message: "Invalid role" });
      return;
    }
    const actor = (req as any).user;
    await resetRolePermissions(role, actor);
    const all = await getAllRolePermissions();
    res.status(200).json({ success: true, data: all });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetAllRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const all = await resetAllRolePermissions(actor);
    res.status(200).json({ success: true, data: all });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
