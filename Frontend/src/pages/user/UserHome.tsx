import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileEdit } from "lucide-react";
import { Icon } from "@iconify/react";
import { useMyGrievances } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedCircularProgress, grievanceProgressMap } from "@/components/AnimatedCircularProgress";
import { useGrievanceDraft } from "@/hooks/useGrievanceDraft";
import { getDraftContinueRoute, beginDraftResume } from "@/lib/grievanceDraft";

const statusStyles: Record<string, string> = {
  resolved:      "bg-[#22C55E] text-[#FFFFFF]",
  "in-progress": "bg-[#3B82F6] text-[#FFFFFF]",
  escalated:     "bg-[#F59E0B] text-[#FFFFFF]",
  pending:       "bg-[#F65C5F] text-[#FFFFFF]",
};

const statusLabel: Record<string, string> = {
  pending:      "Pending",
  "in-progress":"In Progress",
  escalated:    "Escalated",
  resolved:     "Resolved",
};

// ─── Recent Complaint Card ────────────────────────────────────────────────────
const RecentComplaintCard = ({
  complaint,
  progress,
}: {
  complaint: any;
  progress: number;
}) => (
  <section>
    <h2 className="text-base font-bold text-foreground mb-3">Recent Complaint</h2>
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {complaint ? (
        <div className="p-4">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#1754CF] dark:text-[#F0C902] tracking-wide">
              {complaint.grievanceId}
            </span>
            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize
              ${statusStyles[complaint.status] ?? statusStyles.pending}`}>
              {statusLabel[complaint.status] ?? complaint.status}
            </span>
          </div>

          {/* Body */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Icon icon="iconoir:profile-circle" className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {complaint.type || "Grievance"}
                  </p>
                  {complaint.subType && (
                    <p className="text-[10px] text-muted-foreground">· {complaint.subType}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-10 text-[10px] text-foreground">
                {complaint.createdAt && (
                  <span className="flex items-center gap-1">
                    <img src="./icons/datecalender.svg" className="w-4 h-4 invert dark:invert-0" />
                    {new Date(complaint.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "long", year: "numeric",
                    })}&nbsp;
                    {new Date(complaint.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                )}
                {complaint.stationName && (
                  <span className="flex items-center gap-1">
                    <img src="./icons/location1.svg" className="w-4 h-4 invert dark:invert-0" />
                    {complaint.stationName}
                  </span>
                )}
              </div>
            </div>
            <AnimatedCircularProgress progress={progress} />
          </div>

          <Link
            to="/user/track-case"
            state={{ complaint }}
            className="mt-4 pt-3 border-t border-border flex items-center justify-between hover:bg-secondary/40 -mx-4 px-4 pb-0 transition-colors"
          >
            <span className="text-xs font-medium text-foreground">View Details</span>
            <ArrowRight className="w-5 h-5 text-foreground" />
          </Link>
        </div>
      ) : (
        <div className="py-8 text-center space-y-1">
          <Icon icon="iconoir:doc-magnifying-glass" className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No complaints yet.</p>
          <p className="text-xs text-muted-foreground/60">Raise a grievance to see it here</p>
        </div>
      )}
    </div>
  </section>
);

// ─── Popular Services ─────────────────────────────────────────────────────────
const popularServices = [
  {
    icon: <img src="./icons/profile-filled.svg" />,
    bg: "bg-[#D2E5FC]",
    label: "Identity &\nPersonal",
  },
  {
    icon: <img src="./icons/money-rupee.svg" />,
    bg: "bg-[#FDE7E7]",
    label: "Pension &\nFinancial",
  },
  {
    icon: <img src="./icons/family.svg" />,
    bg: "bg-[#E8FDE7]",
    label: "Family\nDetails",
  },
  {
    icon: <img src="./icons/seal-check.svg" />,
    bg: "bg-[#FFFFE4]",
    label: "Requests &\nTracking",
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default memo(function UserHome() {
  const { user } = useAuth();
  const { data: complaints = [] } = useMyGrievances();

  const recentComplaint = useMemo(() => complaints[0] ?? null, [complaints]);
  const progress = recentComplaint
    ? (grievanceProgressMap[recentComplaint.status] ?? 10)
    : 80;

  const draft = useGrievanceDraft(user?.id);
  const draftRoute = draft ? getDraftContinueRoute(draft) : null;

  return (
    <div className="w-full max-w-xl mx-auto px-3 lg:max-w-none lg:px-6 space-y-5 pb-6">

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="w-full rounded-2xl overflow-hidden relative "
  style={{
    background: "radial-gradient(ellipse at top right, #2d2d7a 0%, #0C2440 70%)",
  }}
>
  <div className="relative z-10 flex items-stretch justify-between px-4 pt-1 ">
    
    {/* Text side */}
    <div className="flex-1 pr-2 flex flex-col justify-center pb-2">
      <h1 className="text-white text-base font-bold leading-snug mb-1.5">
        All Your Grievance<br />Services in One Place
      </h1>
      <p className="text-white/60 text-[11px] leading-relaxed mb-4">
        Raise complaints, track status, and get timely updates with ease.
      </p>
      <Link
        to="/user/services"
        className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 transition-colors text-black text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg w-fit"
      >
        <img src="./icons/notes-outline.svg" className="w-5 h-5" />
        Raise Grievance
      </Link>
    </div>

    {/* Image side */}
    <div className="w-[38%] flex-shrink-0 flex items-end justify-center  ">
      <img src="/icons/Veteran.svg" alt="Veteran illustration" className="w-full h-auto"/>
    </div>

  </div>
</div>

      {draft && draftRoute && (
        <Link
          to={draftRoute.pathname}
          state={draftRoute.state}
          onClick={beginDraftResume}
          className="flex items-center gap-3 bg-[#826CF3]/10 border border-[#826CF3]/30 rounded-xl px-4 py-3 hover:bg-[#826CF3]/15 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-[#826CF3]/20 flex items-center justify-center shrink-0">
            <FileEdit className="w-5 h-5 text-[#826CF3]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Continue draft grievance</p>
            <p className="text-xs text-muted-foreground truncate">
              {draft.form.caseType || "In progress"} · saved{" "}
              {new Date(draft.savedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#826CF3] shrink-0" />
        </Link>
      )}

      {/* ── Quick Action Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 ">

       {/* My Complaints */}
      <Link
      to="/user/complaints" className="group bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-[#4d84f2] transition-all hover:shadow-sm" style={{ minHeight: 130 }}
>
      <div className="w-10 h-10 rounded-full bg-[#D2E5FC] flex items-center justify-center mb-3">
            <img src="/icons/notepad.svg" alt="" className="w-5 h-5" />
      </div>
            <p className="text-sm font-bold text-foreground mb-1.5">My Complaints</p>
            <p className="text-[10px] font-normal text-foreground leading-tight mb-3">
             View and track your complaints
            </p>
            <span className="inline-flex items-center gap-3.5 bg-[#D2E5FC] border border-secondary text-[#172EFF] text-[16px] font-semibold px-10 py-2 rounded-lg group-hover:bg-[#4d84f2] group-hover:text-white transition-all">
             View <img src="./icons/right-arrow.svg" className="w-4 h-4  invert dark:invert-40" />
            </span>
      </Link>

       {/* Services */}
      <Link
      to="/user/services" className="group bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-[#9D7327] transition-all hover:shadow-sm" style={{ minHeight: 130 }}
>
  <div className="w-10 h-10 rounded-full bg-[#FDF6E7] flex items-center justify-center mb-3">
    <img src="./icons/category.svg" className="w-5 h-5" />
  </div>
  <p className="text-sm font-bold text-foreground mb-1.5">Services</p>
  <p className="text-[10px] font-normal text-foreground leading-tight mb-3">
    Explore all available services here
  </p>
  <span className="inline-flex items-center gap-3.5 bg-[#FDF6E7] border border-secondary text-[#9D7327] text-[16px] font-semibold px-10 py-2  rounded-lg group-hover:bg-[#dfb86f] group-hover:text-black transition-all">
    View <img src="./icons/right-arrow.svg" className="w-4 h-4 invert dark:invert-40" />
  </span>
</Link>
      </div>
      {/* ── Recent Complaint ─────────────────────────────────────────────── */}
      <RecentComplaintCard complaint={recentComplaint} progress={progress} />

      {/* ── Popular Services ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Popular Services</h2>
          <Link to="/user/services" className="text-xs font-semibold text-[#0d56e9] dark:text-[#8aaffa] hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {popularServices.map((svc) => (
            <Link
              key={svc.label}
              to="/user/services"
              className="group bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 hover:border-border/60 hover:shadow-sm transition-all"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${svc.bg}`}>
                {svc.icon}
              </div>
              <p className="text-xs font-semibold text-foreground leading-tight whitespace-pre-line">
                {svc.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Footer tagline ───────────────────────────────────────────────── */}
      <div className="pt-1 pb-2">
        <p className="text-2xl font-extrabold text-foreground/30 dark:text-foreground/40 leading-tight">
          Fast, transparent<br />grievance resolution
        </p>
      </div>

    </div>
  );
});