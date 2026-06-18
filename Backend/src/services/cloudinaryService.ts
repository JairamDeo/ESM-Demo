import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";

export interface CloudinaryCredentials {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

/** Parse CLOUDINARY_URL or fall back to separate env vars. */
export function getCloudinaryCredentials(): CloudinaryCredentials {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "cloudinary:") {
        const apiKey = decodeURIComponent(parsed.username || "");
        const apiSecret = decodeURIComponent(parsed.password || "");
        const cloudName = parsed.hostname || "";
        if (apiKey && apiSecret && cloudName) {
          return { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret };
        }
      }
    } catch {
      /* fall through */
    }
  }

  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim() || "",
    api_key: process.env.CLOUDINARY_API_KEY?.trim() || "",
    api_secret: process.env.CLOUDINARY_API_SECRET?.trim() || "",
  };
}

function applyCloudinaryConfig(): void {
  const { cloud_name, api_key, api_secret } = getCloudinaryCredentials();
  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });
}

export function getCloudinaryRoot(): string {
  return (process.env.CLOUDINARY_FOLDER || "esm").replace(/^\/+|\/+$/g, "");
}

export function isRemoteStorageUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function assertCloudinaryConfigured(): void {
  applyCloudinaryConfig();
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env"
    );
  }
}

export interface PreparedUpload {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  resourceType: "image" | "raw";
}

/** Category icons → lossless WebP (no compression). */
export async function prepareCategoryIconForUpload(buffer: Buffer, mimetype: string): Promise<PreparedUpload> {
  if (mimetype === "image/webp") {
    return {
      buffer,
      mimeType: "image/webp",
      extension: "webp",
      resourceType: "image",
    };
  }

  const webpBuffer = await sharp(buffer).webp({ lossless: true }).toBuffer();
  return {
    buffer: webpBuffer,
    mimeType: "image/webp",
    extension: "webp",
    resourceType: "image",
  };
}

/** Images → WebP; PDFs unchanged. */
export async function prepareFileForUpload(buffer: Buffer, mimetype: string): Promise<PreparedUpload> {
  if (mimetype === "application/pdf") {
    return {
      buffer,
      mimeType: "application/pdf",
      extension: "pdf",
      resourceType: "raw",
    };
  }

  const webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();
  return {
    buffer: webpBuffer,
    mimeType: "image/webp",
    extension: "webp",
    resourceType: "image",
  };
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  resourceType: string;
  bytes: number;
}

/**
 * Upload buffer to Cloudinary under esm/{folder}/{fileName}.
 * Folder structure mirrors the local uploads/ layout.
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  options: {
    folder: string;
    fileName: string;
    resourceType: "image" | "raw";
  }
): Promise<CloudinaryUploadResult> {
  assertCloudinaryConfigured();

  const relativeFolder = options.folder.replace(/^\/+|\/+$/g, "");
  const root = getCloudinaryRoot();
  const cloudFolder = relativeFolder ? `${root}/${relativeFolder}` : root;
  const safeName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Raw files (PDF) must keep their extension in public_id for Cloudinary.
  const publicId =
    options.resourceType === "raw"
      ? `${cloudFolder}/${safeName}`
      : `${cloudFolder}/${safeName.replace(/\.[^.]+$/, "")}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: options.resourceType,
        public_id: publicId,
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          const message =
            (error as any)?.message ||
            (error as any)?.error?.message ||
            "Cloudinary upload failed";
          reject(new Error(message));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          bytes: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
}

function publicIdFromCloudinaryUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const uploadIdx = segments.indexOf("upload");
    if (uploadIdx === -1) return null;
    let rest = segments.slice(uploadIdx + 1);
    if (rest[0]?.startsWith("v") && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
    return rest.join("/") || null;
  } catch {
    return null;
  }
}

/** Delete asset by Cloudinary URL or public_id. No-op for legacy local paths. */
export async function deleteCloudinaryAsset(
  urlOrPublicId: string,
  resourceType?: "image" | "raw"
): Promise<void> {
  if (!urlOrPublicId || urlOrPublicId.startsWith("/uploads/")) return;

  assertCloudinaryConfigured();

  let publicId = urlOrPublicId;
  if (isRemoteStorageUrl(urlOrPublicId)) {
    const extracted = publicIdFromCloudinaryUrl(urlOrPublicId);
    if (!extracted) return;
    publicId = extracted;
  }

  const type =
    resourceType ||
    (publicId.toLowerCase().includes(".pdf") || urlOrPublicId.toLowerCase().includes("/raw/")
      ? "raw"
      : "image");

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: type, invalidate: true });
  } catch {
    /* ignore missing assets */
  }
}
