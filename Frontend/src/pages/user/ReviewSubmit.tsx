import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Info, FileText, UploadCloud } from "lucide-react";
import { useCreateGrievance } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const documentRequirementsMap: Record<string, string[]> = {
  "Update DOB": [
    "Self-attested copy of either PAN Card/ Matriculation Certificate Password/ECHS Card/ Driving License Election ID Card/ Aadhaar Card *",
    "Declaration on non-judicial ding correct date starmp paper regarding correct of birth. Format attached. *",
    "In case of children, certificated of birth from the registrar/Municipal authority local panchayat/ head of recognised school if he/she is studying in such a school Board of Education Format at Appendix C *"
  ],
};

const defaultDocuments = [
  "Self-attested copy of relevant official identification document (Aadhaar, PAN, Passport, etc.) *",
  "Any supporting documents specific to the grievance (e.g., discharge book, PPO, medical records). *",
  "A formal application or declaration explaining the grievance in detail. *"
];

export default function ReviewSubmit() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const createGrievance = useCreateGrievance();

  const { form = {}, filesByReq = {}, isFromQR = false } = location.state || {};
  const caseType = form.caseType || "General Grievance";
  const documents = documentRequirementsMap[caseType] || defaultDocuments;

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      formData.append("type", caseType);
      const veteranName = user?.name?.trim() || "";
      if (veteranName) formData.append("veteranName", veteranName);
      if (user?.phone) formData.append("veteranPhone", user.phone);
      if (form.rank) formData.append("veteranRank", form.rank);
      if (form.armyNumber) formData.append("veteranArmyNo", form.armyNumber);
      formData.append("stationName", form.stationHQ);
      if (form.description) formData.append("description", form.description);
      formData.append("submissionSource", isFromQR ? "qr_code" : "portal");
      formData.append("priority", "medium");
      Object.values(filesByReq).forEach((files: any) => {
        files.forEach((file: File) => formData.append("attachments", file));
      });
      const result = await createGrievance.mutateAsync(formData);
      navigate("/user/success", {
        state: {
          grievanceId: result?.grievanceId || "N/A",
          caseType: caseType,
          category: "Identity & Personal", // Placeholder or dynamically mapped
          concernType: form.concernType,
          stationHQ: form.stationHQ,
          date: new Date().toISOString()
        }
      });
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
          <h1 className="text-lg font-semibold text-foreground">Review & Submit</h1>
        </div>
        <span className="text-xs font-semibold  text-[#1754CF] dark:text-[#F0C902]">Step 3 / 3</span>
      </div>

      {/* Info Banner */}
      <div className="border border-[#826CF3]/40 rounded-xl p-3.5 flex items-start gap-3">
        <div className=" flex items-center justify-center flex-shrink-0 mt-2.5">
          <img src="/icons/info.svg" className="w-5 h-5" />
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">
          Please review all the details below before submitting your grievance.
        </p>
      </div>

      {/* Services Details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Services Details</h2>
          <button
            onClick={() => navigate("/user/raise-grievance", { state: { ...form, caseType } })}
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
              onClick={() => navigate("/user/raise-grievance")}
              className="text-sm font-medium text-[#579BFF] hover:opacity-80"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      {/* Grievance Details */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Grievance Details</h2>
        <div className="bg-card border border-border rounded-xl p-4 space-y-0">
          {[
            { label: "Concern for", value: form.concernType },
            { label: "Station HQ",  value: form.stationHQ },
            { label: "Rank",        value: form.rank },
            { label: "Army No",     value: form.armyNumber },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-3   border-b border-border last:border-none">
              <span className="text-sm font-medium text-foreground ">{row.label}</span>
              <span className="text-sm font-medium text-foreground px-4">{row.value || "—"}</span>
            </div>
          ))}
          {/* Description */}
          <div className="pt-3">
            <span className="text-sm font-normal text-foreground block mb-2">Description</span>
            <p className="text-sm text-foreground leading-relaxed px-1">
              {form.description || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Documents Summary */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Documents summary</h2>
        <div className="bg-card border border-border rounded-xl p-4 space-y-5">
          {documents.map((doc, index) => {
            const uploadedFiles = (filesByReq as Record<number, File[]>)[index] || [];
            return (
              <div key={index} className={`space-y-3 ${index !== documents.length - 1 ? "pb-5 border-b border-border" : ""}`}>

                {/* Doc requirement text */}
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-[#1754CF] dark:bg-[#1A1A1A] text-[#ffff] dark:text-white text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">

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
                {uploadedFiles.length > 0 ? (
                  <div className="ml-10 space-y-2">
                    {uploadedFiles.map((file, fIndex) => (
                      <div key={fIndex} className="flex items-center justify-between bg-secondary border border-border rounded-xl p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-white dark:bg-[#2a2a2a] rounded-lg flex items-center justify-center shrink-0 border border-border">
                            {file.type === "application/pdf" ? (
                              <span className="text-red-500 font-bold text-[10px]">PDF</span>
                            ) : (
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                          </div>
                        </div>
                        <button className="bg-[#0A58CA] text-white text-xs font-medium px-4 py-1.5 rounded-lg hover:opacity-90 transition-colors flex-shrink-0">
                          View
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                      <img src="/icons/upload.svg" className="w-4 h-4" />
                      {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} uploaded
                    </div>
                  </div>
                ) : (
                  <div className="ml-10 flex items-center gap-1.5 text-xs text-muted-foreground">
                    < img src="/icons/upload.svg" className="w-4 h-4" />
                    No file uploaded
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={createGrievance.isPending}
        className="w-full bg-[#826CF3] text-white font-bold text-sm py-4 rounded-xl hover:opacity-90 transition-all shadow-[0_4px_16px_rgba(130,108,243,0.35)] disabled:opacity-50 flex items-center justify-center"
      >
        {createGrievance.isPending ? (
          <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          "Confirm & Submit"
        )}
      </button>

    </div>
  );
}