import { memo, useCallback, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronLeft,
  Inbox,
  Sparkles,
} from "lucide-react";
import { useNotifications, useMarkNotificationRead } from "@/hooks/useApi";
import { useTranslation } from "react-i18next";

type StatusFilter = "all" | "unread" | "read";

const typeConfig: Record<string, { icon: typeof Bell; accent: string; bg: string }> = {
  grievance_update: { icon: FileText, accent: "text-[#4F81FF]", bg: "bg-[#4F81FF]/15" },
  escalation: { icon: AlertTriangle, accent: "text-amber-500", bg: "bg-amber-500/15" },
  resolved: { icon: CheckCircle2, accent: "text-emerald-500", bg: "bg-emerald-500/15" },
  assignment: { icon: FileText, accent: "text-[#826CF3]", bg: "bg-[#826CF3]/15" },
  system: { icon: Sparkles, accent: "text-muted-foreground", bg: "bg-secondary" },
};

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
];

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function groupByPeriod(items: any[]) {
  const todayStart = startOfDay();
  const weekStart = daysAgo(7);
  const monthStart = daysAgo(30);

  const today: any[] = [];
  const thisWeek: any[] = [];
  const thisMonth: any[] = [];
  const older: any[] = [];

  for (const n of items) {
    const date = new Date(n.createdAt);
    if (date >= todayStart) today.push(n);
    else if (date >= weekStart) thisWeek.push(n);
    else if (date >= monthStart) thisMonth.push(n);
    else older.push(n);
  }

  return [
    { key: "today", label: "Today", items: today },
    { key: "week", label: "This Week", items: thisWeek },
    { key: "month", label: "This Month", items: thisMonth },
    { key: "older", label: "Older", items: older },
  ].filter((g) => g.items.length > 0);
}

function emptyMessage(status: StatusFilter, isAdminPortal: boolean): string {
  if (status === "unread") return "No unread notifications.";
  if (status === "read") return "No read notifications yet.";
  return isAdminPortal
    ? "Updates about grievances, escalations, and announcements will appear here."
    : "Updates about your grievances will appear here.";
}

export default memo(function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPortal = !location.pathname.startsWith("/user");
  const [status, setStatus] = useState<StatusFilter>("all");
  const { data, isLoading } = useNotifications(false);
  const markRead = useMarkNotificationRead();

  const allNotifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  const filtered = useMemo(() => {
    return allNotifications.filter((n: any) => {
      if (status === "unread" && n.isRead) return false;
      if (status === "read" && !n.isRead) return false;
      return true;
    });
  }, [allNotifications, status]);

  const sections = useMemo(() => groupByPeriod(filtered), [filtered]);

  const handleMarkAllRead = useCallback(() => {
    markRead.mutate("all");
  }, [markRead]);

  const handleOpen = useCallback(
    (n: any) => {
      if (!n.isRead) markRead.mutate(n._id);
      if (n.grievanceCode) {
        navigate(isAdminPortal ? "/grievances" : "/user/track-case", {
          state: { grievanceId: n.grievanceCode },
        });
      }
    },
    [markRead, navigate, isAdminPortal]
  );

  const renderCard = (n: any) => {
    const cfg = typeConfig[n.type] || typeConfig.system;
    const Icon = cfg.icon;
    return (
      <button
        key={n._id}
        type="button"
        onClick={() => handleOpen(n)}
        className={`w-full text-left rounded-2xl border p-4 transition-all active:scale-[0.99] ${
          n.isRead
            ? "bg-card border-border hover:border-border/80"
            : "bg-[#826CF3]/5 border-[#826CF3]/30 shadow-sm hover:border-[#826CF3]/50"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${cfg.accent}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p
                className={`text-sm leading-snug ${
                  n.isRead ? "font-medium text-foreground" : "font-semibold text-foreground"
                }`}
              >
                {n.title}
              </p>
              {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#826CF3] shrink-0 mt-1.5" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{n.message}</p>
            <div className="flex items-center justify-between mt-2.5 gap-2">
              <span className="text-[10px] font-medium text-muted-foreground">{timeAgo(n.createdAt)}</span>
              <div className="flex items-center gap-1.5">
                {n.isRead && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {t("readStatus")}
                  </span>
                )}
                {n.grievanceCode && (
                  <span className="text-[10px] font-semibold text-[#4F81FF] bg-[#4F81FF]/10 px-2 py-0.5 rounded-full">
                    {n.grievanceCode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className={`flex flex-col min-h-full pb-6 animate-fade-in ${isAdminPortal ? "max-w-3xl" : ""}`}>
      <div className={`${isAdminPortal ? "pb-4" : "px-4 pt-2 pb-4"} bg-gradient-to-b from-[#826CF3]/10 to-transparent`}>
        <div className={`flex items-center justify-between mb-4 ${isAdminPortal ? "" : ""}`}>
          <div className="flex items-center gap-3">
            {!isAdminPortal && (
              <Link
                to="/user"
                className="p-1.5 rounded-full hover:bg-secondary/80 text-foreground transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
            )}
            <div>
              <h1 className={`${isAdminPortal ? "text-2xl" : "text-xl"} font-bold text-foreground`}>{t("notificationsTitle")}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {unreadCount > 0 ? `${unreadCount} ${t("unreadCountMsg")}` : t("allCaughtUp")}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markRead.isPending}
              className="text-xs text-[#826CF3] font-semibold flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> {t("markAllRead")}
            </button>
          )}
        </div>

        <div className={`flex gap-1.5 p-1 bg-secondary/60 rounded-xl ${isAdminPortal ? "" : ""}`}>
          {STATUS_TABS.map((tab) => (
            <button
              key={t(tab.id)}
              type="button"
              onClick={() => setStatus(tab.id)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                status === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(tab.id)}
              {tab.id === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#826CF3] text-white text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={`space-y-5 flex-1 ${isAdminPortal ? "" : "px-4"}`}>
        {isLoading ? (
          <div className="space-y-3">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-24 bg-card rounded-2xl border border-border animate-pulse" />
              ))}
          </div>
        ) : sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#826CF3]/10 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-[#826CF3]" />
            </div>
            <p className="text-base font-semibold text-foreground">{t("noNotifications")}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">{
              status === "unread" ? t("noUnreadNotifications") : status === "read" ? t("noReadNotifications") : isAdminPortal ? t("adminUpdatesMsg") : t("userUpdatesMsg")
            }</p>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.key} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                {t(section.key)}
              </p>
              <div className="space-y-2">{section.items.map(renderCard)}</div>
            </section>
          ))
        )}
      </div>
    </div>
  );
});
