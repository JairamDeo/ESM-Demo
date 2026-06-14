import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileText } from "lucide-react";
import type { VeteranUploadPreview } from "@/lib/veteranDocuments";

const SHELL_ID = "user-app-shell";

function getPortalTarget() {
  if (typeof document === "undefined") return null;
  return document.getElementById(SHELL_ID);
}

export function DocumentPreviewModal({
  preview,
  onClose,
}: {
  preview: VeteranUploadPreview | null;
  onClose: () => void;
}) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(getPortalTarget());
  }, []);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, onClose]);

  if (!preview) return null;

  const isImage = preview.mimeType.startsWith("image/");
  const isPdf = preview.mimeType === "application/pdf";

  const overlayClass = portalTarget
    ? "absolute inset-0 z-[100]"
    : "fixed inset-0 z-[100]";

  const modal = (
    <div
      className={`${overlayClass} flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in overflow-hidden`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-full max-h-[calc(100%-0.75rem)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0 gap-2">
          <p className="text-sm font-semibold text-foreground truncate min-w-0">{preview.fileName}</p>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 min-w-0 overflow-auto bg-secondary/30 flex items-center justify-center p-2 sm:p-3">
          {isImage ? (
            <img
              src={preview.url}
              alt={preview.fileName}
              className="block max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
            />
          ) : isPdf ? (
            <iframe
              src={preview.url}
              title={preview.fileName}
              className="w-full max-w-full h-[min(360px,100%)] min-h-[200px] rounded-lg border border-border bg-white"
            />
          ) : (
            <div className="text-center py-6 px-3">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (portalTarget) {
    return createPortal(modal, portalTarget);
  }

  return modal;
}
