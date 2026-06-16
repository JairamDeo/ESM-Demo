import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft, UploadCloud, Download, X, Folder, Loader2, AlertTriangle,
} from "lucide-react";
import {
  useVeteranDocumentChecklist,
  useUploadVeteranRequiredDocument,
  useDeleteVeteranUpload,
  clearVeteranDraftUploads,
} from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { resolveUploadUrl, getApiBaseUrl } from "@/lib/apiBase";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

function mergeSubmittedDoc(doc: any, submittedDocs: any[]) {
  const submitted = submittedDocs.find((s) => s.documentLabel === doc.label);
  if (!submitted || doc.upload) return doc;
  return {
    ...doc,
    upload: {
      uploadId: submitted.uploadId,
      originalFileName: submitted.originalFileName,
      mimeType: submitted.mimeType,
      fileSize: submitted.fileSize,
      fileUrl: submitted.fileUrl,
    },
  };
}

export default function DocumentCheckList() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const formState = location.state?.form || {};
  const isFromQR = location.state?.isFromQR || false;
  const concernMode = location.state?.concernMode === true;
  const generalConcernMode = location.state?.generalConcernMode === true;
  const freshGrievanceFlow = location.state?.freshGrievanceFlow === true;
  const isNewGrievanceFlow = !concernMode && !generalConcernMode;
  const documentOnlyConcernMode = concernMode && !generalConcernMode;
  const flaggedDocumentLabels: string[] = location.state?.flaggedDocumentLabels || [];
  const flaggedSet = useMemo(() => new Set(flaggedDocumentLabels), [flaggedDocumentLabels]);
  const hasRequiredDocFixes = location.state?.hasRequiredDocFixes === true;
  const grievanceId = location.state?.grievanceId as string | undefined;
  const concernMessage = location.state?.concernMessage || "";
  const complaint = location.state?.complaint || {};
  const caseTypeId = formState.caseTypeId;
  const useGrievanceUpload = (generalConcernMode || documentOnlyConcernMode) && !!grievanceId;

  const qc = useQueryClient();
  const clearedFreshRef = useRef(false);
  const [draftsReady, setDraftsReady] = useState(!(freshGrievanceFlow && isNewGrievanceFlow && !!caseTypeId));

  useEffect(() => {
    if (!freshGrievanceFlow || !isNewGrievanceFlow || !caseTypeId || clearedFreshRef.current) {
      setDraftsReady(true);
      return;
    }

    clearedFreshRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        await clearVeteranDraftUploads(caseTypeId);
        await qc.invalidateQueries({ queryKey: ["veteran-document-checklist", caseTypeId] });
        if (!cancelled) {
          navigate(location.pathname, {
            state: { ...location.state, freshGrievanceFlow: false },
            replace: true,
          });
          setDraftsReady(true);
        }
      } catch {
        if (!cancelled) {
          toast.error("Could not reset document uploads. Please remove old files manually.");
          setDraftsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- clear once per fresh filing entry
  }, [freshGrievanceFlow, isNewGrievanceFlow, caseTypeId]);

  const { data: checklistData, isLoading } = useVeteranDocumentChecklist(
    draftsReady ? caseTypeId || "" : ""
  );
  const allDocuments = checklistData?.items || [];
  const submittedDocs: any[] = complaint.submittedDocuments || [];

  const documents = useMemo(() => {
    if (documentOnlyConcernMode && flaggedSet.size > 0) {
      const labels = [...flaggedSet];
      return labels.map((label) => {
        const fromChecklist = allDocuments.find((d: any) => d.label === label);
        const submitted = submittedDocs.find((d) => d.documentLabel === label);
        if (fromChecklist) return mergeSubmittedDoc(fromChecklist, submittedDocs);
        if (submitted) {
          return {
            label: submitted.documentLabel,
            text: submitted.documentText || submitted.documentLabel,
            isMandatory: true,
            templateUrl: null,
            templateFileName: null,
            upload: {
              uploadId: submitted.uploadId,
              originalFileName: submitted.originalFileName,
              mimeType: submitted.mimeType,
              fileSize: submitted.fileSize,
              fileUrl: submitted.fileUrl,
            },
          };
        }
        return null;
      }).filter(Boolean);
    }
    if (generalConcernMode && submittedDocs.length > 0) {
      return allDocuments.map((doc: any) => mergeSubmittedDoc(doc, submittedDocs));
    }
    return allDocuments;
  }, [documentOnlyConcernMode, generalConcernMode, flaggedSet, allDocuments, submittedDocs]);

  const uploadDoc = useUploadVeteranRequiredDocument();
  const deleteUpload = useDeleteVeteranUpload();
  const [reuploadedLabels, setReuploadedLabels] = useState<Set<string>>(
    () => new Set((location.state?.reuploadedDocumentLabels as string[]) || [])
  );

  const apiBase = getApiBaseUrl().replace("/api", "");
  const resolveFileUrl = (url: string) =>
    url?.startsWith("http") ? url : `${apiBase}${url.startsWith("/") ? url : `/${url}`}`;

  const isFlaggedDoc = (label: string) => flaggedSet.has(label);
  const isRequiredReupload = (label: string) =>
    documentOnlyConcernMode || (generalConcernMode && isFlaggedDoc(label));

  const allRequiredReuploaded =
    !hasRequiredDocFixes ||
    [...flaggedSet].every((label) => reuploadedLabels.has(label));

  const handleFileChange = async (docLabel: string, itemIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValidType = ["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(file.type);
    const isValidSize = file.size <= 5 * 1024 * 1024;

    if (!isValidType) {
      toast.error(`${file.name} — only JPG, PNG, PDF allowed`);
      return;
    }
    if (!isValidSize) {
      toast.error(`${file.name} — file must be under 5MB`);
      return;
    }

    if (useGrievanceUpload) {
      try {
        await uploadDoc.mutateAsync({
          caseTypeId,
          documentLabel: docLabel,
          itemIndex,
          file,
          grievanceId,
        });
        setReuploadedLabels((prev) => new Set(prev).add(docLabel));
        toast.success(`${docLabel} updated successfully`);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Upload failed");
      } finally {
        e.target.value = "";
      }
      return;
    }

    try {
      await uploadDoc.mutateAsync({ caseTypeId, documentLabel: docLabel, itemIndex, file });
      toast.success(`${file.name} uploaded successfully!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      e.target.value = "";
    }
  };

  const removeFile = async (uploadId: string, docLabel: string) => {
    if (useGrievanceUpload) {
      setReuploadedLabels((prev) => {
        const next = new Set(prev);
        next.delete(docLabel);
        return next;
      });
      toast.message("Upload a new file to replace the document.");
      return;
    }
    try {
      await deleteUpload.mutateAsync({ uploadId, caseTypeId });
      toast.success("File removed");
    } catch {
      toast.error("Failed to remove file");
    }
  };

  const handleContinue = () => {
    if (hasRequiredDocFixes && !allRequiredReuploaded) {
      const missing = [...flaggedSet].filter((l) => !reuploadedLabels.has(l));
      toast.error(`Please re-upload: ${missing.join(", ")}`);
      return;
    }

    if (documentOnlyConcernMode) {
      navigate("/user/concern-review-submit", {
        state: {
          ...location.state,
          form: formState,
          generalMode: true,
          documentOnlyFlow: true,
          reuploadedDocumentLabels: [...reuploadedLabels],
        },
      });
      return;
    }

    if (generalConcernMode) {
      navigate("/user/concern-review-submit", {
        state: {
          ...location.state,
          form: formState,
          generalMode: true,
          generalFullFlow: true,
          reuploadedDocumentLabels: [...reuploadedLabels],
        },
      });
      return;
    }

    navigate("/user/review-submit", {
      state: { form: formState, isFromQR, documents: allDocuments },
    });
  };

  const handleBack = () => {
    if (documentOnlyConcernMode) {
      navigate("/user/track-case", { state: { complaint } });
      return;
    }
    if (generalConcernMode) {
      navigate("/user/raise-grievance", { state: location.state });
      return;
    }
    navigate("/user/raise-grievance", { state: { form: formState, isFromQR } });
  };

  if ((isLoading && !documentOnlyConcernMode && !generalConcernMode) || !draftsReady) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const stepLabel = documentOnlyConcernMode
    ? t("step1of2")
    : generalConcernMode
      ? t("step2of3")
      : t("step2of3");

  const pageTitle = documentOnlyConcernMode
    ? flaggedSet.size > 1
      ? t("correctDocuments")
      : t("correctDocument")
    : generalConcernMode
      ? t("reviewDocuments")
      : t("documentChecklist");

  return (
    <div className="px-3 space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
        </div>
        <span className="text-xs font-semibold text-[#1754CF] dark:text-[#F0C902]">{stepLabel}</span>
      </div>

      {(documentOnlyConcernMode || generalConcernMode) && (
        <div className="bg-destructive/10 border border-destructive/25 rounded-xl p-3.5 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              {documentOnlyConcernMode
                ? t("reuploadAllFlagged")
                : hasRequiredDocFixes
                  ? t("reuploadFlaggedRequired")
                  : t("updateDocumentsIfNeeded")}
            </p>
            {concernMessage && (
              <p className="text-xs text-foreground/90 mt-1 whitespace-pre-wrap">{concernMessage}</p>
            )}
          </div>
        </div>
      )}

      {documents.length > 0 ? documents.map((doc: any, index: number) => {
        const upload = doc.upload;
        const isUploading = uploadDoc.isPending && uploadDoc.variables?.documentLabel === doc.label;
        const flagged = isFlaggedDoc(doc.label);
        const reuploaded = reuploadedLabels.has(doc.label);

        return (
          <div
            key={doc.label || index}
            className={`bg-card border rounded-xl p-4 space-y-3 ${
              flagged || documentOnlyConcernMode ? "border-warning/40 ring-1 ring-warning/20" : "border-border"
            }`}
          >
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full dark:bg-[#1A1A1A] dark:text-white bg-[#F1F1F1] text-black text-xs font-medium flex items-center justify-center flex-shrink-0">
                {String.fromCharCode(65 + index)}
              </div>
              <div className="min-w-0">
                {flagged && (
                  <span className="text-[10px] font-semibold text-warning bg-warning/15 px-2 py-0.5 rounded-full inline-block mb-1">
                    {t("officerFlagged")}
                  </span>
                )}
                <p className="text-sm text-foreground leading-relaxed">
                  {doc.text}
                  {(doc.isMandatory || isRequiredReupload(doc.label)) && (
                    <span className="text-destructive font-bold ml-1">*</span>
                  )}
                </p>
              </div>
            </div>

            {upload && (
              <div className="space-y-2">
                <div className={`flex items-center justify-between rounded-xl p-3 border ${
                  reuploaded ? "bg-success/10 border-success/30" : "bg-secondary/30 border-border"
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {upload.mimeType === "application/pdf" ? (
                      <img src="/icons/pdf2.svg" className="w-7 h-7" alt="" />
                    ) : (
                      <img src="/icons/file.svg" className="w-6 h-6 invert dark:invert-0" alt="" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{upload.originalFileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {reuploaded
                          ? t("updated")
                          : useGrievanceUpload
                            ? t("currentFile")
                            : upload
                              ? t("uploaded")
                              : ""}
                        {upload?.fileSize ? ` · ${(upload.fileSize / 1024).toFixed(0)} KB` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {reuploaded && <img src="/icons/check.svg" className="w-5 h-5" alt="" />}
                    {!useGrievanceUpload && (
                      <button
                        onClick={() => removeFile(upload.uploadId, doc.label)}
                        disabled={deleteUpload.isPending}
                        className="p-1 rounded-full hover:bg-border text-muted-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {doc.templateUrl && (
              <a
                href={resolveUploadUrl(doc.templateUrl) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                download={doc.templateFileName || undefined}
                className="w-full flex items-center justify-between dark:bg-secondary bg-[#E2EBFF] border border-border rounded-md px-4 py-3 hover:border-[#6b98f2] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img src="/icons/file.svg" className="w-5 h-5 invert dark:invert-0" alt="" />
                  <span className="text-sm font-medium text-foreground">{t("downloadFormat")}</span>
                </div>
                <Download className="w-8 h-8 text-[#F0C902] invert dark:invert-0" />
              </a>
            )}

            <label
              className={`flex items-center justify-center gap-4 w-full border-2 border-dashed border-[#2952A3] rounded-xl px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors ${
                isUploading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-[#4F81FF] animate-spin" />
              ) : (
                <UploadCloud className="w-8 h-8 text-[#4F81FF]" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isUploading
                    ? t("uploading")
                    : useGrievanceUpload
                      ? reuploaded
                        ? t("uploadAgain")
                        : t("uploadCorrected")
                      : upload
                        ? t("replaceDocument")
                        : t("uploadDocument")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, PDF (Max 5 MB)</p>
              </div>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleFileChange(doc.label, index, e)}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>
        );
      }) : (
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center">
          <Folder className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">{t("noDocumentsRequired")}</p>
        </div>
      )}

      {(documents.length > 0 || generalConcernMode) && (
        <button
          onClick={handleContinue}
          disabled={hasRequiredDocFixes && !allRequiredReuploaded}
          className="w-full flex items-center justify-center bg-[#826CF3] text-white font-bold py-4 mt-4 rounded-xl hover:opacity-90 shadow-[0_4px_16px_rgba(130,108,243,0.35)] disabled:opacity-50"
        >
          {generalConcernMode || documentOnlyConcernMode ? t("continueToReview") : t("continue")}
        </button>
      )}
    </div>
  );
}
