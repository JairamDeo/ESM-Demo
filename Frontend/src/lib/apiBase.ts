const DEFAULT_API_BASE = "http://localhost:5050/api";

/**
 * Uses VITE_API_URL from .env (e.g. http://localhost:5050/api).
 * If the app is opened via LAN IP (http://192.168.x.x:5173), rewrites localhost in the
 * API URL to that same IP so requests hit the machine running the backend.
 */
export function getApiBaseUrl(): string {
  const base = (import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_BASE).replace(/\/$/, "");

  if (typeof window === "undefined") return base;

  try {
    const apiUrl = new URL(base);
    const apiIsLocal =
      apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1";
    const pageHost = window.location.hostname;
    const pageIsLocal = pageHost === "localhost" || pageHost === "127.0.0.1";

    if (apiIsLocal && !pageIsLocal) {
      apiUrl.hostname = pageHost;
      return apiUrl.toString().replace(/\/$/, "");
    }
  } catch {
    // relative URL (e.g. /api) — use as-is
  }

  return base;
}
