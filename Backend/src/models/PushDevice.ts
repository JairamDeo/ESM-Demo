import { Schema, Types } from "mongoose";

export const pushDeviceSchema = new Schema(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

export interface IPushDevice {
  _id?: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  lastSyncedAt?: Date;
}
