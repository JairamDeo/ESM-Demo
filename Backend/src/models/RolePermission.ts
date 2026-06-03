import mongoose, { Document, Schema } from "mongoose";
import { permissionSchemaFields, RbacRole } from "../constants/permissions";

export interface IRolePermission extends Document {
  role: RbacRole;
  permissions: Record<string, boolean>;
  updatedBy?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
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
    updatedBy: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IRolePermission>("RolePermission", RolePermissionSchema);
