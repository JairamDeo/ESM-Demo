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

export function parseOriginList(value?: string): string[] {
  return [
    ...new Set(
      (value || "")
        .split(",")
        .map(stripSlash)
        .filter((o) => o && o !== "*")
    ),
  ];
}

function isLoopback(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/** Pick one QR base from a comma-separated list. Prefer current origin, then LAN. */
export function pickQrFrontendUrl(candidates: string[], preferred?: string): string {
  const list = parseOriginList(candidates.join(","));
  const preferredClean = preferred ? stripSlash(preferred) : "";

  if (preferredClean && list.includes(preferredClean) && !isLoopback(preferredClean)) {
    return preferredClean;
  }

  const lan = list.find((o) => !isLoopback(o));
  if (lan) return lan;

  if (preferredClean && list.includes(preferredClean)) return preferredClean;
  return list[0] || preferredClean || "http://localhost:5174";
}

/** FRONTEND_URL + CORS_ORIGIN — allowed veteran/admin site origins. */
export function allowedFrontendOrigins(): string[] {
  return [
    ...new Set([
      ...parseOriginList(process.env.FRONTEND_URL),
      ...parseOriginList(process.env.CORS_ORIGIN),
    ]),
  ];
}

/**
 * Base URL encoded into station QR codes.
 * FRONTEND_URL and the request frontendUrl may be comma-separated.
 */
export function resolveQrFrontendBase(req: Request, requested?: string): string {
  const allowed = allowedFrontendOrigins();
  const isAllowed = (url: string) =>
    allowed.length === 0 || allowed.includes(url);

  const requestedList = parseOriginList(requested).filter(isAllowed);
  const origin = stripSlash(req.get("origin") || "");
  const configured = parseOriginList(process.env.FRONTEND_URL);

  return pickQrFrontendUrl(
    [...requestedList, ...configured, ...allowed],
    origin && isAllowed(origin) ? origin : undefined
  );
}

export function buildGrievanceQrUrl(base: string, stationName: string, code: string): string {
  return `${stripSlash(base)}/grievance?station=${encodeURIComponent(stationName)}&code=${encodeURIComponent(code)}`;
}
