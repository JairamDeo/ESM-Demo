import { Request, Response, NextFunction } from "express";
import { PermissionKey, RbacRole } from "../constants/permissions";
import { getPermissionsForRole } from "../services/rbacService";

/** Require at least one of the given RBAC permission keys (from Mongo role template). */
export const requirePermission = (...keys: PermissionKey[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      if (!user?.role) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const perms = await getPermissionsForRole(user.role as RbacRole);
      const allowed = keys.some((k) => perms[k] === true);
      if (!allowed) {
        res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
        return;
      }
      next();
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
};
