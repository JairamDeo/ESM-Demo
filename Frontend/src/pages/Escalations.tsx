import { usePermissions } from "@/stores/rbac";
import { useState, memo, useCallback, useMemo } from "react";
import { AlertTriangle, Clock, ArrowUpRight, CheckCircle2, Search, X, ChevronDown } from "lucide-react";
import { useEscalations, useResolveEscalation } from "@/hooks/useApi";

const ESCALATION_REASON_LABELS: Record<string, string> = {
  no_response: "No response",
  concern_pending: "Concern pending",
  sla_breach: "SLA breach",
  manual_request: "Manual",
  approved_request: "L1 approved request",
};

export default memo(function Escalations() {
  const permissions = usePermissions();
  const canResolve = permissions.resolveEscalations;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [resolveModal, setResolveModal] = useState<(Record<string, unknown> & { _id?: string; escalationId?: string; status?: string; grievanceCode?: string; grievanceType?: string; createdAt?: string; daysOpen?: number; veteranName?: string; type?: string; stationName?: string; reason?: string; escalationReasonType?: string; fromLevel?: string; toLevel?: string; fromOfficerName?: string; escalatedTo?: string; resolvedNote?: string; resolvedAt?: string }) | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading } = useEscalations({ search, status: statusFilter || undefined });
  const resolveEscalation = useResolveEscalation();

  const escalations = useMemo(() => data?.data || [], [data]);
  const summary = useMemo(() => data?.summary || { open: 0, resolved: 0, avgDaysOpen: 0 }, [data]);

  const handleResolve = useCallback(async () => {
    if (!resolveModal?._id) return;
    await resolveEscalation.mutateAsync({ id: resolveModal._id, resolutionNote: note || "Resolved by admin" });
    setResolveModal(null); setNote("");
  }, [resolveModal, note, resolveEscalation]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Escalations</h1>
        <p className="text-muted-foreground text-sm mt-1">Auto-escalated and manually flagged overdue cases</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Open Escalations", value: isLoading ? "—" : String(summary.open), icon: AlertTriangle, color: "destructive" },
          { label: "Avg. Days Open", value: isLoading ? "—" : `${summary.avgDaysOpen} days`, icon: Clock, color: "warning" },
          { label: "Resolved This Month", value: isLoading ? "—" : String(summary.resolved), icon: CheckCircle2, color: "success" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg bg-${s.color}/15 flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 text-${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search escalations..." className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full" />
        </div>
        <div className="relative">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-secondary/50 hover:bg-secondary/80 border border-border rounded-lg px-3 py-1.5 pr-9 text-sm text-foreground appearance-none outline-none cursor-pointer"
  >
        <option value="">All Status</option>
        <option value="open">Open</option>
        <option value="resolved">Resolved</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
      </div>
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Resolve Escalation</h2>
              <button onClick={() => setResolveModal(null)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              <span className="text-primary font-mono">{resolveModal.escalationId}</span> → {resolveModal.veteranName}
            </p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Resolution note..." className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setResolveModal(null)} className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={handleResolve} disabled={resolveEscalation.isPending} className="flex-1 py-2.5 bg-success text-white rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {resolveEscalation.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-card rounded-xl border border-border">
        {isLoading ? Array(4).fill(0).map((_, i) => (
          <div key={i} className="p-5 border-b border-border"><div className="h-16 bg-secondary/50 rounded-lg animate-pulse" /></div>
        )) : escalations.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">No escalations found.</div>
        ) : escalations.map((e: Record<string, unknown> & { _id?: string; escalationId?: string; status?: string; grievanceCode?: string; grievanceType?: string; createdAt?: string; daysOpen?: number; resolvedNote?: string; resolvedAt?: string; veteranName?: string; type?: string; stationName?: string; reason?: string; escalationReasonType?: string; fromLevel?: string; toLevel?: string; fromOfficerName?: string; escalatedTo?: string }, i: number) => (
          <div key={e._id || e.escalationId} className={`p-5 flex items-start justify-between gap-4 ${i < escalations.length - 1 ? "border-b border-border" : ""} hover:bg-secondary/20 transition-colors`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${e.status === "open" ? "bg-destructive/15" : "bg-success/15"}`}>
                {e.status === "open" ? <AlertTriangle className="w-5 h-5 text-destructive" /> : <CheckCircle2 className="w-5 h-5 text-success" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-primary">{e.escalationId}</span>
                  <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">{e.grievanceCode}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{e.veteranName} — {e.type}</p>
                <p className="text-xs text-muted-foreground mt-1">{e.stationName} · {e.reason}</p>
                {e.escalationReasonType && (
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {ESCALATION_REASON_LABELS[e.escalationReasonType] || e.escalationReasonType}
                    {e.fromLevel && e.toLevel ? ` · ${e.fromLevel}→${e.toLevel}` : ""}
                  </span>
                )}
                {e.fromOfficerName && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    From: <span className="text-foreground">{e.fromOfficerName}</span>
                    {e.fromLevel ? ` (${e.fromLevel})` : ""}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">Escalated to: <span className="text-foreground">{e.escalatedTo}</span>{e.toLevel ? ` (${e.toLevel})` : ""}</p>
              </div>
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${e.status === "open" ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>{e.status}</span>
              <p className="text-xs text-muted-foreground">{e.daysOpen} days open</p>
              {canResolve && e.status === "open" && e._id && (
                <button onClick={() => setResolveModal(e)} className="text-xs px-2.5 py-1 bg-success/15 text-success rounded-full hover:bg-success/25 transition-colors">Resolve</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
