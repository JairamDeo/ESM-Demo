import mongoose, { Document, Schema } from "mongoose";

export interface IHQ extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  city: string;
  state: string;
  address?: string;
  commanderName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HQSchema = new Schema<IHQ>(
  {
    name:          { type: String, required: true, unique: true, trim: true },
    city:          { type: String, required: true, trim: true },
    state:         { type: String, required: true, trim: true },
    address:       { type: String },
    commanderName: { type: String },
    contactEmail:  { type: String, lowercase: true },
    contactPhone:  { type: String },
    isActive:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IHQ>("HQ", HQSchema);