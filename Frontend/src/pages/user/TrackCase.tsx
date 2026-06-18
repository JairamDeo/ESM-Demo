import { memo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft, FileText, CheckCircle2,
  AlertTriangle, MessageSquare, ChevronDown, ChevronUp, UploadCloud, User, Calendar
} from "lucide-react";
import { useTrackGrievance } from "@/hooks/useApi";
import { getApiBaseUrl } from "@/lib/apiBase";
import { Icon } from "@iconify/react";
import { AnimatedCircularProgress, grievanceProgressMap } from "@/components/AnimatedCircularProgress";
import { useTranslation } from "react-i18next";
import { useDynamicTranslation } from "@/utils/translationHelper";
import {
  getConcernDocuments,
  concernNeedsGeneral,
  concernNeedsDocuments,
  timelineConcernLabel,
  getEffectiveConcernStatus,
} from "@/lib/concernUtils";

const STEP_LABELS: Record<string, string> = {
  pending: "Submitted",
  "in-progress": "In Progress",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
  concern: "Officer Concern",
  veteran_response: "Your Response",
  concern_resolved: "Concern Resolved",
};

function timelineStepLabel(step: any) {
  const docs = getConcernDocuments(step);
  if (step.eventType === "concern_resolved") return "Concern Resolved";
  if (step.eventType === "concern") {
    return timelineConcernLabel(step.concernScope, docs);
  }
  if (step.eventType === "veteran_response") {
    if (step.concernScope === "both") {
      return docs.length > 0 ? `Corrected details + ${docs.length} doc(s)` : "Corrected details";
    }
    if (docs.length > 1) return `Re-uploaded · ${docs.length} documents`;
    if (docs.length === 1) return `Re-uploaded · ${docs[0].documentLabel}`;
    return "Your Response";
  }
  return STEP_LABELS[step.status] || step.status?.charAt(0).toUpperCase() + step.status?.slice(1);
}

function Accordion({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-secondary/30 transition-colors"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function getDisplayText(item: any, fallback: string, currentLang: string) {
  if (!item || (!item.originalText && !item.translatedText)) return fallback;
  if (item.translationFailed) return item.originalText || fallback;

  if (currentLang === "en") {
    return item.language === "en" ? item.originalText : item.translatedText;
  } else {
    // 'hi' or other languages
    return item.language === "en" ? item.translatedText : item.originalText;
  }
}

export default memo(function TrackCase() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialComplaint = (location.state as any)?.complaint;
  const grievanceId = initialComplaint?._id || initialComplaint?.id || "";

  const { data: liveData } = useTrackGrievance(grievanceId);
  const complaint = liveData || initialComplaint || {};
  const { t } = useTranslation();
  const { currentLang, getField } = useDynamicTranslation();

  const comments = complaint.comments || [];
  const concernStatus = getEffectiveConcernStatus(complaint);
  const activeQuery =
    concernStatus === "awaiting_veteran" && comments.length > 0
      ? [...comments].reverse().find((c) => c.authorRole !== "user") || null
      : null;
  const awaitingOfficerReview = concernStatus === "awaiting_officer";
  const flaggedDocs = getConcernDocuments(activeQuery);
  const needsGeneral = concernNeedsGeneral(activeQuery?.concernScope);
  const needsDocuments = concernNeedsDocuments(activeQuery?.concernScope);
  const flaggedDocumentLabels = flaggedDocs.map((d) => d.documentLabel);
  const submittedDocs: any[] = complaint.submittedDocuments || [];
  const submittedResponse = awaitingOfficerReview && comments.length > 0 && comments[comments.length - 1].authorRole === "user"
    ? comments[comments.length - 1] : null;
  const previousQuery = submittedResponse && comments.length > 1
    ? comments[comments.length - 2] : null;

  const goRespond = () => {
    const baseState = {
      grievanceId: complaint._id || complaint.id,
      concernMessage: activeQuery?.message,
      complaint,
      flaggedDocumentLabels,
      flaggedDocuments: flaggedDocs,
      hasDocumentFixes: needsDocuments,
      hasRequiredDocFixes: needsDocuments,
      concernScope: activeQuery?.concernScope,
      form: {
        concernType: "Self",
        caseType: complaint.type,
        caseTypeId: complaint.caseTypeId,
        stationHQ: complaint.stationName,
        description: complaint.description || "",
        armyNumber: complaint.veteranArmyNo || "",
        rank: complaint.veteranRank || "",
      },
    };

    if (needsGeneral) {
      navigate("/user/raise-grievance", {
        state: {
          ...baseState,
          generalConcernMode: true,
          hasDocumentFixes: needsDocuments,
        },
      });
      return;
    }

    navigate("/user/document-checklist", {
      state: {
        ...baseState,
        concernMode: true,
        documentConcernMode: true,
        hasRequiredDocFixes: true,
      },
    });
  };

  const respondStepLabel = needsGeneral
    ? needsDocuments
      ? "Correct Details & Documents — Step 1 of 3"
      : "Correct Details — Step 1 of 3"
    : flaggedDocumentLabels.length > 1
      ? `Fix ${flaggedDocumentLabels.length} Documents — Step 1 of 2`
      : "Fix Document — Step 1 of 2";

  const respondHint = needsGeneral && needsDocuments
    ? "Correct your details and re-upload the flagged documents using the same filing steps."
    : needsGeneral
      ? "Correct your details using the same Step 1–3 flow."
      : flaggedDocumentLabels.length > 1
        ? `Re-upload all ${flaggedDocumentLabels.length} flagged documents.`
        : "Re-upload the corrected document using the same steps as when you filed.";

  const apiBase = getApiBaseUrl().replace("/api", "");

  const timeline = (complaint.timeline?.length > 0 ? complaint.timeline : [
    { status: "pending", note: "Grievance submitted via portal", updatedAt: complaint.createdAt || new Date().toISOString(), eventType: "status" },
  ]).slice().sort(
    (a: any, b: any) => new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()
  );

  const resolveFileUrl = (url: string) =>
    url.startsWith("http") ? url : `${apiBase}${url.startsWith("/") ? url : `/${url}`}`;

  const progressPct =
    complaint.progress ?? grievanceProgressMap[complaint.status] ?? 10;

  return (
    <div className="px-3 space-y-4 pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/user/complaints" className="p-1.5 rounded-full hover:bg-secondary transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Link>
        <h1 className="text-lg font-bold text-foreground">{t("complaintDetails")}</h1>
      </div>

      {/* Basic Info Card */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-[#155DFC] dark:text-[#F0C902] mb-3 tracking-wide">
          {complaint.grievanceId || complaint.id}
        </p>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Icon icon="iconoir:profile-circle" className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{getField(complaint, "type") || complaint.type}</p>
            {complaint.subType && (
              <p className="text-xs text-muted-foreground">· {complaint.subType}</p>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2 bg-secondary/50 px-3 py-2 rounded-xl border border-border">
          <img src="/icons/datecalender.svg" className="w-4 h-4 mt-0.5 invert dark:invert-0 flex-shrink-0" />
        <div>
          <p className="text-xs text-foreground/60">{t("submittedOn")}</p>
          <p className="text-xs font-medium text-foreground">
          {new Date(complaint.createdAt || Date.now()).toLocaleDateString("en-IN", {
          day: "2-digit", month: "long", year: "numeric",
          })}{" "}
          {new Date(complaint.createdAt || Date.now()).toLocaleTimeString("en-IN", {
          hour: "2-digit", minute: "2-digit",
          })}
          </p>
        </div>
        </div>
      </div>

      {/* {awaitingOfficerReview && submittedResponse && (
        <div className="bg-info/10 border border-info/25 rounded-xl p-4 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-info">Response Submitted</p>
            <p className="text-xs mt-0.5">
              Your response has been sent to the officer. They are reviewing it — you will be notified when the concern is resolved.
            </p>
          </div>
        </div>
      )} */}

      {/* ACTIVE QUERY */}
      {activeQuery && (
        <div className="space-y-3">
          <div className="bg-destructive/10 border border-destructive/25 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-destructive">{t("actionRequired")}</p>
              <p className="text-xs mt-0.5">
                {needsGeneral && needsDocuments
                  ? t("correctDetailsAndDocs")
                  : needsDocuments && flaggedDocumentLabels.length > 0
                    ? `Please re-upload: ${flaggedDocumentLabels.join(", ")}`
                    : t("officerRaisedConcern")}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#2c59b8] dark:bg-[#080808] flex items-center justify-center flex-shrink-0">
                  <img src="/icons/comment-dots.svg" className="w-4 h-4" />
                </div>
              <span className="text-sm font-semibold text-foreground">{t("officerConcernLabel")}</span>
              </div>
              <span className="text-[10px] text-foreground">
                {new Date(activeQuery.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "long", year: "numeric",
                })}{" "}
                {new Date(activeQuery.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>

            <div className="bg-secondary/40 rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-semibold bg-destructive/20 text-[#ff1810] dark:text-[#ffff] dark:bg-destructive px-2 py-0.5 rounded-full inline-block">
                {needsGeneral && needsDocuments
                  ? "Details + Documents"
                  : needsDocuments
                    ? flaggedDocumentLabels.length > 1
                      ? `${flaggedDocumentLabels.length} Documents`
                      : "Document Concern"
                    : "General Concern"}
              </span>
              {flaggedDocs.length > 0 && (
                <div className="space-y-1">
                  {flaggedDocs.map((doc, i) => (
                    <p key={i} className="text-xs font-semibold text-primary">{doc.documentLabel}</p>
                  ))}
                </div>
              )}
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {getDisplayText(activeQuery, activeQuery.message, currentLang)}
              </p>
              {activeQuery.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeQuery.attachments.map((url: string, idx: number) => {
                    const fullUrl = resolveFileUrl(url);
                    const isPdf = url.toLowerCase().includes(".pdf");
                    return isPdf ? (
                      <a key={idx} href={fullUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-secondary rounded-lg border border-border text-xs font-medium text-primary">
                        <FileText className="w-3.5 h-3.5" /> {t("viewAttachment")}
                      </a>
                    ) : (
                      <a key={idx} href={fullUrl} target="_blank" rel="noreferrer" className="block">
                        <img src={fullUrl} alt="" className="w-20 h-20 object-cover rounded-lg border border-border" />
                      </a>
                    );
                  })}
                </div>
              )}
              <p className="text-xs font-medium">
                <span className="text-[#2D7FF9]">{t("requestedBy")}</span>
                <span className="font-semibold">
                {activeQuery.authorRole === "admin" ? "Record Officer" : activeQuery.authorName}
              </span>
              </p>
            </div>

            <div className="rounded-lg bg-[#826CF3]/10 border border-[#826CF3]/30 p-2.5 space-y-1.5">
              <p className="text-[11px] text-foreground/80 leading-snug">{respondHint}</p>
              <button
                type="button"
                onClick={goRespond}
                className="w-full py-2 px-3 bg-[#826CF3] text-white text-xs font-semibold rounded-lg shadow-[0_2px_8px_rgba(130,108,243,0.28)] hover:opacity-90 transition-all inline-flex items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5 shrink-0" />
                <span className="text-center leading-tight">{respondStepLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMITTED RESPONSE */}
      {!activeQuery && submittedResponse && previousQuery && (
        <div className="space-y-3">
          <div className= " bg-[] border border-green-500/25 rounded-2xl p-4 flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[#20A13C] flex items-center justify-center flex-shrink-0 mt-0.5">
           <img src="/icons/check-fill.svg" className="w-4 h-4 brightness-0 saturate-0 invert" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#20A13C] dark:text-green-400">{t("responseSubmit")}</p>
              <p className="text-xs mt-0.5">
                {t("responseSharedMsg")}
              </p>
              <p className="text-[10px] mt-1.5 flex items-center gap-1">
                <img src="/icons/datecalender.svg" className="w-5 h-5 invert dark:invert-0" />
                {new Date(submittedResponse.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "long", year: "numeric",
                })}{" "}
                {new Date(submittedResponse.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <Accordion title={t("queryHistory")} defaultOpen={true}>
            <div className="space-y-3">
              <div className="bg-secondary/40 rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full inline-block">
                  Query #01
                </span>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {getDisplayText(previousQuery, previousQuery.message, currentLang)}
                </p>
              </div>

              <div className="border border-border rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#B8B8B8] dark:bg-[#475569] flex items-center justify-center flex-shrink-0">
                    <img src="/icons/profile-fill.svg" className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t("yourResponse")}</span>
                </div>

                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-[12px] font-semibold text-foreground mb-1">{t("responseLabel")}</p>
                  <p className="text-sm text-foreground">{getDisplayText(submittedResponse, submittedResponse.message, currentLang)}</p>
                </div>

                {submittedResponse.attachments?.length > 0 && (
                  <div className="bg-secondary/40 rounded-lg p-3">
                      <p className="text-[12px] font-semibold text-foreground mb-2">{t("uploadedDocLabel")}</p>
                    <div className="flex items-center justify-between bg-white dark:bg-[#1B1B1B] border border-border rounded-xl p-3 shadow-sm">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* <div className="w-10 h-10 flex items-center justify-center rounded-md bg-[#ffff] dark:bg-secondary/90 shrink-0"> */}
                          <img src="/icons/pdf2.svg" alt="PDF" className="w-8 h-8 object-contain" />
                        {/* </div> */}
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                        {submittedResponse.attachments[0].split("/").pop()}
                        </p>
                        <p className="text-[10px] text-foreground mt-0.5">{t("documentLabel")}</p>
                    </div>
                    </div>

                      <a href={submittedResponse.attachments[0].startsWith("http")
                          ? submittedResponse.attachments[0]
                          : `${apiBase}${submittedResponse.attachments[0]}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2 mx-1 bg-[#0051AE] text-white text-xs font-semibold rounded-md hover:opacity-90"
                      >
                        {t("viewBtn")}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Accordion>
        </div>
      )}

      {/* Grievance Details */}
      <Accordion title={t("grievanceDetailsTitle")} defaultOpen={true}>
        <div className="space-y-0">
          {[
            { label: t("concernForDetail"),  value: complaint.veteranName ? "Self" : "Other" },
            { label: t("stationHQ"),    value: complaint.stationName },
            { label: t("rankLabel2"),   value: complaint.veteranRank || "—" },
            { label: t("armyNoLabel"),  value: complaint.veteranArmyNo || "—" },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-none">
              <span className="text-sm font-medium text-foreground">{row.label}</span>
              <span className="text-sm font-medium text-foreground px-3">{row.value}</span>
            </div>
          ))}
          <div className="pt-3">
            <span className="text-sm font-medium text-foreground block mb-1.5">{t("descriptionLabel")}</span>
            <p className="text-xs text-foreground leading-relaxed break-words">
              {getDisplayText(complaint, complaint.description || "—", currentLang)}
            </p>
          </div>
        </div>
      </Accordion>

      {/* Uploaded Documents */}
      <Accordion title={t("uploadedDocuments")} defaultOpen={true}>
        {submittedDocs.length > 0 ? (
          <div className="space-y-2">
            {submittedDocs.map((doc: any) => {
              const fullUrl = resolveFileUrl(doc.fileUrl);
              return (
                <div key={doc.uploadId} className="flex items-center justify-between dark:bg-[#1d1c1c] bg-secondary/20 border border-border rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src="/icons/pdf2.svg" alt="" className="w-8 h-8" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#000000] dark:text-[#ffff] truncate">{doc.documentLabel}</p>
                      <p className="text-[10px] text-foreground truncate">{doc.originalFileName}</p>
                    </div>
                  </div>
                  <a href={fullUrl} target="_blank" rel="noreferrer" className="px-4 py-1.5 bg-[#0051AE] text-white text-xs font-medium rounded-md hover:opacity-90 flex-shrink-0">
                    View
                  </a>
                </div>
              );
            })}
          </div>
        ) : (!complaint.attachments || complaint.attachments.length === 0) ? (
          <p className="text-xs text-muted-foreground text-center py-2">{t("noDocumentsAttached")}</p>
        ) : (
          <div className="space-y-2">
            {complaint.attachments.map((url: string, i: number) => {
              const filename = url.split("/").pop() || "Document.pdf";
              const fullUrl = url.startsWith("http") ? url : `${apiBase}${url}`;
              return (
                <div key={i} className="flex items-center justify-between dark:bg-[#1d1c1c] bg-secondary/20 border border-border rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                      <img src="/icons/pdf2.svg" alt="" className="w-8 h-8" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{filename}</p>
                      <p className="text-[10px] text-muted-foreground">{t("uploadedLabel")}</p>
                    </div>
                  </div>

                  <a href={fullUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 bg-[#0051AE] text-white text-xs font-medium rounded-md hover:opacity-90 flex-shrink-0"
                  >
                    {t("viewBtn")}
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </Accordion>

      {/* Tracking History */}
      <Accordion title={t("trackingHistory")} defaultOpen={true}>
        <div className="space-y-0 pt-1">
          {timeline.map((step: any, i: number) => {
            const isLast = i === timeline.length - 1;
            const isConcern = step.eventType === "concern";
            const isConcernResolved = step.eventType === "concern_resolved";
            const dotColor = isConcern ? "bg-warning" : isConcernResolved ? "bg-green-500" : step.eventType === "veteran_response" ? "bg-[#826CF3]" : "bg-green-500";
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full ${dotColor} flex items-center justify-center flex-shrink-0 z-10`}>
                    {isConcern ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <img src="/icons/check-fill.svg" className="w-4 h-4 text-white" />
                    )}
                  </div>
                  {!isLast && (
                    <div className="w-0.5 flex-1 bg-green-500/30 my-1 min-h-[32px]" />
                  )}
                </div>
                <div className={`flex-1 flex items-start justify-between gap-2 ${!isLast ? "pb-5" : "pb-1"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {timelineStepLabel(step)}
                    </p>
                    {step.note && step.eventType !== "status" && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{getDisplayText(step, step.note, currentLang)}</p>
                    )}
                    {step.concernDocuments?.length > 0 ? (
                      <div className="text-[10px] text-primary mt-1 space-y-0.5">
                        {step.concernDocuments.map((d: any, di: number) => (
                          <p key={di}>Document: {d.documentLabel}</p>
                        ))}
                      </div>
                    ) : step.documentLabel && step.concernScope !== "general" ? (
                      <p className="text-[10px] text-primary mt-1">Document: {step.documentLabel}</p>
                    ) : null}
                    {step.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {step.attachments.map((url: string, idx: number) => {
                          const fullUrl = resolveFileUrl(url);
                          const isPdf = url.toLowerCase().includes(".pdf");
                          return isPdf ? (
                            <a key={idx} href={fullUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline">{t("pdfAttachment")}</a>
                          ) : (
                            <a key={idx} href={fullUrl} target="_blank" rel="noreferrer">
                              <img src={fullUrl} alt="" className="w-14 h-14 object-cover rounded-md border border-border" />
                            </a>
                          );
                        })}
                      </div>
                    )}
                    {step.status === "in-progress" && isLast && step.eventType !== "concern" && (
                      <p className="text-[10px] text-muted-foreground">{t("docsRequiredNote")}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {step.updatedAt
                        ? new Date(step.updatedAt).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "long", year: "numeric",
                          })
                        : "—"}
                      <br />
                      {step.updatedAt
                        ? new Date(step.updatedAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit", minute: "2-digit",
                          })
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Accordion>

    </div>
  );
});
