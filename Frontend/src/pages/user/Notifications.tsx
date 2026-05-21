import { memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, CheckCircle2, AlertTriangle, FileText, Check, ChevronLeft } from "lucide-react";
import { useNotifications, useMarkNotificationRead } from "@/hooks/useApi";

const typeIcon: Record<string, any> = {
  grievance_update: FileText,
  escalation: AlertTriangle,
  resolved: CheckCircle2,
  assignment: FileText,
  system: Bell,
};

const typeBg: Record<string, string> = {
  grievance_update: "bg-info/15 text-info",
  escalation: "bg-destructive/15 text-destructive",
  resolved: "bg-success/15 text-success",
  assignment: "bg-primary/15 text-primary",
  system: "bg-secondary text-muted-foreground",
};

export default memo(function Notifications() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  const handleMarkAllRead = useCallback(() => {
    markRead.mutate("all");
  }, [markRead]);

  return (
    <div className="px-4 space-y-5 animate-fade-in pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground"><ChevronLeft className="w-5 h-5 " color="#FFFFFF" /></Link>
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && <span className="text-xs bg-[#826CF3] text-primary-foreground px-2 py-0.5 rounded-full">{unreadCount}</span>}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-xs text-[#826CF3] font-medium flex items-center gap-1 hover:underline">
            <Check className="w-3 h-3" /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-card rounded-2xl border border-border animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: any) => {
            const Icon = typeIcon[n.type] || Bell;
            const bgCls = typeBg[n.type] || typeBg.system;
            return (
              <div key={n._id} onClick={() => !n.isRead && markRead.mutate(n._id)} className={`bg-card rounded-2xl border ${n.isRead ? "border-border" : "border-primary/30"} p-4 cursor-pointer transition-colors hover:bg-secondary/20`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl ${bgCls} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${n.isRead ? "text-foreground" : "text-foreground"}`}>{n.title}</p>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
