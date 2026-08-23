const DEFAULT_API_BASE = "http://localhost:5000/api";

/**
 * Uses VITE_API_URL from .env (e.g. http://localhost:5000/api).
 * If the app is opened via LAN IP (http://192.168.x.x:5173), rewrites localhost in the
 * API URL to that same IP so requests hit the machine running the backend.
 */
function parseFrontendUrls(value?: string): string[] {
  return [
    ...new Set(
      (value || "")
        .split(",")
        .map((u) => u.trim().replace(/\/$/, ""))
        .filter((u) => u && u !== "*")
    ),
  ];
}

function isLoopbackUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * One URL encoded into station QR codes.
 * VITE_FRONTEND_URL may be comma-separated (same as backend FRONTEND_URL).
 * Uses the current tab if it is in that list and not localhost; otherwise a LAN URL
 * so phones on Wi‑Fi can open the scan.
 */
export function getFrontendBaseUrl(): string {
  const listed = parseFrontendUrls(import.meta.env.VITE_FRONTEND_URL);
  const current =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin.replace(/\/$/, "")
      : "";

  if (current && listed.includes(current) && !isLoopbackUrl(current)) return current;

  const lan = listed.find((u) => !isLoopbackUrl(u));
  if (lan) return lan;

  if (current && listed.includes(current)) return current;
  return listed[0] || current || "http://localhost:5174";
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
