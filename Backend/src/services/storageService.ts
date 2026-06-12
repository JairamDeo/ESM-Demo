import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import {
  prepareFileForUpload,
  uploadBufferToCloudinary,
} from "./cloudinaryService";

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
    console.warn("⚠️ Cloudinary env vars missing — uploads will use local fallback if enabled.");
    return;
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

  try {
    const ping = await cloudinary.api.ping();
    if (ping?.status === "ok") {
      console.log("☁️  Cloudinary connected");
    }
  } catch (err: any) {
    console.warn(`⚠️ Cloudinary ping failed: ${err?.message || err}`);
    console.warn("   Uploads will fall back to local /uploads until credentials are fixed.");
  }
}
