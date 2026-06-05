import mongoose, { Document, Schema } from "mongoose";
import { permissionSchemaFields, RbacRole } from "../constants/permissions";
import { rbacChangeEntrySchema, IRbacChangeEntry } from "./AuditLog";

export interface IRolePermission extends Document {
  role: RbacRole;
  permissions: Record<string, boolean>;
  /** Append-only — never overwrite previous RBAC changes. */
  changeHistory: IRbacChangeEntry[];
  updatedAt: Date;
  createdAt: Date;
}

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      enum: ["super_admin", "area", "headquarter", "station_hq", "user"],
    },
    permissions: permissionSchemaFields,
    changeHistory: { type: [rbacChangeEntrySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IRolePermission>("RolePermission", RolePermissionSchema);
