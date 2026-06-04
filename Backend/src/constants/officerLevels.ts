export const OFFICER_LEVELS = ["L1", "L2", "L3"] as const;
export type OfficerLevel = (typeof OFFICER_LEVELS)[number];
