import mongoose from "mongoose";
import Notification from "../models/Notification";
import { sendPushNotification } from "../utils/webPush";
import { getPushDevices, removePushDevice } from "./pushDeviceService";

export type NotificationType =
  | "grievance_update"
  | "escalation"
  | "assignment"
  | "resolved"
  | "system";

export interface NotifyInput {
  recipientId: mongoose.Types.ObjectId | string;
  recipientType: "user" | "admin";
  title: string;
  message: string;
  type: NotificationType;
  grievanceId?: mongoose.Types.ObjectId;
  grievanceCode?: string;
  push?: boolean;
  url?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

function defaultUrl(recipientType: "user" | "admin", grievanceCode?: string): string {
  if (recipientType === "user") {
    return grievanceCode ? "/user/track-case" : "/user/notifications";
  }
  return grievanceCode ? "/grievances" : "/notifications";
}

export async function sendPushToRecipient(
  recipientId: mongoose.Types.ObjectId | string,
  recipientType: "user" | "admin",
  payload: PushPayload
): Promise<number> {
  const userObjectId =
    typeof recipientId === "string"
      ? new mongoose.Types.ObjectId(recipientId)
      : recipientId;

  const subs = await getPushDevices(userObjectId, recipientType);

  let sent = 0;
  for (const sub of subs) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: sub.keys,
    };
    const ok = await sendPushNotification(subscription, {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/Logo.svg",
      url: payload.url || defaultUrl(recipientType),
    });
    if (ok) {
      sent += 1;
    } else {
      await removePushDevice(userObjectId, recipientType, sub.endpoint).catch(
        () => undefined
      );
    }
  }
  return sent;
}

/** Create in-app notification and optionally send web push. */
export async function notify(input: NotifyInput): Promise<void> {
  const recipientId =
    typeof input.recipientId === "string"
      ? new mongoose.Types.ObjectId(input.recipientId)
      : input.recipientId;

  await Notification.create({
    recipientId,
    recipientType: input.recipientType,
    title: input.title,
    message: input.message,
    type: input.type,
    grievanceId: input.grievanceId,
    grievanceCode: input.grievanceCode,
  });

  if (input.push === false) return;

  await sendPushToRecipient(recipientId, input.recipientType, {
    title: input.title,
    body: input.message,
    url: input.url || defaultUrl(input.recipientType, input.grievanceCode),
  });
}

export async function notifyOfficer(
  officerId: mongoose.Types.ObjectId | string | undefined,
  input: Omit<NotifyInput, "recipientId" | "recipientType">
): Promise<void> {
  if (!officerId) return;
  await notify({ ...input, recipientId: officerId, recipientType: "admin" });
}

export async function notifyVeteran(
  userId: mongoose.Types.ObjectId | string | undefined,
  input: Omit<NotifyInput, "recipientId" | "recipientType">
): Promise<void> {
  if (!userId) return;
  await notify({ ...input, recipientId: userId, recipientType: "user" });
}
