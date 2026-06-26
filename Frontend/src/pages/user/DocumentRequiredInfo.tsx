import { useLocation, Link } from "react-router-dom";
import { ChevronLeft, FileText, Folder, AlertCircle, Download } from "lucide-react";
import { useRequiredDocumentsForCaseType } from "@/hooks/useApi";
import { resolveUploadUrl } from "@/lib/apiBase";
import { useTranslation } from "react-i18next";
import { useDynamicTranslation } from "@/utils/translationHelper";

const DEFAULT_NOTE =
  "Please keep the required documents ready before raising a grievance. Documents will be requested during the grievance filing process.";

export default function DocumentRequiredInfo() {
  const location = useLocation();
  const { t } = useTranslation();
  const { currentLang, getField } = useDynamicTranslation();
  const caseTypeId = location.state?.caseTypeId as string | undefined;
  const caseTypeFromNav = location.state?.caseType as string | undefined;
  const descriptionFromNav =
    location.state?.description ||
    "Please prepare the following documents before proceeding.";

  const { data: requiredDocsData, isLoading, isError } = useRequiredDocumentsForCaseType({
    caseTypeId,
    name: caseTypeId ? undefined : caseTypeFromNav,
    enabled: !!(caseTypeId || caseTypeFromNav),
  });

  const displayTitle =
    getField(requiredDocsData, "caseTypeName") || caseTypeFromNav || "General Grievance";
  const displayDescription =
    getField(requiredDocsData, "description") || descriptionFromNav;
  const resolvedCaseTypeId =
    requiredDocsData?.caseTypeId || caseTypeId || "";

  const documents = requiredDocsData?.documents || [];

  const guidelinesArray = currentLang === "hi" && requiredDocsData?.guidelinesHi?.length
    ? requiredDocsData.guidelinesHi
    : requiredDocsData?.guidelines;

  const guidelines =
    guidelinesArray?.filter((g: string) => g?.trim())?.length
      ? guidelinesArray.filter((g: string) => g?.trim())
      : [
          "Ensure all details match your supporting documents.",
          "Upload clear and self-attested documents.",
          `Accepted formats: ${requiredDocsData?.acceptedFormats || "PDF, JPG, JPEG, PNG"}.`,
          `Maximum file size: ${requiredDocsData?.maxFileSizeMb ?? 5} MB per document.`,
          "Additional documents may be requested during verification.",
        ];

  const note = getField(requiredDocsData, "note").trim() || DEFAULT_NOTE;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-3 space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <Link to="/user/services" className="p-1.5 rounded-full hover:bg-secondary mt-1">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-xl font-semibold text-foreground">{t("documents")}</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <p className="text-sm text-destructive">{t("couldNotLoad")}</p>
          <Link to="/user/services" className="text-sm text-primary mt-3 inline-block hover:underline">
            {t("backToServices")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 space-y-4 pb-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/user/services" className="p-1.5 rounded-full hover:bg-secondary mt-1">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground">{t("documents")}</h1>
      </div>

      {/* Title section */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#826CF3]/15 flex items-center justify-center flex-shrink-0">
          <FileText className="w-7 h-7 text-[#826CF3]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{displayTitle}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{displayDescription}</p>
        </div>
      </div>

      {/* Documents Required */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <img src="/icons/folder.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
          <h3 className="text-base font-semibold text-foreground">{t("documentsRequired")}</h3>
        </div>
        <div className="space-y-4">
          {documents.length > 0 ? (
            documents.map((doc: { label: string; text?: string; textHi?: string; isMandatory?: boolean; templateUrl?: string | null; templateFileName?: string | null }, index: number) => {
              const templateUrl = resolveUploadUrl(doc.templateUrl);
              return (
                <div key={`${doc.label}-${index}`} className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full dark:bg-[#1A1A1A] dark:text-[#FFFFFF] bg-[#F1F1F1] text-[#000000] text-xs font-medium flex items-center justify-center flex-shrink-0 uppercase">
                    {(doc.label || String.fromCharCode(65 + index)).replace(/[()]/g, "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed break-words overflow-hidden">
                      {getField(doc, "text")}
                      {doc.isMandatory !== false && (
                        <span className="text-destructive font-bold ml-1">*</span>
                      )}
                    </p>
                    {templateUrl && (
                      <a
                        href={templateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-[#826CF3] hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {doc.templateFileName || "Download format"}
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center opacity-80">
              <Folder className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-foreground">{t("noDocumentsRequired")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("proceedNextStep")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines — from admin Required Documents config */}
      {guidelines.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="text-base font-semibold text-foreground mb-3">{t("guidelines")}</h3>
          <ul className="space-y-2">
            {guidelines.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="w-1 h-1 rounded-full bg-foreground flex-shrink-0 mt-2" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Note — from admin Required Documents config */}
      {note && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm font-semibold text-destructive">{t("note")}</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{note}</p>
        </div>
      )}

      {/* CTA */}
      <Link
        to="/user/raise-grievance"
        state={{
          caseType: displayTitle,
          caseTypeId: resolvedCaseTypeId,
          freshGrievanceFlow: true,
        }}
        className="w-full flex items-center justify-center bg-[#826CF3] text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-[0_4px_16px_rgba(130,108,243,0.35)]"
      >
        {t("raiseGrievance")}
      </Link>

    </div>
  );
}
