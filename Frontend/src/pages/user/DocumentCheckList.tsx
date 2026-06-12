import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, UploadCloud, FileText, CheckCircle2, Download, X, Folder, Loader2 } from "lucide-react";
import { useVeteranDocumentChecklist, useUploadVeteranRequiredDocument, useDeleteVeteranUpload } from "@/hooks/useApi";
import { resolveUploadUrl } from "@/lib/apiBase";
import { toast } from "sonner";

export default function DocumentCheckList() {
  const location = useLocation();
  const navigate = useNavigate();

  const formState = location.state?.form || {};
  const isFromQR = location.state?.isFromQR || false;
  const caseType = formState.caseType || "General Grievance";

  const caseTypeId = formState.caseTypeId;

  const { data: checklistData, isLoading } = useVeteranDocumentChecklist(caseTypeId);
  const documents = checklistData?.items || [];

  const uploadDoc = useUploadVeteranRequiredDocument();
  const deleteUpload = useDeleteVeteranUpload();

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

    try {
      await uploadDoc.mutateAsync({
        caseTypeId,
        documentLabel: docLabel,
        itemIndex,
        file
      });
      toast.success(`${file.name} uploaded successfully!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      e.target.value = "";
    }
  };

  const removeFile = async (uploadId: string) => {
    try {
      await deleteUpload.mutateAsync({ uploadId, caseTypeId });
      toast.success("File removed");
    } catch (err: any) {
      toast.error("Failed to remove file");
    }
  };

  const handleContinue = () => {
    // Navigate to Review and Submit page with form and documents
    navigate("/user/review-submit", { 
      state: { form: formState, isFromQR, documents } 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-3 space-y-4 pb-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Document Check List</h1>
        </div>
        <span className="text-xs font-semibold text-[#1754CF] dark:text-[#F0C902]">Step 2 / 3</span>
      </div>

      {/* Document cards */}
      {documents.length > 0 ? documents.map((doc: any, index: number) => {
        const upload = doc.upload;
        const isUploading = uploadDoc.isPending && uploadDoc.variables?.documentLabel === doc.label;

        return (
          <div key={index} className="bg-card border border-border rounded-xl p-4 space-y-3">

            {/* Requirement text */}
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full dark:bg-[#1A1A1A] dark:text-white bg-[#F1F1F1] text-black text-xs font-medium flex items-center justify-center flex-shrink-0 ">
                {String.fromCharCode(65 + index)}
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {doc.text}
                {doc.isMandatory && <span className="text-destructive font-bold ml-1">*</span>}
              </p>
            </div>

            {/* Uploaded files */}
            {upload && (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-secondary/30 border border-border rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {upload.mimeType === "application/pdf" ? (
                      <img src="/icons/pdf2.svg" className="w-7 h-7 "/>
                    ) : (
                      <img src="/icons/file.svg" className="w-6 h-6 invert dark:invert-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{upload.originalFileName}</p>
                      <p className="text-xs text-muted-foreground">{(upload.fileSize / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <img src="/icons/check.svg" className="w-5 h-5" />
                    <button
                      onClick={() => removeFile(upload.uploadId)}
                      disabled={deleteUpload.isPending}
                      className="p-1 rounded-full hover:bg-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Download format — only if templateUrl exists */}
            {doc.templateUrl && (
              <a
                href={resolveUploadUrl(doc.templateUrl) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                download={doc.templateFileName || undefined}
                className="w-full flex items-center justify-between dark:bg-secondary bg-[#E2EBFF] border border-border rounded-md px-4 py-3 hover:border-[#6b98f2] dark:hover:border-[#aa9a4b] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img src="/icons/file.svg" className="w-5 h-5 invert dark:invert-0 " />
                  <span className="text-sm font-medium text-foreground">
                    Download Format {doc.templateFileName ? `(${doc.templateFileName})` : ""}
                  </span>
                </div>
                <Download className="w-8 h-8 text-[#F0C902] invert dark:invert-0" />
              </a>
            )}

            {/* Upload box — horizontal layout */}
            {!upload && (
              <label className={`flex items-center justify-center gap-4 w-full border-2 border-dashed border-[#2952A3] rounded-xl px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-[#4F81FF] flex-shrink-0 animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8 text-[#4F81FF] flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isUploading ? "Uploading..." : "Upload Document"}
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
            )}

            {/* Upload count */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
              <img src="/icons/upload.svg" className="w-4 h-4" />
              {upload ? "1 file uploaded" : "No file uploaded"}
            </div>

          </div>
        );
      }) : (
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center opacity-80">
          <Folder className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No documents to upload.</p>
          <p className="text-xs text-muted-foreground mt-1">You can skip this step and proceed to review.</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-6">
      <button
        onClick={handleContinue}
        className="w-full flex items-center justify-center bg-[#826CF3] text-white font-bold py-4 mt-4  rounded-xl hover:opacity-90 transition-all shadow-[0_4px_16px_rgba(130,108,243,0.35)] disabled:opacity-50"
      >
        Continue
      </button>
      </div>

    </div>
  );
}