import mongoose from "mongoose";
import User from "../models/User";
import Officer from "../models/Officer";

export interface PushDeviceInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

export interface PushDeviceRecord {
  _id?: mongoose.Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  lastSyncedAt?: Date;
}

function upsertDeviceList(
  devices: PushDeviceRecord[],
  device: PushDeviceInput
): PushDeviceRecord[] {
  const now = new Date();
  const entry: PushDeviceRecord = {
    endpoint: device.endpoint,
    keys: device.keys,
    userAgent: device.userAgent,
    lastSyncedAt: now,
  };
  const idx = devices.findIndex((d) => d.endpoint === device.endpoint);
  if (idx >= 0) {
    const next = [...devices];
    next[idx] = { ...next[idx], ...entry };
    return next;
  }
  return [...devices, entry];
}

export async function registerPushDevice(
  userId: mongoose.Types.ObjectId | string,
  userType: "user" | "admin",
  device: PushDeviceInput
): Promise<PushDeviceRecord[]> {
  const id =
    typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  if (userType === "user") {
    const user = await User.findById(id);
    if (!user) throw new Error("User not found");
    user.pushDevices = upsertDeviceList(
      (user.pushDevices as PushDeviceRecord[]) || [],
      device
    ) as any;
    await user.save();
    return user.pushDevices as PushDeviceRecord[];
  }

  const officer = await Officer.findById(id);
  if (!officer) throw new Error("Officer not found");
  officer.pushDevices = upsertDeviceList(
    (officer.pushDevices as PushDeviceRecord[]) || [],
    device
  ) as any;
  await officer.save();
  return officer.pushDevices as PushDeviceRecord[];
}

export async function getPushDevices(
  userId: mongoose.Types.ObjectId | string,
  userType: "user" | "admin"
): Promise<PushDeviceRecord[]> {
  const id =
    typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  if (userType === "user") {
    const user = await User.findById(id).select("pushDevices").lean();
    return (user?.pushDevices as PushDeviceRecord[]) || [];
  }

  const officer = await Officer.findById(id).select("pushDevices").lean();
  return (officer?.pushDevices as PushDeviceRecord[]) || [];
}

export async function removePushDevice(
  userId: mongoose.Types.ObjectId | string,
  userType: "user" | "admin",
  endpoint: string
): Promise<void> {
  const id =
    typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  if (userType === "user") {
    await User.updateOne({ _id: id }, { $pull: { pushDevices: { endpoint } } });
    return;
  }

  await Officer.updateOne({ _id: id }, { $pull: { pushDevices: { endpoint } } });
}
