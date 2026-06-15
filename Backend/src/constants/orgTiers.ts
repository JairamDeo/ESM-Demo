import { OfficerLevel } from "./officerLevels";

export type OrgTier = "station" | "hq" | "area";

export const ORG_TIER_LABELS: Record<OrgTier, string> = {
  station: "Station HQ",
  hq: "Headquarter",
  area: "Area",
};

export function nextOrgTier(tier: OrgTier): OrgTier | null {
  if (tier === "station") return "hq";
  if (tier === "hq") return "area";
  return null;
}

/** Map org tier to SLA config tier (L1=station phase, L2=HQ phase, L3=area phase). */
export function slaLevelForOrgTier(tier: OrgTier): OfficerLevel {
  if (tier === "station") return "L1";
  if (tier === "hq") return "L2";
  return "L3";
}
