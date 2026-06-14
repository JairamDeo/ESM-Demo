import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, FileText, UploadCloud, AlertTriangle } from "lucide-react";
import { useAddComment } from "@/hooks/useApi";
import { toast } from "sonner";

export default function ConcernReviewSubmit() {
  const location = useLocation();
  const navigate = useNavigate();
  const addComment = useAddComment();

  const {
    concernMode = false,
    generalMode = false,
    generalFullFlow = false,
    documentOnlyFlow = false,
    generalConcernMode = false,
    grievanceId,
    documentLabel,
    documentText,
    concernMessage,
    complaint,
    replacementFile,
    form = {},
    flaggedDocumentLabels = [],
    reuploadedDocumentLabels = [],
  } = location.state || {};

  const [responseNote, setResponseNote] = useState("");
  const [generalFile, setGeneralFile] = useState<File | null>(null);

  const isLegacySingleDoc = concernMode && !!documentLabel && !documentOnlyFlow;
  const isDocumentOnly = documentOnlyFlow;
  const isGeneralFull = generalFullFlow || (generalConcernMode && generalMode);
  const isGeneralSimple = generalMode && !isGeneralFull && !isDocumentOnly;
  const flaggedLabels: string[] = flaggedDocumentLabels.length > 0
    ? flaggedDocumentLabels
    : documentLabel
      ? [documentLabel]
      : [];
  const targetId = grievanceId || complaint?._id || complaint?.id;

  const goBack = () => {
    if (isLegacySingleDoc || isDocumentOnly || isGeneralFull) {
      navigate("/user/document-checklist", { state: location.state, replace: true });
      return;
    }
    navigate("/user/track-case", { state: { complaint }, replace: true });
  };

  const handleSubmit = async () => {
    if (!targetId) {
      toast.error("Grievance not found.");
      return;
    }

    if (isLegacySingleDoc && !replacementFile) {
      toast.error("Please upload the corrected document first.");
      navigate("/user/document-checklist", { state: location.state });
      return;
    }

    if (isGeneralSimple && !responseNote.trim() && !generalFile) {
      toast.error("Please add a response or attachment.");
      return;
    }

    const formData = new FormData();
    formData.append("id", targetId);
    formData.append(
      "message",
      responseNote.trim() ||
        (isLegacySingleDoc
          ? `Re-uploaded ${documentLabel}`
          : isDocumentOnly
            ? flaggedLabels.length > 1
              ? `Re-uploaded ${flaggedLabels.length} documents`
              : `Re-uploaded ${flaggedLabels[0] || "document"}`
            : isGeneralFull
              ? "Corrected details submitted"
              : "Veteran response submitted")
    );

    if (isLegacySingleDoc && replacementFile) {
      formData.append("documentFile", replacementFile);
    } else if (generalFile) {
      formData.append("attachments", generalFile);
    }

    if (isGeneralFull) {
      if (form.description) formData.append("description", form.description);
      if (form.armyNumber) formData.append("veteranArmyNo", form.armyNumber);
      if (form.rank) formData.append("veteranRank", form.rank);
      if (form.stationHQ) formData.append("stationName", form.stationHQ);
    }

    try {
      await addComment.mutateAsync(formData);
      toast.success(
        isDocumentOnly || isLegacySingleDoc
          ? "Corrected document(s) submitted"
          : "Corrected details submitted"
      );
      navigate("/user/track-case", {
        state: { complaint: { ...complaint, _id: targetId, id: targetId } },
        replace: true,
      });
    } catch {
      /* hook toast */
    }
  };

  if (!targetId || (!isLegacySingleDoc && !isDocumentOnly && !generalMode && !isGeneralFull)) {
    return (
      <div className="px-3 py-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Invalid concern session.</p>
        <button
          onClick={() => navigate("/user/complaints")}
          className="text-sm text-primary font-medium"
        >
          Back to complaints
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-1.5 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Review & Submit</h1>
        </div>
        <span className="text-xs font-semibold text-[#1754CF] dark:text-[#F0C902]">
          {isLegacySingleDoc || isDocumentOnly ? "Step 2 / 2" : isGeneralFull ? "Step 3 / 3" : "Step 1 / 1"}
        </span>
      </div>

      <div className="bg-destructive/10 border border-destructive/25 rounded-xl p-3.5 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-destructive">Officer concern</p>
          <p className="text-xs text-foreground/90 mt-1 whitespace-pre-wrap">{concernMessage}</p>
        </div>
      </div>

      {isLegacySingleDoc && (
        <>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Document to correct</h2>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-primary">{documentLabel}</p>
              {documentText && (
                <p className="text-xs text-muted-foreground">{documentText}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Your corrected upload</h2>
            <div className="bg-card border border-border rounded-xl p-4">
              {replacementFile ? (
                <div className="flex items-center gap-3">
                  <img src="/icons/pdf2.svg" className="w-8 h-8" alt="" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{replacementFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(replacementFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No file selected — go back to upload.</p>
              )}
            </div>
          </div>
        </>
      )}
      {isDocumentOnly && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            {flaggedLabels.length > 1 ? "Documents corrected" : "Document corrected"}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            {(reuploadedDocumentLabels.length > 0 ? reuploadedDocumentLabels : flaggedLabels).map((label: string) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <img src="/icons/check.svg" className="w-4 h-4" alt="" />
                <span className="font-medium text-primary">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isGeneralFull && flaggedLabels.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Documents updated</h2>
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            {(reuploadedDocumentLabels.length > 0 ? reuploadedDocumentLabels : flaggedLabels).map((label: string) => (
              <p key={label} className="text-xs font-medium text-primary">{label}</p>
            ))}
          </div>
        </div>
      )}

      {isGeneralFull && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Corrected details</h2>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Service</p>
                <p className="font-medium">{form.caseType || complaint?.type || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Station HQ</p>
                <p className="font-medium">{form.stationHQ || complaint?.stationName || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Rank</p>
                <p className="font-medium">{form.rank || complaint?.veteranRank || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Army No.</p>
                <p className="font-medium">{form.armyNumber || complaint?.veteranArmyNo || "—"}</p>
              </div>
            </div>
            {form.description && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Description</p>
                <p className="text-xs mt-0.5 whitespace-pre-wrap">{form.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isGeneralSimple && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Grievance</h2>
          <div className="bg-card border border-border rounded-xl p-4 text-sm">
            <p className="font-medium">{complaint?.type || form.caseType}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {complaint?.grievanceId || complaint?.id}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">
          Your note {isGeneralSimple && <span className="text-destructive">*</span>}
        </label>
        <textarea
          value={responseNote}
          onChange={(e) => setResponseNote(e.target.value)}
          rows={3}
          placeholder={
            isLegacySingleDoc
              ? "Optional note about the corrected document..."
              : isGeneralFull || isDocumentOnly
                ? "Optional note for the officer..."
                : "Enter your response to the officer..."
          }
          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none"
        />
      </div>

      {(isGeneralSimple || isGeneralFull || isDocumentOnly) && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Attachment (optional)</label>
          <label className="flex items-center justify-center gap-4 w-full border-2 border-dashed border-[#2952A3] rounded-xl px-4 py-3 cursor-pointer hover:bg-primary/5">
            <UploadCloud className="w-8 h-8 text-[#4F81FF] shrink-0" />
            <div>
              <p className="text-sm font-semibold">Upload Document</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, PDF (Max 5 MB)</p>
            </div>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(e) => setGeneralFile(e.target.files?.[0] || null)}
            />
          </label>
          {generalFile && (
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-lg text-xs">
              <FileText className="w-4 h-4" />
              {generalFile.name}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={addComment.isPending}
        className="w-full py-4 bg-[#826CF3] text-white font-bold rounded-xl shadow-[0_4px_16px_rgba(130,108,243,0.35)] hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
      >
        {addComment.isPending ? (
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          "Submit Response"
        )}
      </button>
    </div>
  );
}
