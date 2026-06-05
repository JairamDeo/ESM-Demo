import mongoose, { Document, Schema } from "mongoose";
import { auditEntrySchema, IAuditEntry } from "./AuditLog";

export interface IHQStationRef {
  stationId: mongoose.Types.ObjectId;
  stationName: string;
}

export interface IHQ extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  city: string;
  /** Legacy string state name — prefer stateId/stateName. */
  state: string;
  /** Area this HQ belongs to (multiple HQs per area). */
  stateId?: mongoose.Types.ObjectId;
  stateName?: string;
  stateCode?: string;
  address?: string;
  commanderName?: string;
  contactEmail?: string;
  contactPhone?: string;
  stations: IHQStationRef[];
  auditHistory: IAuditEntry[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HQSchema = new Schema<IHQ>(
  {
    name:          { type: String, required: true, unique: true, trim: true },
    city:          { type: String, required: true, trim: true },
    state:         { type: String, required: true, trim: true },
    stateId:       { type: Schema.Types.ObjectId, ref: "State" },
    stateName:     { type: String },
    stateCode:     { type: String },
    address:       { type: String },
    commanderName: { type: String },
    contactEmail:  { type: String, lowercase: true },
    contactPhone:  { type: String },
    stations: [
      {
        stationId:   { type: Schema.Types.ObjectId, ref: "Station", required: true },
        stationName: { type: String, required: true, trim: true },
      },
    ],
    auditHistory: { type: [auditEntrySchema], default: [] },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

HQSchema.index({ stateId: 1 });

export default mongoose.model<IHQ>("HQ", HQSchema);
