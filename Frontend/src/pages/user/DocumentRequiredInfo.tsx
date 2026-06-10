import { useLocation, Link } from "react-router-dom";
import { ChevronLeft, FileText, Folder, AlertCircle } from "lucide-react";

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

export default function DocumentRequiredInfo() {
  const location = useLocation();
  const caseType = location.state?.caseType || "General Grievance";
  const description = location.state?.description || "Please prepare the following documents before proceeding.";
  const documents = documentRequirementsMap[caseType] || defaultDocuments;

  return (
    <div className="px-3 space-y-4 pb-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/user/services" className="p-1.5 rounded-full hover:bg-secondary mt-1">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Documents</h1>
      </div>

      {/* Title section */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#826CF3]/15 flex items-center justify-center flex-shrink-0">
          <FileText className="w-7 h-7 text-[#826CF3]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{caseType}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Documents Required */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <img src="/icons/folder.svg" className="w-4 h-4 invert dark:invert-0" />
          <h3 className="text-base font-semibold text-foreground">Documents Required</h3>
        </div>
        <div className="space-y-4">
          {documents.map((doc, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full dark:bg-[#1A1A1A] dark:text-[#FFFFFF] bg-[#F1F1F1] text-[#000000] text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
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
          ))}
        </div>
      </div>

      {/* Guidelines */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="text-base font-semibold text-foreground mb-3">Guidelines</h3>
        <ul className="space-y-2">
          {[
            "Ensure all details match your supporting documents.",
            "Upload clear and self-attested documents.",
            "Accepted formats: PDF, JPG, JPEG, PNG.",
            "Maximum file size: 5 MB per document.",
            "Additional documents may be requested during verification.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="w-1 h-1 rounded-full bg-foreground flex-shrink-0 mt-2" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Note */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm font-semibold text-destructive">Note</p>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          Please keep the required documents ready before raising a grievance. Documents will be
          requested during the grievance filing process.
        </p>
      </div>

      {/* CTA */}
      <Link
        to="/user/raise-grievance"
        state={{ caseType }}
        className="w-full flex items-center justify-center bg-[#826CF3] text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-[0_4px_16px_rgba(130,108,243,0.35)]"
      >
        Raise Grievance
      </Link>

    </div>
  );
}