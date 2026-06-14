import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Folder } from "lucide-react";
import { useCreateGrievance, useVeteranDocumentChecklist } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { loadVeteranDocumentPreview, type VeteranUploadPreview } from "@/lib/veteranDocuments";
import { saveGrievanceDraft, clearGrievanceDraft, clearDraftResumeSession } from "@/lib/grievanceDraft";
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal";
import { toast } from "sonner";

export default function ReviewSubmit() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const createGrievance = useCreateGrievance();
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<VeteranUploadPreview | null>(null);

  const { form = {}, isFromQR = false, documents: stateDocuments } = location.state || {};
  const caseType = form.caseType || "General Grievance";

  const { data: checklistData } = useVeteranDocumentChecklist(form.caseTypeId || "");
  const documents = useMemo(() => {
    if (Array.isArray(stateDocuments) && stateDocuments.length > 0) return stateDocuments;
    return checklistData?.items || [];
  }, [stateDocuments, checklistData?.items]);

  const closePreview = () => {
    preview?.revoke?.();
    setPreview(null);
  };

  const handleViewFile = async (upload: any) => {
    try {
      setViewingId(upload.uploadId);
      const loaded = await loadVeteranDocumentPreview(upload);
      setPreview(loaded);
    } catch {
      toast.error("Could not load document preview.");
    } finally {
      setViewingId(null);
    }
  };

  const handleSaveDraft = () => {
    if (!form.caseType?.trim()) {
      toast.error("Select a service before saving draft.");
      return;
    }
    saveGrievanceDraft(
      {
        form,
        isFromQR,
        step: "review",
      },
      user?.id
    );
    clearDraftResumeSession();
    toast.success("Draft saved. Continue anytime from Services or Home.");
    navigate("/user/services");
  };

  const handleSubmit = async () => {
    if (!caseType?.trim()) {
      toast.error("Please select a service type for your grievance.");
      navigate("/user/raise-grievance", { state: { form, caseType, isFromQR } });
      return;
    }

    if (!form.stationHQ?.trim()) {
      toast.error("Please select your Station HQ before submitting.");
      navigate("/user/raise-grievance", { state: { form, caseType, isFromQR } });
      return;
    }

    const veteranName = user?.name?.trim() || (user?.phone ? `Veteran (${user.phone})` : "Veteran");

    try {
      const formData = new FormData();
      formData.append("type", caseType);
      formData.append("veteranName", veteranName);
      if (user?.phone) formData.append("veteranPhone", user.phone);
      if (form.rank) formData.append("veteranRank", form.rank);
      if (form.armyNumber) formData.append("veteranArmyNo", form.armyNumber);
      formData.append("stationName", form.stationHQ.trim());
      if (form.caseTypeId) formData.append("caseTypeId", form.caseTypeId);
      if (form.description) formData.append("description", form.description);
      formData.append("submissionSource", isFromQR ? "qr_code" : "portal");
      formData.append("priority", "medium");

      const result = await createGrievance.mutateAsync(formData);
      clearGrievanceDraft(user?.id);
      clearDraftResumeSession();
      navigate("/user/success", {
        state: {
          grievanceId: result?.grievanceId || "N/A",
          caseType,
          category: "Identity & Personal",
          concernType: form.concernType,
          stationHQ: form.stationHQ,
          date: new Date().toISOString(),
        },
      });
    } catch {
      // toast handled by hook
    }
  };

  return (
    <>
      <DocumentPreviewModal preview={preview} onClose={closePreview} />

      <div className="px-3 space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                navigate("/user/document-checklist", { state: { form, isFromQR, documents } })
              }
              className="p-1.5 rounded-full hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Review & Submit</h1>
          </div>
          <span className="text-xs font-semibold text-[#1754CF] dark:text-[#F0C902]">Step 3 / 3</span>
        </div>

        <div className="bg-[#826CF3]/10 border border-[#826CF3]/40 rounded-xl p-3.5 flex items-start gap-3">
          <div className="flex items-center justify-center flex-shrink-0 mt-2.5">
            <img src="/icons/info.svg" className="w-5 h-5" alt="" />
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            Please review all the details below before submitting your grievance.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Services Details</h2>
            <button
              onClick={() => navigate("/user/raise-grievance", { state: { form, caseType, isFromQR } })}
              className="text-sm font-medium px-2 text-[#FF2E27] hover:text-[#fe0c03]"
            >
              Edit
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#D2E5FC] flex items-center justify-center flex-shrink-0">
                <img src="/icons/profile-filled.svg" className="w-5 h-5" alt="" />
              </div>
              <span className="text-sm font-semibold text-foreground">Identity & Personal</span>
            </div>
            <div className="bg-secondary rounded-md px-3 py-2.5 flex items-center justify-between ml-11">
              <span className="text-sm text-foreground flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-foreground flex-shrink-0" />
                {caseType}
              </span>
              <button
                onClick={() => navigate("/user/raise-grievance", { state: { form, caseType, isFromQR } })}
                className="text-sm font-medium text-[#579BFF] hover:opacity-80"
              >
                Change
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Grievance Details</h2>
          <div className="bg-card border border-border rounded-xl p-4 space-y-0">
            {[
              { label: "Concern for", value: form.concernType },
              { label: "Station HQ", value: form.stationHQ },
              { label: "Rank", value: form.rank },
              { label: "Army No", value: form.armyNumber },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b border-border last:border-none"
              >
                <span className="text-sm font-medium text-foreground">{row.label}</span>
                <span className="text-sm font-medium text-foreground px-4">{row.value || "—"}</span>
              </div>
            ))}
            <div className="pt-3">
              <span className="text-sm font-medium text-foreground block mb-2">Description</span>
              <p className="text-sm text-foreground leading-relaxed px-1 break-words overflow-hidden">
                {form.description || "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Documents summary</h2>
          <div className="bg-card border border-border rounded-xl p-4 space-y-5">
            {documents.length > 0 ? (
              documents.map((doc: any, index: number) => {
                const upload = doc.upload;
                return (
                  <div
                    key={index}
                    className={`space-y-3 ${index !== documents.length - 1 ? "pb-5 border-b border-border" : ""}`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-[#1754CF] dark:bg-[#1A1A1A] text-[#ffff] dark:text-white text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <p className="text-[14px] dark:text-white/90 font-medium leading-relaxed pr-2">
                        {doc.text}
                        {doc.isMandatory && <span className="text-red-500 font-bold ml-1">*</span>}
                      </p>
                    </div>

                    {upload ? (
                      <div className="ml-10 space-y-2">
                        <div className="flex items-center justify-between bg-secondary/30 border border-border rounded-xl p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {upload.mimeType === "application/pdf" ? (
                              <img src="/icons/pdf2.svg" className="w-7 h-7" alt="" />
                            ) : (
                              <img src="/icons/file.svg" className="w-6 h-6 invert dark:invert-0" alt="" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {upload.originalFileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {upload.fileSize
                                  ? `${(upload.fileSize / 1024).toFixed(0)} KB`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleViewFile(upload)}
                            disabled={viewingId === upload.uploadId}
                            className="bg-[#0051AE] text-white text-xs font-medium px-4 py-1.5 rounded-sm hover:opacity-90 transition-colors flex-shrink-0 disabled:opacity-50"
                          >
                            {viewingId === upload.uploadId ? "Loading…" : "View"}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                          <img src="/icons/upload.svg" className="w-4 h-4" alt="" />
                          1 file uploaded
                        </div>
                      </div>
                    ) : (
                      <div className="ml-10 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <img src="/icons/upload.svg" className="w-4 h-4" alt="" />
                        No file uploaded
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-4 opacity-80">
                <Folder className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-foreground">No documents required.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createGrievance.isPending}
            className="flex-1 min-w-0 bg-[#826CF3] text-white font-bold text-sm py-3.5 px-3 rounded-xl hover:opacity-90 transition-all shadow-[0_4px_16px_rgba(130,108,243,0.35)] disabled:opacity-50 flex items-center justify-center"
          >
            {createGrievance.isPending ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              "Confirm & Submit"
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={createGrievance.isPending}
            className="flex-1 min-w-0 bg-secondary border border-border text-foreground font-semibold text-sm py-3.5 px-3 rounded-xl hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
        </div>
      </div>
    </>
  );
}
