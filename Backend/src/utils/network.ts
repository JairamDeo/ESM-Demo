import os from "os";

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
