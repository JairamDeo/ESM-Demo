import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const publicKey = process.env.VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = process.env.VAPID_SUBJECT || "mailto:support@vitric.in";

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
} else {
  console.warn("VAPID keys are not configured. Web push notifications will not work.");
}

export const sendPushNotification = async (subscription: any, payload: any) => {
  try {
    const stringifiedPayload = typeof payload === "string" ? payload : JSON.stringify(payload);
    await webpush.sendNotification(subscription, stringifiedPayload);
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
};

export default webpush;
