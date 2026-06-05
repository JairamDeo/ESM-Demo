import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { OFFICER_LEVELS, OfficerLevel } from "../constants/officerLevels";
import { OfficerJobRole } from "../constants/officerRoles";
import { RbacRole } from "../constants/permissions";
import { auditActorSchema, IAuditActor } from "./AuditActor";

export { OFFICER_LEVELS, OfficerLevel };

export interface IOfficer extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  rank: string;
  role: OfficerJobRole;
  /** RBAC matrix key — permissions come from Settings rolepermissions, not this document. */
  rbacRole: RbacRole;
  level?: OfficerLevel;
  /** Portal login (former admins live here too). */
  username?: string;
  password?: string;
  canLogin: boolean;
  email: string;
  phone?: string;
  /** Area Officer assignment */
  stateId?: mongoose.Types.ObjectId;
  stateName?: string;
  stateCode?: string;
  /** Headquarter Officer assignment */
  hqId?: mongoose.Types.ObjectId;
  hqName?: string;
  /** Station HQ Officer assignment */
  station?: mongoose.Types.ObjectId;
  stationName?: string;
  activeCases: number;
  totalCasesHandled: number;
  status: "active" | "inactive";
  lastLogin?: Date;
  createdBy?: IAuditActor;
  updatedBy?: IAuditActor;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const OfficerSchema = new Schema<IOfficer>(
  {
    name:  { type: String, required: true, trim: true },
    rank:  { type: String, trim: true, default: "" },
    role:  {
      type: String,
      enum: ["Super Admin", "Area Officer", "Headquarter Officer", "Station HQ Officer"],
      required: true,
    },
    rbacRole: {
      type: String,
      enum: ["super_admin", "area", "headquarter", "station_hq"],
      required: true,
    },
    level: {
      type: String,
      enum: OFFICER_LEVELS,
      required: false,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, minlength: 6, select: false },
    canLogin: { type: Boolean, default: false },
    email:  { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:  { type: String },
    stateId:   { type: Schema.Types.ObjectId, ref: "State" },
    stateName: { type: String },
    stateCode: { type: String },
    hqId:      { type: Schema.Types.ObjectId, ref: "HQ" },
    hqName:    { type: String },
    station:     { type: Schema.Types.ObjectId, ref: "Station" },
    stationName: { type: String },
    activeCases:       { type: Number, default: 0, min: 0 },
    totalCasesHandled: { type: Number, default: 0, min: 0 },
    status:   { type: String, enum: ["active", "inactive"], default: "active" },
    lastLogin: { type: Date },
    createdBy: auditActorSchema,
    updatedBy: auditActorSchema,
  },
  { timestamps: true }
);

OfficerSchema.pre<IOfficer>("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

OfficerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

OfficerSchema.set("toJSON", {
  transform: (_doc: any, ret: any) => {
    delete ret.password;
    return ret;
  },
});

export default mongoose.model<IOfficer>("Officer", OfficerSchema);
