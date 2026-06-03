import { Router } from "express";
import {
  getMyPermissions,
  getRolePermissions,
  patchRolePermission,
  resetAllRoles,
  resetRole,
} from "../controllers/rbacController";
import { protect, restrictTo } from "../middleware/auth";

export const rbacRouter = Router();

rbacRouter.get("/permissions", protect, getRolePermissions);
rbacRouter.get("/me", protect, getMyPermissions);
rbacRouter.patch("/roles/:role", protect, restrictTo("super_admin"), patchRolePermission);
rbacRouter.post("/roles/:role/reset", protect, restrictTo("super_admin"), resetRole);
rbacRouter.post("/reset-all", protect, restrictTo("super_admin"), resetAllRoles);
