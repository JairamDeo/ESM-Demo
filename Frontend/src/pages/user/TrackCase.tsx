import { memo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronLeft, FileText, CheckCircle2,
  AlertTriangle, MessageSquare, ChevronDown, ChevronUp, UploadCloud, User, Calendar
} from "lucide-react";
import { useTrackGrievance, useAddComment } from "@/hooks/useApi";
import { getApiBaseUrl } from "@/lib/apiBase";
import { Icon } from "@iconify/react";

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
    const targetId = complaint._id || complaint.id || complaint.grievanceId;
    if (!targetId) return;
    
    const formData = new FormData();
    formData.append("id", targetId);
    formData.append("message", responseText || "(attachment)");
    if (responseFile) formData.append("attachments", responseFile);
    
    try {
      await addComment.mutateAsync(formData);
      setResponseText("");
      setResponseFile(null);
    } catch (error) {
      console.error("Failed to submit response:", error);
    }
  };

  const timeline = complaint.timeline?.length > 0 ? complaint.timeline : [
    { status: "pending", note: "Grievance submitted via portal", updatedAt: complaint.createdAt || new Date().toISOString() },
  ];

  const apiBase = getApiBaseUrl().replace("/api", "");

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
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-[#155DFC] dark:text-[#F0C902] mb-3 tracking-wide">
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
        <div className="flex items-start gap-2 bg-secondary/50 px-3 py-2 rounded-xl border border-border">
          <img src="/icons/datecalender.svg" className="w-4 h-4 mt-0.5 invert dark:invert-0 flex-shrink-0" />
        <div>
          <p className="text-xs text-foreground/60">Submitted on</p>
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

      {/* ACTIVE QUERY */}
      {activeQuery && (
        <div className="space-y-3">
          <div className="bg-destructive/10 border border-destructive/25 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-destructive">Additional Requirement</p>
              <p className="text-xs mt-0.5">Please upload the requested documents to continue.</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#2c59b8] dark:bg-[#080808] flex items-center justify-center flex-shrink-0">
                  <img src="/icons/comment-dots.svg" className="w-4 h-4" />
                </div>
              <span className="text-sm font-semibold text-foreground">Officer Remarks</span>
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
              <span className="text-[10px] font-semibold bg-destructive/20 text-[#ff1810] dark:text-[#ffff]  dark:bg-destructive px-2 py-0.5 rounded-full inline-block">
                Query #01
              </span>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {activeQuery.message}
              </p>
              <p className="text-xs font-medium">
                <span className="text-[#2D7FF9]">Requested By: </span>
                <span className="font-semibold">
                {activeQuery.authorRole === "admin" ? "Record Officer" : activeQuery.authorName}
              </span>
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
                className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none"
              />
              <p className="text-[12px] text-foreground/70 px-1">
                Example: No, the DOB has not been updated in PPO records yet
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Upload Document <span className="text-destructive">*</span>
              </label>
              <label className="flex items-center justify-center gap-4 w-full border-2 border-dashed border-[#2952A3] rounded-xl px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors">
                <UploadCloud className="w-8 h-8 text-[#4F81FF] flex-shrink-0" />
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
                <div className="flex items-center gap-2 px-3 py-3 bg-secondary/10 border border-border rounded-xl text-xs text-foreground">
                  <img src="/icons/pdf2.svg" className="w-4 h-4 " />
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
          <div className= " bg-[] border border-green-500/25 rounded-2xl p-4 flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[#20A13C] flex items-center justify-center flex-shrink-0 mt-0.5">
           <img src="/icons/check-fill.svg" className="w-4 h-4 brightness-0 saturate-0 invert" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#20A13C] dark:text-green-400">Response Submit</p>
              <p className="text-xs mt-0.5">
                Your response and document have been shared with the concerned officer.
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
                  <div className="w-6 h-6 rounded-full bg-[#B8B8B8] dark:bg-[#475569] flex items-center justify-center flex-shrink-0">
                    <img src="/icons/profile-fill.svg" className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Your Response</span>
                </div>

                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-[12px] font-semibold text-foreground mb-1">· Response</p>
                  <p className="text-sm text-foreground">{submittedResponse.message}</p>
                </div>

                {submittedResponse.attachments?.length > 0 && (
                  <div className="bg-secondary/40 rounded-lg p-3">
                    <p className="text-[12px] font-semibold text-foreground mb-2">· Uploaded Document</p>
                    <div className="flex items-center justify-between bg-white dark:bg-[#1A1F33] border border-border rounded-xl p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-md bg-secondary/30">
                          <img src="/icons/pdf2.svg" alt="PDF" className="w-6 h-6 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                          <span className="text-red-500 font-bold text-[10px] absolute" style={{display: 'none'}}>PDF</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground truncate max-w-[160px]">
                            {submittedResponse.attachments[0].split("/").pop()}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Document</p>
                        </div>
                      </div>
                      
                       <a href={submittedResponse.attachments[0].startsWith("http")
                          ? submittedResponse.attachments[0]
                          : `${apiBase}${submittedResponse.attachments[0]}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-[#0051AE] text-white text-xs font-semibold rounded-lg hover:opacity-90"
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
              <span className="text-sm font-medium text-foreground">{row.label}</span>
              <span className="text-sm font-medium text-foreground px-3">{row.value}</span>
            </div>
          ))}
          <div className="pt-3">
            <span className="text-sm font-medium text-foreground block mb-1.5">Description</span>
            <p className="text-xs text-foreground leading-relaxed break-words">
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
                <div key={i} className="flex items-center justify-between dark:bg-[#1d1c1c] bg-secondary/20 border border-border rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                      <img src="/icons/pdf2.svg" alt="" className="w-8 h-8" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{filename}</p>
                      <p className="text-[10px] text-muted-foreground">Uploaded</p>
                    </div>
                  </div>
                  
                   <a href={fullUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 bg-[#0051AE] text-white text-xs font-medium rounded-md hover:opacity-90 flex-shrink-0"
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
        <div className="space-y-0 pt-1">
          {(() => {
            const currentStatus = timeline[timeline.length - 1]?.status || "pending";
            
            // Build full sequence
            const displaySteps = timeline.map((step: any) => ({ ...step, done: true }));
            
            if (currentStatus !== "resolved" && currentStatus !== "closed") {
              if (currentStatus === "pending") {
                displaySteps.push({ status: "acknowledged", done: false });
                displaySteps.push({ status: "in-progress", done: false });
                displaySteps.push({ status: "resolved", done: false });
              } else {
                // If there's an active query from the admin, it means it's reverted
                if (activeQuery) {
                  displaySteps.push({ status: "in-progress", done: false });
                }
                displaySteps.push({ status: "resolved", done: false });
              }
            }

            return displaySteps.map((step: any, i: number) => {
              const isLast = i === displaySteps.length - 1;
              const done = step.done;
              const nextDone = !isLast && displaySteps[i + 1].done;
              
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${done ? "bg-[#22A346]" : "bg-[#5B6676]"}`}>
                      <img src="/icons/check-fill.svg" className="w-3.5 h-3.5 text-white" />
                    </div>
                    {!isLast && (
                      <div className={`w-px flex-1 my-1 min-h-[32px] ${nextDone ? "bg-[#22A346]/40" : "bg-border/60"}`} />
                    )}
                  </div>
                  <div className={`flex-1 flex items-start justify-between ${!isLast ? "pb-5" : "pb-1"}`}>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {step.status === "in-progress" ? "In Progress" : 
                         step.status === "acknowledged" ? "Acknowledged" :
                         STEP_LABELS[step.status] || step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                      </p>
                      {step.status === "in-progress" && done && activeQuery && i === displaySteps.filter((s: any)=>s.done).length - 1 && (
                        <p className="text-xs text-foreground mt-0.5 font-medium">Revert <span className="font-normal">(Documents Required)</span></p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {step.updatedAt && done
                          ? new Date(step.updatedAt).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "long", year: "numeric",
                            })
                          : ""}
                        <br />
                        {step.updatedAt && done
                          ? new Date(step.updatedAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit", minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
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