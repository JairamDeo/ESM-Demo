import fs from "fs";
import path from "path";
import { Response } from "express";
import { deleteCloudinaryAsset, isRemoteStorageUrl } from "./cloudinaryService";

/** Legacy local path → absolute filesystem path. */
export function absoluteFromPublicPath(publicPath: string): string {
  const rel = publicPath.replace(/^\/uploads\//, "").replace(/\//g, path.sep);
  return path.join(__dirname, "../../uploads", rel);
}

/** Redirect to Cloudinary URL or stream a legacy local file. */
export function serveStoredFile(
  res: Response,
  storedPath: string,
  options: { mimeType: string; fileName: string; disposition?: "inline" | "attachment" }
): void {
  if (isRemoteStorageUrl(storedPath)) {
    res.redirect(storedPath);
    return;
  }

  const abs = absoluteFromPublicPath(storedPath);
  if (!fs.existsSync(abs)) {
    res.status(404).json({ success: false, message: "File not found" });
    return;
  }

  res.setHeader("Content-Type", options.mimeType);
  res.setHeader(
    "Content-Disposition",
    `${options.disposition || "inline"}; filename="${options.fileName.replace(/"/g, "")}"`
  );
  fs.createReadStream(abs).pipe(res);
}

/** Remove Cloudinary asset or legacy local file under /uploads/. */
export async function deleteStoredAsset(storedPath: string): Promise<void> {
  if (!storedPath) return;
  if (isRemoteStorageUrl(storedPath)) {
    await deleteCloudinaryAsset(storedPath);
    return;
  }
  if (!storedPath.startsWith("/uploads/")) return;
  const abs = absoluteFromPublicPath(storedPath);
  if (!fs.existsSync(abs)) return;
  try {
    await fs.promises.unlink(abs);
  } catch {
    /* ignore */
  }
}
