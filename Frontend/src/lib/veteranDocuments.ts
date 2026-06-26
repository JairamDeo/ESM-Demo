import api from "@/lib/api";
import { resolveUploadUrl } from "@/lib/apiBase";

export type VeteranUploadPreview = {
  url: string;
  mimeType: string;
  fileName: string;
  /** Call when closing modal if url was created from a blob */
  revoke?: () => void;
};

/** Load document for in-app preview (modal). Does not open a new tab. */
export async function loadVeteranDocumentPreview(upload: {
  fileUrl?: string;
  previewUrl?: string;
  mimeType?: string;
  originalFileName?: string;
}): Promise<VeteranUploadPreview> {
  const fileName = upload.originalFileName || "document";
  const direct = resolveUploadUrl(upload.fileUrl);
  if (direct) {
    return {
      url: direct,
      mimeType: upload.mimeType || "application/octet-stream",
      fileName,
    };
  }

  if (!upload.previewUrl) {
    throw new Error("Preview not available");
  }

  const apiPath = upload.previewUrl.replace(/^\/api/, "");
  const res = await api.get(apiPath, { responseType: "blob" });
  const mimeType =
    upload.mimeType || (res.headers["content-type"] as string) || "application/octet-stream";
  const blob = new Blob([res.data], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);

  return {
    url: objectUrl,
    mimeType,
    fileName,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

/** Open veteran upload in a new tab (Cloudinary/local URL or authenticated API preview). */
export async function openVeteranDocument(upload: {
  fileUrl?: string;
  previewUrl?: string;
  mimeType?: string;
  originalFileName?: string;
}): Promise<void> {
  const direct = resolveUploadUrl(upload.fileUrl);
  if (direct) {
    window.open(direct, "_blank", "noopener,noreferrer");
    return;
  }

  if (!upload.previewUrl) return;

  const apiPath = upload.previewUrl.replace(/^\/api/, "");
  const res = await api.get(apiPath, { responseType: "blob" });

  const blob = new Blob([res.data], {
    type: upload.mimeType || (res.headers["content-type"] as string) || "application/octet-stream",
  });
  const objectUrl = URL.createObjectURL(blob);
  const win = window.open(objectUrl, "_blank", "noopener,noreferrer");
  if (!win) {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = upload.originalFileName || "document";
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
