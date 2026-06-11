import fs from "fs";
import path from "path";

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

export function buildRequiredDocDir(
  veteranKey: string,
  categoryName: string,
  caseTypeSlug: string,
  documentLabel: string
): string {
  const rel = path.join(
    "required_doc",
    veteranKey,
    slugifySegment(categoryName || "general"),
    slugifySegment(caseTypeSlug),
    slugifySegment(documentLabel)
  );
  const abs = path.join(__dirname, "../../uploads", rel);
  if (!fs.existsSync(abs)) fs.mkdirSync(abs, { recursive: true });
  return rel;
}

export function toPublicUploadPath(relativeDir: string, filename: string): string {
  return `/uploads/${relativeDir.replace(/\\/g, "/")}/${filename}`;
}

export function absoluteFromPublicPath(publicPath: string): string {
  const rel = publicPath.replace(/^\/uploads\//, "").replace(/\//g, path.sep);
  return path.join(__dirname, "../../uploads", rel);
}
