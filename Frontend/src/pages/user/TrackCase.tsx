import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, FileText, MessageSquare } from "lucide-react";

const STATUS_STEPS = ["pending","in-progress","resolved"] as const;
const STEP_LABELS: Record<string,string> = { pending:"Submitted",  "in-progress":"Under Review", escalated:"Escalated", resolved:"Resolved", closed:"Closed" };

export default memo(function TrackCase() {
  const location = useLocation();
  const complaint = (location.state as any)?.complaint || { grievanceId:"PMS/2026-001", type:"Resolve Pension Issues", status:"in-progress", stationName:"Nagpur HQ" };

  const timeline = complaint.timeline?.length > 0 ? complaint.timeline : [
    { status:"pending", note:"Grievance submitted via portal", updatedBy: complaint.veteranName || "Veteran", updatedAt: complaint.createdAt || new Date().toISOString(), done: true },
    { status:"in-progress", note:"Assigned to station officer", updatedBy:"Admin", updatedAt: complaint.createdAt || new Date().toISOString(), done: complaint.status !== "pending" },
    { status:"resolved", note:"Case will be closed after resolution", updatedBy:"—", updatedAt:"—", done: complaint.status === "resolved" || complaint.status === "closed" },
  ];

  const progressPct = complaint.progress ?? (complaint.status === "resolved" ? 100 : complaint.status === "in-progress" ? 60 : complaint.status === "escalated" ? 55 : 20);
  const circumference = 289;

  return (
    <div className="px-4 space-y-5 animate-fade-in pb-6">
      <div className="flex items-center gap-3">
        <Link to="/user/complaints" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold text-foreground">Track Case</h1>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{complaint.type}</p>
              <p className="text-xs text-muted-foreground">{complaint.grievanceId || complaint.id}</p>
            </div>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${complaint.status === "resolved" ? "bg-success/15 text-success" : complaint.status === "escalated" ? "bg-destructive/15 text-destructive" : "bg-info/15 text-info"}`}>
            {STEP_LABELS[complaint.status] || complaint.status}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Station: {complaint.stationName || complaint.station}</span>
          <span>Priority: {complaint.priority || "Medium"}</span>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative w-28 h-28">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="46" fill="none" stroke="hsl(var(--border))"  strokeWidth="6" />
            <circle cx="56" cy="56" r="46" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(progressPct/100)*circumference} ${circumference}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-primary">{progressPct}%</span>
            <span className="text-[10px] text-muted-foreground">Complete</span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="font-semibold text-sm text-foreground mb-4">Case Timeline</h3>
        <div className="space-y-0">
          {timeline.map((step: any, i: number) => {
            const done = step.done ?? (step.status === "pending" || (step.status === "in-progress" && complaint.status !== "pending") || (step.status === "resolved" && (complaint.status === "resolved" || complaint.status === "closed")));
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-primary/15" : "bg-secondary"}`}>
                    {done ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  {i < timeline.length - 1 && <div className={`w-0.5 h-12 ${done ? "bg-primary/30" : "bg-border"}`} />}
                </div>
                <div className="pb-6">
                  <p className={`text-sm font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>{STEP_LABELS[step.status] || step.status}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{step.updatedAt && step.updatedAt !== "—" ? new Date(step.updatedAt).toLocaleString("en-IN") : step.updatedAt}</p>
                  <p className="text-xs text-muted-foreground mt-1">{step.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center justify-center gap-2 bg-[#826CF3] text-primary-foreground font-semibold py-3 rounded-xl text-sm">
          <MessageSquare className="w-4 h-4" /> Contact Officer
        </button>
        <button className="flex items-center justify-center gap-2 bg-secondary text-foreground font-semibold py-3 rounded-xl text-sm border border-border">
          <FileText className="w-4 h-4" /> Download PDF
        </button>
      </div>
    </div>
  );
});
