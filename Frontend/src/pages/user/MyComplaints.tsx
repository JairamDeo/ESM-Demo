import { useState, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { FileText, Clock, CheckCircle2, AlertTriangle, Search, ChevronLeft, MapPin, Calendar, AlertCircle, ArrowRight } from "lucide-react";
import { useMyGrievances } from "@/hooks/useApi";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useDynamicTranslation } from "@/utils/translationHelper";

interface Complaint {
  [key: string]: unknown;
  _id: string;
  id?: string;
  grievanceId?: string;
  type: string;
  subType?: string;
  status: "pending" | "in-progress" | "resolved" | "escalated" | "closed";
  stationName?: string;
  station?: string;
  createdAt: string;
  hasConcern?: boolean;
  concernStatus?: string;
  requiresDocument?: boolean;
  hasUnreadUpdates?: boolean;
  isResolved?: boolean;
  lastComment?: { createdAt?: string };
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  "in-progress": { label: "Active",    bg: "bg-[#3B82F6]",  text: "text-white" },
  pending:       { label: "Pending",   bg: "bg-[#F65C5F]",  text: "text-white" },
  resolved:      { label: "Resolved",  bg: "bg-[#22C55E]",  text: "text-white" },
  escalated:     { label: "Escalated", bg: "bg-[#F59E0B]",  text: "text-white" },
  closed:        { label: "Closed",    bg: "bg-secondary",  text: "text-muted-foreground" },
};

const TABS = ["All", "Active", "Pending", "Resolved"] as const;
type Tab = typeof TABS[number];

const tabDot: Record<string, string> = {
  Active:   "bg-[#3B82F6]",
  Pending:  "bg-[#F65C5F]",
  Resolved: "bg-[#22C55E]",
};

export default memo(function MyComplaints() {
  const { t } = useTranslation();
  const { getField } = useDynamicTranslation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const { data: complaints = [] as Complaint[], isLoading } = useMyGrievances();

  const stats = useMemo(() => ({
    All:      complaints.length,
    Active:   complaints.filter((c: Complaint) => c.status === "in-progress").length,
    Pending:  complaints.filter((c: Complaint) => c.status === "pending").length,
    Resolved: complaints.filter((c: Complaint) => c.status === "resolved").length,
  }), [complaints]);

  const filtered = useMemo(() => {
    let list = complaints as Complaint[];
    if (activeTab === "Active")   list = list.filter(c => c.status === "in-progress");
    if (activeTab === "Pending")  list = list.filter(c => c.status === "pending");
    if (activeTab === "Resolved") list = list.filter(c => c.status === "resolved");
    if (search) list = list.filter(c =>
      c.type?.toLowerCase().includes(search.toLowerCase()) ||
      (c.grievanceId || c.id)?.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [complaints, activeTab, search]);

  return (
    <div className="px-4 space-y-4 pb-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/user" className="p-1.5 mt-1 rounded-full hover:bg-secondary">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground">{t("myComplaintPage")}</h1>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-secondary dark:bg-secondary/40  rounded-md px-4 py-3">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchIdService")}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors relative flex-1 justify-center`}
          >
            {tabDot[tab] && (
              <span className={`w-2 h-2 rounded-full ${tabDot[tab]} flex-shrink-0`} />
            )}
            {t(`filter${tab}`)}
            {stats[tab] > 0 && tab !== "All" && (
              <span className="text-[10px]">({stats[tab]})</span>
            )}
            {tab === "All" && stats.All > 0 && (
              <span className="text-[10px]">({stats.All})</span>
            )}
            {/* Active underline */}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-40 bg-card rounded-2xl border border-border animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-card border border-border rounded-2xl">
            <div className="relative w-40 h-32 mb-5">
              <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
              <img
                src="/icons/notepad.svg"
                alt=""
                className="absolute left-1/2 top-2 w-14 h-14 -translate-x-[70%] opacity-90"
              />
              <img
                src="/icons/folder.svg"
                alt=""
                className="absolute left-1/2 top-6 w-16 h-16 -translate-x-[10%] opacity-80"
              />
              <img
                src="/icons/Veteran.svg"
                alt=""
                className="absolute bottom-0 left-1/2 w-24 h-auto -translate-x-1/2"
              />
            </div>
            <p className="text-base font-semibold text-foreground">
              {complaints.length === 0 ? t("noComplaintsYet") : t("noResultsFound")}
            </p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-[260px]">
              {complaints.length === 0
                ? t("raiseToTrack")
                : t("tryDifferentSearch")}
            </p>
            {complaints.length === 0 && (
              <Link
                to="/user/services"
                className="mt-5 inline-flex items-center gap-2 bg-[#826CF3] hover:bg-[#7260e0] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                {t("raiseGrievance")}
              </Link>
            )}
          </div>
        ) : filtered.map((c: Complaint) => {
          const config = statusConfig[c.status] || statusConfig.pending;
          return (
            <div key={c._id || c.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4">

                {/* Top row: GRV ID + status badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-[#1754CF] dark:text-[#F0C902] tracking-wide">
                    {c.grievanceId || c.id}
                  </span>
                  <span className={`text-[10px] font-semibold px-3 py-1 rounded-full ${config.bg} ${config.text}`}>
                    {config.label}
                  </span>
                </div>

                {/* Icon + type + subtype */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Icon icon="iconoir:profile-circle" className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">{getField(c, "type") || c.type}</p>
                    {c.subType && (
                      <p className="text-[11px] text-muted-foreground">· {c.subType}</p>
                    )}
                  </div>
                </div>

                {/* Date + Station */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <img src="/icons/datecalender.svg" className="w-5 h-5 invert dark:invert-0" />
                    <span className="text-foreground font-normal">
                      {t("submittedOn")}<br />
                      <span className="text-foreground font-medium">
                       {c.createdAt
                       ? `${new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}  ${new Date(c.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                       : "—"}
                       </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-1 ">
                    <img src="/icons/location1.svg" className="w-5 h-5 invert dark:invert-0" />
                    <span className="text-foreground font-normal">
                      {t("stationHQ")}<br />
                      <span className="text-foreground font-medium">
                       {c.stationName || c.station || "—"}
                    </span>
                    </span>
                  </span>
                </div>

                {/* Officer concern — action required */}
                {(c.hasConcern || c.concernStatus === "awaiting_veteran") && (
                  <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2.5 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-destructive">{t("actionRequired")}</p>
                      <p className="text-[10px] text-destructive/80">{t("officerRaisedConcern")}</p>
                    </div>
                  </div>
                )}

                {/* Additional document required banner — shown dynamically */}
                {c.requiresDocument && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5 mb-3">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-500">{t("additionalDocRequired")}</p>
                      <p className="text-[10px] text-red-400">{t("pleaseAttachRequired")}</p>
                    </div>
                  </div>
                )}

                {/* Divider + View Details */}
                <Link
                  to="/user/track-case"
                  state={{ complaint: c }}
                  className="-mx-4 px-4 pt-3 border-t border-border flex items-center justify-between hover:bg-secondary/40 transition-colors"
                >
                  <span className="text-xs font-medium text-foreground">{t("viewDetails")}</span>
                  <ArrowRight className="w-5 h-5 text-foreground" />
                </Link>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});