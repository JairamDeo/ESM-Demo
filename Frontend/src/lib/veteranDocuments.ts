import api from "@/lib/api";
import { resolveUploadUrl } from "@/lib/apiBase";

export type VeteranUploadPreview = {
  url: string;
  mimeType: string;
  fileName: string;
  /** Call when closing modal if url was created from a blob */
  revoke?: () => void;
};

function isPdfMime(mimeType?: string, fileName?: string): boolean {
  if (mimeType === "application/pdf") return true;
  return Boolean(fileName?.toLowerCase().endsWith(".pdf"));
}

function veteranUploadPreviewPath(uploadId: string): string {
  return `/veteran/required-documents/uploads/${uploadId}/preview`;
}

async function fetchBlobPreview(
  apiPath: string,
  mimeType: string,
  fileName: string
): Promise<VeteranUploadPreview> {
  const path = apiPath.replace(/^\/api/, "");
  const res = await api.get(path, { responseType: "blob" });
  const resolvedMime =
    mimeType || (res.headers["content-type"] as string) || "application/octet-stream";
  const blob = new Blob([res.data], { type: resolvedMime });
  const objectUrl = URL.createObjectURL(blob);

  return {
    url: objectUrl,
    mimeType: resolvedMime,
    fileName,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

async function fetchRemoteBlobPreview(
  url: string,
  mimeType: string,
  fileName: string
): Promise<VeteranUploadPreview> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load document");
  const resolvedMime = mimeType || res.headers.get("content-type") || "application/octet-stream";
  const blob = new Blob([await res.arrayBuffer()], { type: resolvedMime });
  const objectUrl = URL.createObjectURL(blob);

  return {
    url: objectUrl,
    mimeType: resolvedMime,
    fileName,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

/** Load document for in-app preview (modal). Does not open a new tab. */
export async function loadVeteranDocumentPreview(upload: {
  uploadId?: string;
  fileUrl?: string;
  previewUrl?: string;
  mimeType?: string;
  originalFileName?: string;
}): Promise<VeteranUploadPreview> {
  const fileName = upload.originalFileName || "document";
  const mimeType = upload.mimeType || "application/octet-stream";
  const previewUrl =
    upload.previewUrl ||
    (upload.uploadId ? veteranUploadPreviewPath(upload.uploadId) : undefined);

  if (previewUrl) {
    return fetchBlobPreview(previewUrl, mimeType, fileName);
  }

  const direct = resolveUploadUrl(upload.fileUrl);
  if (!direct) throw new Error("Preview not available");

  if (isPdfMime(mimeType, fileName)) {
    return fetchRemoteBlobPreview(direct, "application/pdf", fileName);
  }

  return { url: direct, mimeType, fileName };
}

/** Preview a grievance submitted document (admin / officer). */
export async function loadGrievanceDocumentPreview(
  grievanceId: string,
  doc: {
    uploadId?: string;
    fileUrl?: string;
    mimeType?: string;
    originalFileName?: string;
  }
): Promise<VeteranUploadPreview> {
  const fileName = doc.originalFileName || "document";
  const mimeType = doc.mimeType || "application/octet-stream";

  if (doc.uploadId && grievanceId) {
    return fetchBlobPreview(
      `/grievances/${grievanceId}/documents/${doc.uploadId}/preview`,
      mimeType,
      fileName
    );
  }

  const direct = resolveUploadUrl(doc.fileUrl);
  if (!direct) throw new Error("Preview not available");

  if (isPdfMime(mimeType, fileName)) {
    return fetchRemoteBlobPreview(direct, "application/pdf", fileName);
  }

  return { url: direct, mimeType, fileName };
}

function guessMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
}

/** Preview attachment by stored path / URL (timeline, legacy attachments). */
export async function loadAttachmentPreview(
  fileUrl: string,
  options?: { mimeType?: string; fileName?: string }
): Promise<VeteranUploadPreview> {
  const fileName = options?.fileName || fileUrl.split("/").pop() || "document";
  const mimeType = options?.mimeType || guessMimeType(fileName);
  const direct = resolveUploadUrl(fileUrl) || fileUrl;

  if (direct.includes("cloudinary.com")) {
    const proxyUrl = `/api/grievances/proxy-attachment?url=${encodeURIComponent(direct)}&fileName=${encodeURIComponent(fileName)}&mimeType=${encodeURIComponent(mimeType)}`;
    return fetchBlobPreview(proxyUrl, mimeType, fileName);
  }

  if (isPdfMime(mimeType, fileName)) {
    return fetchRemoteBlobPreview(direct, "application/pdf", fileName);
  }

  return { url: direct, mimeType, fileName };
}

/** Download a grievance submitted document (admin / officer). */
export async function downloadGrievanceDocument(
  grievanceId: string,
  doc: {
    uploadId?: string;
    fileUrl?: string;
    mimeType?: string;
    originalFileName?: string;
  }
): Promise<void> {
  const preview = await loadGrievanceDocumentPreview(grievanceId, doc);
  const anchor = document.createElement("a");
  anchor.href = preview.url;
  anchor.download = doc.originalFileName || "document";
  anchor.click();
  setTimeout(() => preview.revoke?.(), 1000);
}

/** Force-download admin annexure template (never opens in browser tab). */
export async function downloadChecklistTemplate(params: {
  caseTypeId: string;
  documentLabel: string;
  itemIndex: number;
  fileName?: string;
}): Promise<void> {
  const res = await api.get("/veteran/required-documents/templates/download", {
    params: {
      caseTypeId: params.caseTypeId,
      documentLabel: params.documentLabel,
      itemIndex: params.itemIndex,
    },
    responseType: "blob",
  });

  const blob = new Blob([res.data], {
    type: (res.headers["content-type"] as string) || "application/pdf",
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = params.fileName || "template.pdf";
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

/** Open veteran upload in a new tab (Cloudinary/local URL or authenticated API preview). */
export async function openVeteranDocument(upload: {
  uploadId?: string;
  fileUrl?: string;
  previewUrl?: string;
  mimeType?: string;
  originalFileName?: string;
}): Promise<void> {
  const preview = await loadVeteranDocumentPreview(upload);
  const win = window.open(preview.url, "_blank", "noopener,noreferrer");
  if (!win) {
    const anchor = document.createElement("a");
    anchor.href = preview.url;
    anchor.download = upload.originalFileName || "document";
    anchor.click();
  }
  setTimeout(() => preview.revoke?.(), 60_000);
}
