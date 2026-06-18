import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import {
  getCloudinaryCredentials,
  prepareCategoryIconForUpload,
  prepareFileForUpload,
  uploadBufferToCloudinary,
} from "./cloudinaryService";
import { deleteStoredAsset } from "./storageResolver";

const CATEGORY_ICON_FOLDER = "category-master";

export interface StoredFileResult {
  url: string;
  mimeType: string;
  bytes: number;
  storage: "cloudinary";
}

function assertCloudinaryRequired(): void {
  if (process.env.USE_CLOUDINARY === "false") {
    throw new Error(
      "Local uploads are disabled. Set USE_CLOUDINARY=true and configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
    );
  }
}

function isCloudinaryAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid signature") ||
    lower.includes("invalid api key") ||
    lower.includes("cloudinary is not configured")
  );
}

function cloudinaryErrorMessage(message: string, context: string): string {
  if (message.includes("403") || message.toLowerCase().includes("forbidden")) {
    return `${context}: Cloudinary upload forbidden (403). Your API key needs Upload permission — Cloudinary Console → Settings → API Keys → Assign roles (e.g. Master Admin).`;
  }
  if (isCloudinaryAuthError(message)) {
    return "Cloudinary credentials are invalid. Copy CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET from your Cloudinary dashboard.";
  }
  return `${context}: ${message}`;
}

/** Upload category icon to Cloudinary at esm/category-master (lossless WebP). */
export async function storeCategoryIcon(
  buffer: Buffer,
  fileName: string,
  mimetype: string
): Promise<StoredFileResult> {
  assertCloudinaryRequired();

  const prepared = await prepareCategoryIconForUpload(buffer, mimetype);
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const finalFileName = `${baseName}.${prepared.extension}`;

  try {
    const uploaded = await uploadBufferToCloudinary(prepared.buffer, {
      folder: CATEGORY_ICON_FOLDER,
      fileName: finalFileName,
      resourceType: prepared.resourceType,
    });
    return {
      url: uploaded.url,
      mimeType: prepared.mimeType,
      bytes: uploaded.bytes,
      storage: "cloudinary",
    };
  } catch (err: any) {
    throw new Error(cloudinaryErrorMessage(err?.message || "Cloudinary upload failed", "Category icon upload failed"));
  }
}

export async function removeCategoryIcon(iconUrl?: string | null): Promise<void> {
  await deleteStoredAsset(iconUrl || "");
}

/** Officer concern attachments → Cloudinary esm/grievances/concern-attachments/{grievanceId}. */
export async function storeConcernAttachment(
  buffer: Buffer,
  grievanceId: string,
  fileName: string,
  mimetype: string
): Promise<StoredFileResult> {
  const folder = `grievances/concern-attachments/${grievanceId.replace(/[^a-zA-Z0-9/_-]/g, "_")}`;
  return storeUploadedBuffer(buffer, { folder, fileName, mimetype });
}

/** Read a legacy /uploads/... file from disk (migration only). */
export function readLocalUploadBuffer(publicPath: string): Buffer | null {
  if (!publicPath.startsWith("/uploads/")) return null;
  const rel = publicPath.replace(/^\/uploads\//, "").replace(/\//g, path.sep);
  const abs = path.join(__dirname, "../../uploads", rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs);
}

/** @deprecated Use readLocalUploadBuffer */
export const readLocalCategoryIconBuffer = readLocalUploadBuffer;

/** Upload to Cloudinary only — no local /uploads fallback. */
export async function storeUploadedBuffer(
  buffer: Buffer,
  options: {
    folder: string;
    fileName: string;
    mimetype: string;
  }
): Promise<StoredFileResult> {
  assertCloudinaryRequired();

  const prepared = await prepareFileForUpload(buffer, options.mimetype);
  const baseName = options.fileName.replace(/\.[^.]+$/, "");
  const finalFileName = `${baseName}.${prepared.extension}`;

  try {
    const uploaded = await uploadBufferToCloudinary(prepared.buffer, {
      folder: options.folder,
      fileName: finalFileName,
      resourceType: prepared.resourceType,
    });
    return {
      url: uploaded.url,
      mimeType: prepared.mimeType,
      bytes: uploaded.bytes,
      storage: "cloudinary",
    };
  } catch (err: any) {
    throw new Error(cloudinaryErrorMessage(err?.message || "Cloudinary upload failed", "Upload failed"));
  }
}

/** Ping Cloudinary on startup. */
export async function verifyCloudinaryConnection(): Promise<void> {
  if (process.env.USE_CLOUDINARY === "false") {
    console.warn("⚠️ USE_CLOUDINARY=false — all file uploads are disabled.");
    return;
  }

  const { cloud_name, api_key, api_secret } = getCloudinaryCredentials();
  if (!cloud_name || !api_key || !api_secret) {
    console.warn("⚠️ Cloudinary env vars missing — uploads will fail until configured.");
    return;
  }

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });

  try {
    const ping = await cloudinary.api.ping();
    if (ping?.status === "ok") {
      console.log("☁️  Cloudinary connected (all uploads use Cloudinary only)");
    }
  } catch (err: any) {
    const msg = err?.message || err?.error?.message || JSON.stringify(err);
    console.warn(`⚠️ Cloudinary ping failed: ${msg}`);
  }
}
