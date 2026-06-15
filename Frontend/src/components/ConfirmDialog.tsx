import { memo } from "react";
import { X } from "lucide-react";

export type ConfirmDialogVariant = "default" | "danger" | "warning";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  showCancel?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const confirmButtonClass: Record<ConfirmDialogVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  warning: "bg-warning text-warning-foreground hover:bg-warning/90",
};

export default memo(function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  showCancel = true,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div
        className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-fade-in shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="flex justify-between items-start gap-3 mb-2">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground whitespace-pre-line">{message}</p>

        <div className={`flex gap-2 pt-5 ${showCancel ? "" : "justify-end"}`}>
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`${showCancel ? "flex-1" : "min-w-[120px]"} py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 ${confirmButtonClass[variant]}`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
