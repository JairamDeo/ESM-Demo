import { useState, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Clock, CheckCircle2, AlertTriangle, Search } from "lucide-react";
import { useMyGrievances } from "@/hooks/useApi";

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  "in-progress": { icon: Clock, color: "text-info", bg: "bg-info/15", label: "In Progress" },
  pending: { icon: FileText, color: "text-warning", bg: "bg-warning/15", label: "Pending" },
  resolved: { icon: CheckCircle2, color: "text-success", bg: "bg-success/15", label: "Resolved" },
  escalated: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/15", label: "Escalated" },
  closed: { icon: CheckCircle2, color: "text-muted-foreground", bg: "bg-muted", label: "Closed" },
};

const progressMap: Record<string, number> = { pending: 20, "in-progress": 60, escalated: 55, resolved: 100, closed: 100 };

export default memo(function MyComplaints() {
  const [search, setSearch] = useState("");
  const { data: complaints = [], isLoading } = useMyGrievances();

  const filtered = useMemo(() =>
    complaints.filter((c: any) =>
      !search || c.type?.toLowerCase().includes(search.toLowerCase()) || (c.grievanceId || c.id)?.toLowerCase().includes(search.toLowerCase())
    ), [complaints, search]);

  const stats = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter((c: any) => c.status === "pending").length,
    active: complaints.filter((c: any) => c.status === "in-progress").length,
    resolved: complaints.filter((c: any) => c.status === "resolved").length,
  }), [complaints]);

  return (
    <div className="px-4 space-y-5 animate-fade-in ">
      <div className="flex items-center gap-3 ">
        <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold text-foreground">My Complaints</h1>
      </div>

      <div className="flex items-center gap-3 bg-[#222223] rounded-xl px-4 py-3 border border-border">
        <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID or type..." className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full" />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Pending", value: stats.pending, color: "text-warning" },
          { label: "Active", value: stats.active, color: "text-info" },
          { label: "Resolved", value: stats.resolved, color: "text-success" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-3 lg:p-6 text-center ">
            <p className={`text-lg lg:text-2xl font-bold ${s.color}`}>{isLoading ? "—" : s.value}</p>
            <p className="text-[10px] lg:text-sm  text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-card rounded-2xl border border-border animate-pulse" />) :
        filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {complaints.length === 0 ? "No complaints submitted yet." : "No results found."}
          </div>
        ) : filtered.map((c: any) => {
          const config = statusConfig[c.status] || statusConfig.pending;
          const Icon = config.icon;
          const progress = progressMap[c.status] || 20;
          return (
            <Link key={c._id || c.id} to="/user/track-case" state={{ complaint: c }} className="block bg-card rounded-xl border border-border p-4  hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-3 ">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.type}</p>
                    <p className="text-xs text-muted-foreground">{c.grievanceId || c.id}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${config.bg} ${config.color}`}>{config.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{c.stationName || c.station}</span>
                <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : c.date}</span>
              </div>
              <div className="mt-3 w-full bg-secondary rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-[#826CF3] transition-all" style={{ width: `${c.progress ?? progress}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
});
