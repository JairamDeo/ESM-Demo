import { resolveUploadUrl } from "@/lib/apiBase";

export const normalizeCategoryName = (value: string) =>
  String(value || "").trim().toLowerCase().replace("idenity", "identity");

const FALLBACK_BY_NAME: Record<string, { bg: string; icon: string }> = {
  "identity & personal": { bg: "bg-[#D2E5FC]", icon: "/icons/profile-filled.svg" },
  "pension & financial": { bg: "bg-[#FDE7E7]", icon: "/icons/money-rupee.svg" },
  "family details": { bg: "bg-[#E8FDE7]", icon: "/icons/family.svg" },
  "requests & tracking": { bg: "bg-[#FFFFE4]", icon: "/icons/seal-check.svg" },
};

const DEFAULT_FALLBACK = { bg: "bg-secondary", icon: "/icons/category.svg" };

export function getCategoryFallbackMeta(categoryName: string) {
  return FALLBACK_BY_NAME[normalizeCategoryName(categoryName)] ?? DEFAULT_FALLBACK;
}

export function getCategoryDisplayIcon(iconUrl?: string | null) {
  return resolveUploadUrl(iconUrl ?? undefined);
}

export function buildCategoryIconMap(
  categories: { _id: string; name: string; iconUrl?: string | null }[]
) {
  const map = new Map<string, string | null>();
  for (const cat of categories) {
    const url = cat.iconUrl ?? null;
    map.set(cat._id, url);
    map.set(normalizeCategoryName(cat.name), url);
  }
  return map;
}

export function lookupCategoryIcon(
  map: Map<string, string | null>,
  categoryName: string,
  categoryId?: string
) {
  if (categoryId && map.has(categoryId)) return map.get(categoryId) ?? null;
  return map.get(normalizeCategoryName(categoryName)) ?? null;
}
