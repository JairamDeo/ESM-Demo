import api from "./api";

export type PushSyncResult =
  | { ok: true; synced: boolean; reason?: string }
  | { ok: false; reason: string };

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function fetchVapidPublicKey(): Promise<string | null> {
  const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
  if (fromEnv) return fromEnv;

  try {
    const { data } = await api.get("/notifications/push-config");
    const key = data?.data?.publicKey?.trim();
    return key || null;
  } catch {
    return null;
  }
}

async function saveSubscriptionToBackend(subscription: PushSubscriptionJSON): Promise<void> {
  await api.post("/notifications/subscribe", {
    subscription,
    userAgent: navigator.userAgent,
  });
}

/**
 * Register this browser as a push device for the logged-in user.
 * Called automatically on login — prompts for permission on new devices.
 */
export async function registerPushDeviceOnLogin(): Promise<PushSyncResult> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: true, synced: false, reason: "Push not supported in this browser." };
    }

    const publicKey = await fetchVapidPublicKey();
    if (!publicKey) {
      return { ok: true, synced: false, reason: "Push not configured on server." };
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return {
        ok: true,
        synced: false,
        reason:
          permission === "denied"
            ? "Notification permission blocked."
            : "Notification permission not granted.",
      };
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await saveSubscriptionToBackend(subscription.toJSON());
    return { ok: true, synced: true };
  } catch (error: any) {
    console.error("Push registration error:", error);
    return {
      ok: true,
      synced: false,
      reason: error?.response?.data?.message || error?.message || "Push registration failed.",
    };
  }
}
