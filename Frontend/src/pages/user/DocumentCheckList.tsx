import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, UploadCloud, FileText, CheckCircle2, Download, X } from "lucide-react";
import { useCreateGrievance } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const documentRequirementsMap: Record<string, string[]> = {
  "Update DOB": [
    "Self-attested copy of either PAN Card/ Matriculation Certificate Passport/ECHS Card/ Driving License Election ID Card/ Aadhaar Card *",
    "Declaration on non-judicial stamp paper regarding correct date of birth. Format attached. *",
    "In case of children, certificated of birth from the registrar/Municipal authority local panchayat/ head of recognised school if he/she is studying in such a school Board of Education Format at Appendix C *"
  ],
};

const defaultDocuments = [
  "Self-attested copy of relevant official identification document (Aadhaar, PAN, Passport, etc.) *",
  "Any supporting documents specific to the grievance (e.g., discharge book, PPO, medical records). *",
  "A formal application or declaration explaining the grievance in detail. *"
];

export default function DocumentCheckList() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const createGrievance = useCreateGrievance();

  const formState = location.state?.form || {};
  const isFromQR = location.state?.isFromQR || false;
  const caseType = formState.caseType || "General Grievance";
  const documents = documentRequirementsMap[caseType] || defaultDocuments;

  const [filesByReq, setFilesByReq] = useState<Record<number, File[]>>({});

  const handleFileChange = useCallback((reqIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValidType = ["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024;
      if (!isValidType) toast.error(`${file.name} — only JPG, PNG, PDF allowed`);
      if (!isValidSize) toast.error(`${file.name} — file must be under 5MB`);
      return isValidType && isValidSize;
    });
    setFilesByReq((prev) => ({
      ...prev,
      [reqIndex]: [...(prev[reqIndex] || []), ...validFiles],
    }));
    e.target.value = "";
  }, []);

  const removeFile = useCallback((reqIndex: number, fileIndex: number) => {
    setFilesByReq((prev) => ({
      ...prev,
      [reqIndex]: prev[reqIndex].filter((_, i) => i !== fileIndex),
    }));
  }, []);

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      formData.append("type", formState.caseType);
      const veteranName = user?.name?.trim() || "";
      if (veteranName) formData.append("veteranName", veteranName);
      if (user?.phone) formData.append("veteranPhone", user.phone);
      if (formState.rank) formData.append("veteranRank", formState.rank);
      if (formState.armyNumber) formData.append("veteranArmyNo", formState.armyNumber);
      formData.append("stationName", formState.stationHQ);
      if (formState.description) formData.append("description", formState.description);
      formData.append("submissionSource", isFromQR ? "qr_code" : "portal");
      formData.append("priority", "medium");
      Object.values(filesByReq).forEach((files) =>
        files.forEach((file) => formData.append("attachments", file))
      );
      const result = await createGrievance.mutateAsync(formData);
      toast.success("Grievance submitted successfully!", {
        description: `Complaint ID: ${result?.grievanceId || "Generated"}`,
      });
      navigate("/user/complaints");
    } catch {
      // error handled by hook
    }
  };

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
      {documents.map((doc, index) => {
        const uploadedFiles = filesByReq[index] || [];

        return (
          <div key={index} className="bg-card border border-border rounded-xl p-4 space-y-3">

            {/* Requirement text */}
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full dark:bg-[#1A1A1A] dark:text-white bg-[#F1F1F1] text-black text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                {String.fromCharCode(65 + index)}
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {doc.split('*').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="text-destructive font-bold">*</span>}
                  </span>
                ))}
              </p>
            </div>

            {/* Uploaded files */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((file, fIndex) => (
                  <div key={fIndex} className="flex items-center justify-between bg-secondary border border-border rounded-xl p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-white dark:bg-[#2a2a2a] rounded-lg flex items-center justify-center shrink-0 border border-border">
                        {file.type === "application/pdf" ? (
                          <span className="text-red-500 font-bold text-[10px]">PDF</span>
                        ) : (
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <button
                        onClick={() => removeFile(index, fIndex)}
                        className="p-1 rounded-full hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Download format — only for Appendix C */}
            {doc.includes("Appendix C") && (
              <button className="w-full flex items-center justify-between dark:bg-secondary bg-[#E2EBFF] border border-border rounded-xl px-4 py-3 hover:border-amber-400/40 transition-colors  ">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">Download Format for Appendix C</span>
                </div>
                <Download className="w-4 h-4 text-[#F0C902]" />
              </button>
            )}

            {/* Upload box — horizontal layout */}
            <label className="flex items-center gap-4 w-full border-2 border-dashed border-[#2952A3] rounded-xl px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors">
              <UploadCloud className="w-8 h-8 text-[#4F81FF] flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Upload Document</p>
                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, PDF (Max 5 MB)</p>
              </div>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleFileChange(index, e)}
                className="hidden"
              />
            </label>

            {/* Upload count */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
              <img src="/icons/upload.svg" className="w-4 h-4" />
              {uploadedFiles.length > 0
                ? `${uploadedFiles.length} file(s) uploaded`
                : "No file uploaded"}
            </div>

          </div>
        );
      })}

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={createGrievance.isPending}
        className="w-full flex items-center justify-center bg-[#826CF3] text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-[0_4px_16px_rgba(130,108,243,0.35)] disabled:opacity-50"
      >
        {createGrievance.isPending ? (
          <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          "Continue"
        )}
      </button>

    </div>
  );
}