import api from "@/lib/api";
import { resolveUploadUrl } from "@/lib/apiBase";

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
    type: upload.mimeType || res.headers["content-type"] || "application/octet-stream",
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
