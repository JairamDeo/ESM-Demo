import type { IncomingMessage, ServerResponse } from "http";
import app from "../Backend/src/app";
import { ensureMongoConnected } from "../Backend/src/config/database";
import "../Backend/src/models/User";

function headerValue(req: IncomingMessage, name: string): string {
  const raw = req.headers[name];
  return Array.isArray(raw) ? raw[0] || "" : raw || "";
}

/** Keep Express paths like /api/auth/user/send-otp after a Vercel rewrite to /api. */
function restoreApiUrl(req: IncomingMessage) {
  const current = req.url || "/";
  if (current.startsWith("/api/") || current === "/api") return;

  const fromQuery = (() => {
    try {
      const parsed = new URL(current, "http://localhost");
      return parsed.searchParams.get("__path") || "";
    } catch {
      return "";
    }
  })();

  const fromHeaders = [
    headerValue(req, "x-invoke-path"),
    headerValue(req, "x-forwarded-uri"),
    headerValue(req, "x-vercel-original-url"),
  ].find((value) => value.includes("/api"));

  const candidate = fromQuery || fromHeaders || "";
  if (!candidate) return;

  const path = candidate.startsWith("http")
    ? (() => {
        const url = new URL(candidate);
        return `${url.pathname}${url.search}`;
      })()
    : candidate;

  const apiAt = path.indexOf("/api");
  if (apiAt >= 0) req.url = path.slice(apiAt);
}

/**
 * Same Vercel host as the Vite app: https://esm-demo.vercel.app/api/...
 * Local `npm run dev` is unchanged (Backend/src/index.ts still listens).
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  restoreApiUrl(req);

  try {
    await ensureMongoConnected();
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, message: err?.message || "Database unavailable" }));
    return;
  }

  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
