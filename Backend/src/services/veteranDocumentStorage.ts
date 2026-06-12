export function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

export function veteranStorageKey(user: { id: string; phone?: string; name?: string }): string {
  if (user.phone) {
    const digits = user.phone.replace(/\D/g, "");
    if (digits) return digits;
  }
  if (user.name) return slugifySegment(user.name);
  return `user-${user.id}`;
}

/** Cloudinary folder path (under esm/ root): required_doc/{veteran}/{category}/{caseType}/{label} */
export function buildRequiredDocFolder(
  veteranKey: string,
  categoryName: string,
  caseTypeSlug: string,
  documentLabel: string
): string {
  return [
    "required_doc",
    veteranKey,
    slugifySegment(categoryName || "general"),
    slugifySegment(caseTypeSlug),
    slugifySegment(documentLabel),
  ].join("/");
}
