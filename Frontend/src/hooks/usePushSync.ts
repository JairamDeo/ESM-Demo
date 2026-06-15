import { useEffect, useRef } from "react";
import { registerPushDeviceOnLogin } from "@/lib/pushNotifications";

/** Auto-save push device token when officer or veteran logs in (or opens app while logged in). */
export function usePushSync(isAuthenticated: boolean, userId?: string | null) {
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (lastUserId.current === userId) return;
    lastUserId.current = userId;

    const timer = setTimeout(() => {
      registerPushDeviceOnLogin().catch(() => undefined);
    }, 600);

    return () => clearTimeout(timer);
  }, [isAuthenticated, userId]);
}
