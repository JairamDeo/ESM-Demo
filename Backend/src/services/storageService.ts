import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import {
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
  storage: "cloudinary" | "local";
}

function saveLocalFile(
  buffer: Buffer,
  folder: string,
  fileName: string,
  mimeType: string
): StoredFileResult {
  const relDir = folder.replace(/^\/+|\/+$/g, "");
  const absDir = path.join(__dirname, "../../uploads", relDir);
  fs.mkdirSync(absDir, { recursive: true });
  const absFile = path.join(absDir, fileName);
  fs.writeFileSync(absFile, buffer);
  return {
    url: `/uploads/${relDir}/${fileName}`,
    mimeType,
    bytes: buffer.length,
    storage: "local",
  };
}

function isCloudinaryAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid signature") ||
    lower.includes("invalid api key") ||
    lower.includes("cloudinary is not configured")
  );
}

/** Upload category icon to Cloudinary at esm/category-master (lossless WebP). */
export async function storeCategoryIcon(
  buffer: Buffer,
  fileName: string,
  mimetype: string
): Promise<StoredFileResult> {
  const prepared = await prepareCategoryIconForUpload(buffer, mimetype);
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const finalFileName = `${baseName}.${prepared.extension}`;

  if (process.env.USE_CLOUDINARY === "false") {
    throw new Error(
      "Category icons must use Cloudinary. Set USE_CLOUDINARY=true and CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in Backend/.env"
    );
  }

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
    const message = err?.message || "Cloudinary upload failed";
    if (isCloudinaryAuthError(message)) {
      throw new Error(
        "Cloudinary credentials are invalid. Copy CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET from your Cloudinary dashboard."
      );
    }
    throw new Error(`Category icon Cloudinary upload failed: ${message}`);
  }
}

export async function removeCategoryIcon(iconUrl?: string | null): Promise<void> {
  await deleteStoredAsset(iconUrl || "");
}

/** Officer concern attachments → Cloudinary esm/grievances/concern-attachments/{grievanceId} (WebP for images). */
export async function storeConcernAttachment(
  buffer: Buffer,
  grievanceId: string,
  fileName: string,
  mimetype: string
): Promise<StoredFileResult> {
  const folder = `grievances/concern-attachments/${grievanceId.replace(/[^a-zA-Z0-9/_-]/g, "_")}`;
  return storeUploadedBuffer(buffer, { folder, fileName, mimetype });
}

/** Read a legacy /uploads/... category icon from disk (for migration). */
export function readLocalCategoryIconBuffer(iconUrl: string): Buffer | null {
  if (!iconUrl.startsWith("/uploads/")) return null;
  const rel = iconUrl.replace(/^\/uploads\//, "").replace(/\//g, path.sep);
  const abs = path.join(__dirname, "../../uploads", rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs);
}

/** Upload to Cloudinary; optional local fallback when credentials fail. */
export async function storeUploadedBuffer(
  buffer: Buffer,
  options: {
    folder: string;
    fileName: string;
    mimetype: string;
  }
): Promise<StoredFileResult> {
  const prepared = await prepareFileForUpload(buffer, options.mimetype);
  const ext = prepared.extension;
  const baseName = options.fileName.replace(/\.[^.]+$/, "");
  const finalFileName = `${baseName}.${ext}`;

  const cloudinaryEnabled = process.env.USE_CLOUDINARY !== "false";
  const allowLocalFallback = process.env.CLOUDINARY_FALLBACK_LOCAL !== "false";

  if (!cloudinaryEnabled) {
    return saveLocalFile(prepared.buffer, options.folder, finalFileName, prepared.mimeType);
  }

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
    const message = err?.message || "Cloudinary upload failed";

    if (isCloudinaryAuthError(message)) {
      console.error(
        "❌ Cloudinary authentication failed. Verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Backend/.env (Cloudinary Dashboard → Settings → API Keys)."
      );
    }

    if (allowLocalFallback) {
      console.warn(`⚠️ Cloudinary upload failed — saving locally: ${message}`);
      return saveLocalFile(prepared.buffer, options.folder, finalFileName, prepared.mimeType);
    }

    throw new Error(
      isCloudinaryAuthError(message)
        ? "Cloudinary credentials are invalid. Copy the API Secret again from your Cloudinary dashboard."
        : message
    );
  }
}

/** Ping Cloudinary on startup; logs a warning when credentials are wrong. */
export async function verifyCloudinaryConnection(): Promise<void> {
  if (process.env.USE_CLOUDINARY === "false") return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("⚠️ Cloudinary env vars missing — category icon uploads will fail until configured.");
    return;
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

  try {
    const ping = await cloudinary.api.ping();
    if (ping?.status === "ok") {
      console.log("☁️  Cloudinary connected");
    }
  } catch (err: any) {
    const msg = err?.message || err?.error?.message || JSON.stringify(err);
    console.warn(`⚠️ Cloudinary ping failed: ${msg}`);
    console.warn("   Category icons require Cloudinary. Other uploads may use local /uploads if CLOUDINARY_FALLBACK_LOCAL=true.");
  }
}
