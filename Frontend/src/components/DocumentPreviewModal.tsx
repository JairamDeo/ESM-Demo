import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileText, Download } from "lucide-react";
import type { VeteranUploadPreview } from "@/lib/veteranDocuments";

const USER_SHELL_ID = "user-app-shell";

function getPortalTarget(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(USER_SHELL_ID) || document.body;
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

  if (!preview || !portalTarget) return null;

  const isImage = preview.mimeType.startsWith("image/");
  const isPdf = preview.mimeType === "application/pdf";
  const inUserShell = portalTarget.id === USER_SHELL_ID;

  const overlayClass = inUserShell
    ? "absolute inset-0 z-[100]"
    : "fixed inset-0 z-[200]";

  const handleDownload = () => {
    const anchor = document.createElement("a");
    anchor.href = preview.url;
    anchor.download = preview.fileName;
    anchor.click();
  };

  const modal = (
    <div
      className={`${overlayClass} flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in`}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[min(85vh,640px)] min-h-[280px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 gap-2">
          <p className="text-sm font-semibold text-foreground truncate min-w-0">{preview.fileName}</p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-[220px] overflow-auto bg-secondary/30 flex items-center justify-center p-4">
          {isImage ? (
            <img
              src={preview.url}
              alt={preview.fileName}
              className="block max-w-full max-h-[min(60vh,480px)] w-auto h-auto object-contain rounded-lg"
            />
          ) : isPdf ? (
            <iframe
              src={preview.url}
              title={preview.fileName}
              className="w-full h-[min(60vh,480px)] min-h-[240px] rounded-lg border border-border bg-white"
            />
          ) : (
            <div className="text-center py-8 px-4">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Preview not available for this file type.</p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" /> Download file
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalTarget);
}
