import os from "os";
import { Request } from "express";

/** Non-loopback IPv4 addresses (Wi‑Fi / Ethernet) for LAN sharing. */
export function getLanIPv4Addresses(): string[] {
  const addresses: string[] = [];
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const net of iface) {
      // Node types vary: family can be "IPv4"/"IPv6" (string) or 4/6 (number).
      const isIPv4 = net.family === "IPv4" || (net.family as any) === 4;
      if (isIPv4 && !net.internal) addresses.push(net.address);
    }
  }
  return [...new Set(addresses)];
}

function stripSlash(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/** FRONTEND_URL + CORS_ORIGIN — allowed veteran/admin site origins. */
export function allowedFrontendOrigins(): string[] {
  const listed = [
    ...(process.env.FRONTEND_URL || "").split(","),
    ...(process.env.CORS_ORIGIN || "").split(","),
  ];
  return [...new Set(listed.map(stripSlash).filter(Boolean))];
}

/**
 * Base URL encoded into station QR codes.
 * Prefers the URL sent from the admin UI (VITE_FRONTEND_URL / current tab),
 * then FRONTEND_URL, then a LAN CORS origin (phones cannot use localhost).
 */
export function resolveQrFrontendBase(req: Request, requested?: string): string {
  const allowed = allowedFrontendOrigins();
  const isAllowed = (url: string) =>
    allowed.length === 0 || allowed.includes("*") || allowed.includes(url);

  const requestedClean = requested ? stripSlash(requested) : "";
  if (requestedClean && isAllowed(requestedClean)) return requestedClean;

  const origin = stripSlash(req.get("origin") || "");
  if (origin && isAllowed(origin)) return origin;

  const configured = stripSlash((process.env.FRONTEND_URL || "").split(",")[0] || "");
  if (configured) return configured;

  const lan = allowed.find((o) => !/localhost|127\.0\.0\.1/i.test(o));
  return lan || allowed[0] || "http://localhost:5174";
}

export function buildGrievanceQrUrl(base: string, stationName: string, code: string): string {
  return `${stripSlash(base)}/grievance?station=${encodeURIComponent(stationName)}&code=${encodeURIComponent(code)}`;
}
