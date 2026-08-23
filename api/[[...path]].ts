import type { IncomingMessage, ServerResponse } from "http";
import app from "../Backend/src/app";
import { ensureMongoConnected } from "../Backend/src/config/database";

/**
 * Same Vercel host as the Vite app: https://esm-demo.vercel.app/api/...
 * Local `npm run dev` is unchanged (Backend/src/index.ts still listens).
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
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
