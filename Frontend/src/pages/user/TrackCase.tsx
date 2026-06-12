import { memo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronLeft, FileText, CheckCircle2,
  AlertTriangle, MessageSquare, ChevronDown, ChevronUp, Upload, User, Calendar
} from "lucide-react";
import { useTrackGrievance, useAddComment } from "@/hooks/useApi";
import { getApiBaseUrl } from "@/lib/apiBase";
import { Icon } from "@iconify/react";
import { AnimatedCircularProgress, grievanceProgressMap } from "@/components/AnimatedCircularProgress";

const STEP_LABELS: Record<string, string> = {
  pending: "Submitted",
  "in-progress": "In Progress",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
};

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

export default memo(function TrackCase() {
  const location = useLocation();
  const initialComplaint = (location.state as any)?.complaint;
  const grievanceId = initialComplaint?._id || initialComplaint?.id || "";

  const { data: liveData } = useTrackGrievance(grievanceId);
  const complaint = liveData || initialComplaint || {};

  const addComment = useAddComment();
  const [responseText, setResponseText] = useState("");
  const [responseFile, setResponseFile] = useState<File | null>(null);

  const comments = complaint.comments || [];
  const activeQuery = comments.length > 0 && comments[comments.length - 1].authorRole !== "user"
    ? comments[comments.length - 1] : null;
  const submittedResponse = comments.length > 0 && comments[comments.length - 1].authorRole === "user"
    ? comments[comments.length - 1] : null;
  const previousQuery = submittedResponse && comments.length > 1
    ? comments[comments.length - 2] : null;

  const handleSubmitResponse = async () => {
    if (!responseText.trim() && !responseFile) return;
    if (!complaint._id) return;
    const formData = new FormData();
    formData.append("id", complaint._id);
    formData.append("message", responseText || "(attachment)");
    if (responseFile) formData.append("attachments", responseFile);
    await addComment.mutateAsync(formData);
    setResponseText("");
    setResponseFile(null);
  };

  const timeline = complaint.timeline?.length > 0 ? complaint.timeline : [
    { status: "pending", note: "Grievance submitted via portal", updatedAt: complaint.createdAt || new Date().toISOString() },
  ];

  const apiBase = getApiBaseUrl().replace("/api", "");
  const progressPct =
    complaint.progress ?? grievanceProgressMap[complaint.status] ?? 10;

  return (
    <div className="px-3 space-y-4 pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/user/complaints"
          className="p-1.5 rounded-full hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Complaint Details</h1>
      </div>

      {/* Basic Info Card */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs font-semibold text-amber-500 dark:text-[#F0C902] mb-3 tracking-wide">
          {complaint.grievanceId || complaint.id}
        </p>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Icon icon="iconoir:profile-circle" className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{complaint.type}</p>
            {complaint.subType && (
              <p className="text-xs text-muted-foreground">· {complaint.subType}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-2 rounded-xl border border-border">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Submitted on{" "}
            {new Date(complaint.createdAt || Date.now()).toLocaleDateString("en-IN", {
              day: "2-digit", month: "long", year: "numeric",
            })}{" "}
            {new Date(complaint.createdAt || Date.now()).toLocaleTimeString("en-IN", {
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* ACTIVE QUERY */}
      {activeQuery && (
        <div className="space-y-3">
          <div className="bg-destructive/10 border border-destructive/25 rounded-2xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-destructive">Additional Requirement</p>
              <p className="text-xs text-destructive/80 mt-0.5">Please upload the requested documents to continue.</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Officer Remarks</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(activeQuery.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "long", year: "numeric",
                })}{" "}
                {new Date(activeQuery.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>

            <div className="bg-secondary/40 rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full inline-block">
                Query #01
              </span>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {activeQuery.message}
              </p>
              <p className="text-xs text-primary font-medium">
                Requested By: {activeQuery.authorRole === "admin" ? "Record Officer" : activeQuery.authorName}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Your Response <span className="text-destructive">*</span>
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={3}
                placeholder="Enter your response here..."
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none"
              />
              <p className="text-[10px] text-muted-foreground px-1">
                Example: No, the DOB has not been updated in PPO records yet
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Upload Document <span className="text-destructive">*</span>
              </label>
              <label className="flex items-center gap-4 w-full border-2 border-dashed border-[#2952A3] rounded-xl px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors">
                <Upload className="w-6 h-6 text-[#4F81FF] flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Upload Document</p>
                  <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, PDF (Max 5 MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setResponseFile(e.target.files?.[0] || null)}
                />
              </label>
              {responseFile && (
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-xl text-xs text-foreground">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  {responseFile.name}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBMITTED RESPONSE */}
      {!activeQuery && submittedResponse && previousQuery && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-4 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">Response Submit</p>
              <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">
                Your response and document have been shared with the concerned officer.
              </p>
              <p className="text-[10px] text-green-600/60 dark:text-green-400/60 mt-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(submittedResponse.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "long", year: "numeric",
                })}{" "}
                {new Date(submittedResponse.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <Accordion title="Query History" defaultOpen={true}>
            <div className="space-y-3">
              <div className="bg-secondary/40 rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full inline-block">
                  Query #01
                </span>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {previousQuery.message}
                </p>
              </div>

              <div className="border border-border rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Your Response</span>
                </div>

                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">· Response</p>
                  <p className="text-sm text-foreground">{submittedResponse.message}</p>
                </div>

                {submittedResponse.attachments?.length > 0 && (
                  <div className="bg-secondary/40 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2">· Uploaded Document</p>
                    <div className="flex items-center justify-between bg-card border border-border rounded-xl p-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white dark:bg-[#2a2a2a] rounded-lg flex items-center justify-center border border-border">
                          <span className="text-red-500 font-bold text-[10px]">PDF</span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground truncate max-w-[120px]">
                            {submittedResponse.attachments[0].split("/").pop()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Document</p>
                        </div>
                      </div>

                      <a href={submittedResponse.attachments[0].startsWith("http")
                          ? submittedResponse.attachments[0]
                          : `${apiBase}${submittedResponse.attachments[0]}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-1.5 bg-[#0051AE] text-white text-xs font-medium rounded-lg hover:opacity-90"
                      >
                        View
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
      <Accordion title="Grievance Details" defaultOpen={true}>
        <div className="space-y-0">
          {[
            { label: "Concern for", value: complaint.veteranName ? "Self" : "Other" },
            { label: "Station HQ",  value: complaint.stationName },
            { label: "Rank",        value: complaint.veteranRank || "—" },
            { label: "Army No",     value: complaint.veteranArmyNo || "—" },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-none">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm font-medium text-foreground">{row.value}</span>
            </div>
          ))}
          <div className="pt-3">
            <span className="text-sm text-muted-foreground block mb-1.5">Description</span>
            <p className="text-sm text-foreground leading-relaxed break-words">
              {complaint.description || "—"}
            </p>
          </div>
        </div>
      </Accordion>

      {/* Uploaded Documents */}
      <Accordion title="Uploaded Documents" defaultOpen={true}>
        {(!complaint.attachments || complaint.attachments.length === 0) ? (
          <p className="text-xs text-muted-foreground text-center py-2">No documents attached.</p>
        ) : (
          <div className="space-y-2">
            {complaint.attachments.map((url: string, i: number) => {
              const filename = url.split("/").pop() || "Document.pdf";
              const fullUrl = url.startsWith("http") ? url : `${apiBase}${url}`;
              return (
                <div key={i} className="flex items-center justify-between bg-secondary border border-border rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-white dark:bg-[#2a2a2a] rounded-lg flex items-center justify-center border border-border flex-shrink-0">
                      <span className="text-red-500 font-bold text-[10px]">PDF</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{filename}</p>
                      <p className="text-[10px] text-muted-foreground">Uploaded</p>
                    </div>
                  </div>

                  <a href={fullUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 bg-[#0051AE] text-white text-xs font-medium rounded-lg hover:opacity-90 flex-shrink-0"
                  >
                    View
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </Accordion>

      {/* Tracking History */}
      <Accordion title="Tracking History" defaultOpen={true}>
        <div className="flex gap-4">
          <div className="flex-1 space-y-0 pt-1">
            {timeline.map((step: any, i: number) => {
              const isLast = i === timeline.length - 1;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 z-10">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-green-500/30 my-1 min-h-[32px]" />
                    )}
                  </div>
                  <div className={`flex-1 flex items-start justify-between ${!isLast ? "pb-5" : "pb-1"}`}>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {STEP_LABELS[step.status] || step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                      </p>
                      {step.status === "in-progress" && isLast && (
                        <p className="text-[10px] text-muted-foreground">(Documents Required)</p>
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

          <div className="flex flex-col items-center justify-center shrink-0">
            <AnimatedCircularProgress
              progress={progressPct}
              size="lg"
              subtitle="Complete"
            />
          </div>
        </div>
      </Accordion>

      {/* Submit Response Button */}
      {activeQuery && (
        <button
          onClick={handleSubmitResponse}
          disabled={addComment.isPending || (!responseText.trim() && !responseFile)}
          className="w-full py-4 bg-[#826CF3] text-white font-bold rounded-xl shadow-[0_4px_16px_rgba(130,108,243,0.35)] transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
        >
          {addComment.isPending ? (
            <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            "Submit Response"
          )}
        </button>
      )}

    </div>
  );
});
