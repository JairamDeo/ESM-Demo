const DEFAULT_API_BASE = "http://localhost:5000/api";

/**
 * Uses VITE_API_URL from .env (e.g. http://localhost:5000/api).
 * If the app is opened via LAN IP (http://192.168.x.x:5173), rewrites localhost in the
 * API URL to that same IP so requests hit the machine running the backend.
 */
/** Veteran/admin site URL encoded into QR codes. LAN IP so phones on Wi‑Fi can open it. */
export function getFrontendBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_FRONTEND_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "http://localhost:5174";
}

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

/** Backend origin for static files (e.g. /uploads/... annexure PDFs). */
export function getUploadBaseUrl(): string {
  return getApiBaseUrl().replace(/\/api$/, "");
}

export function resolveUploadUrl(path?: string | null): string | null {
  const p = path?.trim();
  if (!p || p === "null" || p === "undefined") return null;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${getUploadBaseUrl()}${p.startsWith("/") ? p : `/${p}`}`;
}
