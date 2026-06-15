import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileEdit } from "lucide-react";
import { Icon } from "@iconify/react";
import { useMyGrievances } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedCircularProgress, grievanceProgressMap } from "@/components/AnimatedCircularProgress";
import { useGrievanceDraft } from "@/hooks/useGrievanceDraft";
import { getDraftContinueRoute, beginDraftResume, getDraftStepLabel } from "@/lib/grievanceDraft";

const statusBadge: Record<string, string> = {
  resolved: "bg-[#22C55E]",
  "in-progress": "bg-[#3B82F6]",
  escalated: "bg-[#F59E0B]",
  pending: "bg-[#F65C5F]",
};

const statusLabel: Record<string, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  escalated: "Escalated",
  resolved: "Resolved",
};

function formatComplaintDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} ${time}`;
}

function getCategoryLabel(complaint: any) {
  return (
    complaint?.categoryName ||
    (typeof complaint?.category === "object" ? complaint?.category?.name : null) ||
    complaint?.category ||
    "Identity & Personal"
  );
}

const ViewPill = ({
  label,
  bg,
  textColor,
  arrowBg,
}: {
  label: string;
  bg: string;
  textColor: string;
  arrowBg: string;
}) => (
  <span className={`relative inline-flex items-center justify-evenly w-[142px] h-9 rounded-sm ${bg}`}>
    <span className={`text-[15px] font-semibold leading-5 pr-4 ${textColor}`}>{label}</span>
    <span
      className={`absolute right-4 top-1/2 -translate-y-1/2 w-[25px] h-[25px] rounded-full flex items-center justify-center ${arrowBg}`}
    >
      <ArrowRight className="w-4 h-4 text-white" strokeWidth={2.5} />
    </span>
  </span>
);

const RecentComplaintCard = ({
  complaint,
  progress,
}: {
  complaint: any;
  progress: number;
}) => (
  <section className="pt-1">
    <h2 className="text-foreground text-base font-bold leading-5 tracking-[0.01em] mb-3 px-1">
      Recent Complaint
    </h2>

    {complaint ? (
      <div className="bg-card border border-border dark:bg-[#2B2B2B] dark:border-l dark:border-l-[#F65C5F] dark:border-y-0 dark:border-r-0 rounded-lg overflow-hidden">
        <div className="px-[19px] pt-2.5 pb-3 relative">
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[#1754CF] dark:text-[#F0C902] text-[13px] font-medium leading-[23px]">
              {complaint.grievanceId}
            </span>
            <span
              className={`shrink-0 px-3 py-[3px] rounded-[15px] text-white text-xs font-medium leading-5 ${
                statusBadge[complaint.status] ?? statusBadge.pending
              }`}
            >
              {statusLabel[complaint.status] ?? complaint.status}
            </span>
          </div>

          <div className="flex items-start gap-2 mb-4">
            <div className="flex-1 min-w-0 bg-secondary/60 dark:bg-[#353535] rounded-[5px] px-3 py-3 flex gap-3">
              <div className="w-11 h-11 rounded-full bg-[#D2E5FC] flex items-center justify-center shrink-0">
                <img src="/icons/profile-filled.svg" alt="" className="w-7 h-7" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-foreground text-base font-semibold leading-5 tracking-[0.01em] truncate">
                  {getCategoryLabel(complaint)}
                </p>
                <p className="text-foreground text-sm font-medium leading-5 tracking-[0.01em] mt-1 truncate">
                  {complaint.type || "Grievance"}
                </p>
              </div>
            </div>
            <div className="shrink-0 pt-1">
              <AnimatedCircularProgress progress={progress} />
            </div>
          </div>

          <div className="flex justify-between gap-3 mb-4 px-0.5">
            <div className="flex gap-2 min-w-0">
              <img
                src="/icons/datecalender.svg"
                alt=""
                className="w-6 h-6 shrink-0 invert dark:invert-0"
              />
              <div>
                <p className="text-foreground/60 text-xs font-medium leading-5">Submitted on</p>
                <p className="text-foreground text-xs font-medium leading-5">
                  {complaint.createdAt ? formatComplaintDate(complaint.createdAt) : "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 min-w-0 ">
              <img
                src="/icons/location1.svg"
                alt=""
                className="w-5 h-5 shrink-0 invert dark:invert-0  mt-0.5"
              />
              <div>
                <p className="text-foreground/60 text-xs font-medium leading-5">Station HQ</p>
                <p className="text-foreground text-xs font-medium leading-5 text-left">
                  {complaint.stationName || complaint.station || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border dark:border-[#434343]/50 pt-3">
            <Link
              to="/user/track-case"
              state={{ complaint }}
              className="flex items-center justify-between group hover:bg-secondary/40 dark:hover:bg-transparent -mx-1 px-1 rounded-lg transition-colors"
            >
              <span className="text-foreground dark:text-[#E2E8F0] text-sm font-medium leading-[23px] pl-4">
                View Details
              </span>
              <ArrowRight className="w-6 h-6 text-foreground dark:text-[#E2E8F0] mr-1 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    ) : (
      <div className="bg-card border border-border dark:bg-[#2B2B2B] dark:border-l dark:border-l-[#434343] dark:border-y-0 dark:border-r-0 rounded-lg py-10 text-center">
        <Icon icon="iconoir:doc-magnifying-glass" className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No complaints yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Raise a grievance to see it here</p>
      </div>
    )}
  </section>
);

const popularServices = [
  {
    icon: "/icons/profile-filled.svg",
    bg: "bg-[#D2E5FC]",
    label: "Identity &\nPersonal",
  },
  {
    icon: "/icons/money-rupee.svg",
    bg: "bg-[#FDE7E7]",
    label: "Pension &\nFinancial",
  },
  {
    icon: "/icons/family.svg",
    bg: "bg-[#E8FDE7]",
    label: "Family\nDetails",
  },
  {
    icon: "/icons/seal-check.svg",
    bg: "bg-[#FFFFE4]",
    label: "Requests &\nTracking",
  },
];

export default memo(function UserHome() {
  const { user } = useAuth();
  const { data: complaints = [] } = useMyGrievances();

  const recentComplaint = useMemo(() => complaints[0] ?? null, [complaints]);
  const progress = recentComplaint
    ? (grievanceProgressMap[recentComplaint.status] ?? 10)
    : 10;

  const draft = useGrievanceDraft(user?.id);
  const draftRoute = draft ? getDraftContinueRoute(draft) : null;

  return (
    <div className="font-['Montserrat',sans-serif] min-h-full px-3 pb-8 space-y-5 mt-2">

      {/* Hero — brand banner stays dark in both themes */}
      <div className="relative w-full min-h-[208px] rounded-xl bg-[#0C2440] overflow-hidden">
        <div
          className="absolute pointer-events-none"
          style={{
            left: "69%",
            top: "-12%",
            width: "45%",
            height: "78%",
            background: "rgba(91, 77, 219, 0.3)",
            filter: "blur(30px)",
          }}
        />
        <div className="relative z-10 flex h-full min-h-[208px]">
          <div className="flex-1 min-w-0 pl-[17px] pr-1 pt-4 pb-4 flex flex-col justify-between max-w-[58%]">
            <div>
              <h1 className="text-white text-lg font-semibold leading-7 tracking-[0.01em]">
                <span className="block whitespace-nowrap">All Your Grievance</span>
                <span className="block whitespace-nowrap">Services in One Place</span>
              </h1>
              <p className="text-white/80 text-xs font-medium leading-5 tracking-[0.01em] mt-2">
                <span className="block whitespace-nowrap">Raise complaints, track status, and</span>
                <span className="block whitespace-nowrap">get timely updates with ease.</span>
              </p>
            </div>
            <Link
              to="/user/services"
              className="inline-flex items-center whitespace-nowrap bg-[#E9B753] hover:bg-[#d9a743] text-black text-[15px] font-semibold leading-5 tracking-[0.01em] pl-9 pr-4 py-2 rounded-lg w-fit relative transition-colors mt-3"
            >
              <img
                src="/icons/notes-outline.svg"
                alt=""
                className="w-6 h-6 absolute left-2 top-1/2 -translate-y-1/2 shrink-0"
              />
              Raise Grievance
            </Link>
          </div>
          <div className="w-[38%] flex items-end justify-end shrink-0">
            <img
              src="/icons/Veteran.svg"
              alt=""
              className="h-[204px] w-auto object-contain object-bottom"
            />
          </div>
        </div>
      </div>

      {draft && draftRoute && (
        <Link
          to={draftRoute.pathname}
          state={draftRoute.state}
          onClick={beginDraftResume}
          className="flex items-center gap-3 bg-[#826CF3]/10 border border-[#826CF3]/30 dark:bg-[#323232] dark:border-[#434343]/60 rounded-lg px-4 py-3 hover:bg-[#826CF3]/15 dark:hover:bg-[#3a3a3a] transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-[#826CF3]/20 dark:bg-[#826CF3]/25 flex items-center justify-center shrink-0">
            <FileEdit className="w-5 h-5 text-[#826CF3]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Continue your draft</p>
            <p className="text-xs text-muted-foreground truncate">
              {draft.form.caseType || "Grievance"} · {getDraftStepLabel(draft.step)}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#826CF3] shrink-0" />
        </Link>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/user/complaints"
          className="bg-card border border-border dark:bg-[#2B2B2B] dark:border-transparent rounded-xl flex flex-col items-center text-center px-3 pt-1.5 pb-4 min-h-[194px] hover:border-primary/30 dark:hover:bg-[#323232] transition-colors"
        >
          <div className="w-[47px] h-[47px] rounded-full bg-[#D2E5FC] flex items-center justify-center mt-1.5 mb-2">
            <img src="/icons/notepad.svg" alt="" className="w-6 h-6" />
          </div>
          <p className="text-foreground text-[15px] font-bold leading-[25px] tracking-[0.01em]">
            My Complaints
          </p>
          <p className="text-muted-foreground dark:text-white/80 text-xs font-medium leading-[17px] tracking-[0.01em] text-center mt-1 mb-4 max-w-[127px]">
            View and track your complaints
          </p>
          <ViewPill
            label="View"
            bg="bg-[#D2E5FC]"
            textColor="text-[#172EFF]"
            arrowBg="bg-[#1754CF]"
          />
        </Link>

        <Link
          to="/user/services"
          className="bg-card border border-border dark:bg-[#2B2B2B] dark:border-transparent rounded-xl flex flex-col items-center text-center px-3 pt-1.5 pb-4 min-h-[194px] hover:border-[#9D7327]/40 dark:hover:bg-[#323232] transition-colors"
        >
          <div className="w-[47px] h-[47px] rounded-full bg-[#FDF6E7] flex items-center justify-center mt-1.5 mb-2">
            <img src="/icons/category.svg" alt="" className="w-6 h-6" />
          </div>
          <p className="text-foreground text-[15px] font-bold leading-[25px] tracking-[0.01em]">
            Services
          </p>
          <p className="text-muted-foreground dark:text-white/80 text-xs font-medium leading-[17px] tracking-[0.01em] text-center mt-1 mb-4 max-w-[127px]">
            Explore all available services
          </p>
          <ViewPill
            label="View"
            bg="bg-[#FDF6E7]"
            textColor="text-[#9D7327]"
            arrowBg="bg-[#9D7327]"
          />
        </Link>
      </div>

      <RecentComplaintCard complaint={recentComplaint} progress={progress} />

      {/* Popular Services */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-foreground text-base font-bold leading-5 tracking-[0.01em]">
            Popular Services
          </h2>
          <Link
            to="/user/services"
            className="text-[#0d56e9] dark:text-[#9BBCFF] text-[15px] font-semibold leading-5 tracking-[0.01em] hover:opacity-80"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {popularServices.map((svc) => (
            <Link
              key={svc.label}
              to="/user/services"
              className="bg-card border border-border dark:bg-[#323232] dark:border-transparent rounded-lg shadow-[0_4px_23px_rgba(0,0,0,0.05)] flex items-center gap-3 px-3 min-h-[67px] hover:border-primary/20 dark:hover:bg-[#3a3a3a] transition-colors"
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${svc.bg}`}
              >
                <img src={svc.icon} alt="" className="w-7 h-7 object-contain" />
              </div>
              <p className="text-foreground text-sm font-semibold leading-5 tracking-[0.01em] whitespace-pre-line">
                {svc.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer tagline */}
      <div className="pt-2 pb-1 px-1">
        <p className="text-2xl font-bold leading-8 tracking-[0.01em] text-foreground/30 dark:text-white/48">
          Fast, transparent
          <br />
          grievance resolution
        </p>
      </div>
    </div>
  );
});

