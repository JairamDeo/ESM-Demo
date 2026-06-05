import api from "./api";

// Utility to convert Base64 string to Uint8Array
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeToPushNotifications = async (): Promise<boolean> => {
  try {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers are not supported in this browser.");
      return false;
    }

    if (!("PushManager" in window)) {
      console.warn("Push notifications are not supported in this browser.");
      return false;
    }

    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.register("/sw.js");

    // Check current permission
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.warn("Push notification permission denied.");
      return false;
    }

    // Get public key from env
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error("VITE_VAPID_PUBLIC_KEY is not set in environment variables.");
      return false;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Send subscription to backend
    await api.post("/notifications/subscribe", {
      subscription: subscription.toJSON(),
    });

    console.log("Successfully subscribed to push notifications");
    return true;
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    return false;
  }
};

export const testPushNotification = async (): Promise<boolean> => {
  try {
    await api.post("/notifications/test-push");
    return true;
  } catch (error) {
    console.error("Error testing push notification:", error);
    return false;
  }
};
