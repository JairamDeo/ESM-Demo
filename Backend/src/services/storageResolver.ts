import fs from "fs";
import path from "path";
import { Response } from "express";
import {
  deleteCloudinaryAsset,
  downloadCloudinaryAsset,
  isCloudinaryUrl,
  isRemoteStorageUrl,
} from "./cloudinaryService";

/** Legacy local path → absolute filesystem path. */
export function absoluteFromPublicPath(publicPath: string): string {
  const rel = publicPath.replace(/^\/uploads\//, "").replace(/\//g, path.sep);
  return path.join(__dirname, "../../uploads", rel);
}

/** Stream Cloudinary URL or legacy local file with correct headers (no bare redirect). */
export async function serveStoredFile(
  res: Response,
  storedPath: string,
  options: { mimeType: string; fileName: string; disposition?: "inline" | "attachment" }
): Promise<void> {
  const disposition = options.disposition || "inline";
  const safeName = options.fileName.replace(/"/g, "");

  if (isRemoteStorageUrl(storedPath)) {
    try {
      let buffer: Buffer;
      let contentType: string;

      if (isCloudinaryUrl(storedPath)) {
        const downloaded = await downloadCloudinaryAsset(storedPath);
        buffer = downloaded.buffer;
        contentType = options.mimeType || downloaded.contentType;
      } else {
        const response = await fetch(storedPath);
        if (!response.ok) {
          res.status(404).json({ success: false, message: "File not found" });
          return;
        }
        buffer = Buffer.from(await response.arrayBuffer());
        contentType =
          options.mimeType ||
          response.headers.get("content-type") ||
          "application/octet-stream";
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`);
      res.send(buffer);
    } catch {
      res.status(404).json({ success: false, message: "File not found" });
    }
    return;
  }

  const abs = absoluteFromPublicPath(storedPath);
  if (!fs.existsSync(abs)) {
    res.status(404).json({ success: false, message: "File not found" });
    return;
  }

  res.setHeader("Content-Type", options.mimeType);
  res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`);
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
