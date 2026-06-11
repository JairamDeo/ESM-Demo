import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  phone: string;
  name?: string;
  rank?: string;
  serviceNumber?: string;
  armyNumber?: string;
  email?: string;
  address?: string;
  stationHQ?: string;
  otp?: string;
  otpExpiry?: Date;
  otpSentAt?: Date;
  isVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true },
    rank: { type: String, trim: true },
    serviceNumber: { type: String, trim: true },
    armyNumber: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String },
    stationHQ: { type: String },
    otp: { type: String },
    otpExpiry: { type: Date },
    otpSentAt: { type: Date },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.otp;
    delete ret.otpExpiry;
    return ret;
  },
});

export default mongoose.model<IUser>("User", UserSchema);
