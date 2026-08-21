import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { useDashboardData } from "../DashboardDataContext";

const statusBadge: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/25",
  "in-progress": "bg-info/15 text-info border-info/25",
  escalated: "bg-destructive/15 text-destructive border-destructive/25",
  resolved: "bg-success/15 text-success border-success/25",
};

export function RecentGrievancesWidget({ chartType }: { chartType: string }) {
  const { data, isLoading } = useDashboardData();
  const navigate = useNavigate();
  const recent = useMemo(() => {
    const list = (data?.recent || []) as Array<{
      grievanceId: string;
      veteranName: string;
      type: string;
      stationName: string;
      createdAt: string;
      status: string;
    }>;
    return list
      .filter((g) => g.status !== "resolved" && g.status !== "closed")
      .slice(0, 3);
  }, [data]);

  const renderTable = () => (
    <div className="w-full overflow-auto rounded-xl border border-border/60">
      <table className="w-full text-sm text-left">
        <thead className="text-[11px] text-muted-foreground uppercase tracking-wider bg-secondary/40">
          <tr>
            <th className="px-3.5 py-2.5 font-medium">ID</th>
            <th className="px-3.5 py-2.5 font-medium">Veteran</th>
            <th className="px-3.5 py-2.5 font-medium">Type</th>
            <th className="px-3.5 py-2.5 font-medium">Station</th>
            <th className="px-3.5 py-2.5 font-medium">Date</th>
            <th className="px-3.5 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((g) => (
            <tr key={g.grievanceId} className="border-b border-border/70 last:border-0 hover:bg-primary/[0.04] cursor-pointer transition-colors" onClick={() => navigate("/grievances")}>
              <td className="px-3.5 py-3 font-medium text-primary font-mono text-[12px]">{g.grievanceId}</td>
              <td className="px-3.5 py-3 text-foreground font-medium">{g.veteranName}</td>
              <td className="px-3.5 py-3 text-muted-foreground">{g.type}</td>
              <td className="px-3.5 py-3 text-muted-foreground">{g.stationName}</td>
              <td className="px-3.5 py-3 text-muted-foreground tabular-nums">{new Date(g.createdAt).toLocaleDateString("en-IN")}</td>
              <td className="px-3.5 py-3">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize border ${statusBadge[g.status] || "bg-secondary text-foreground"}`}>
                  {g.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderList = () => (
    <div className="space-y-1.5">
      {recent.map((g) => (
        <button
          key={g.grievanceId}
          type="button"
          onClick={() => navigate("/grievances")}
          className="w-full flex items-center justify-between gap-3 py-2.5 px-2.5 rounded-xl hover:bg-secondary/50 border border-transparent hover:border-border/80 transition-all text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{g.veteranName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {g.grievanceId} · {g.type} · {g.stationName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize border ${statusBadge[g.status] || "bg-secondary text-foreground"}`}
            >
              {g.status}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:block tabular-nums">
              {new Date(g.createdAt).toLocaleDateString("en-IN")}
            </span>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="h-14 bg-secondary/40 rounded-xl animate-pulse" />
      ) : recent.length === 0 ? (
        <div className="py-2 text-muted-foreground text-sm">
          No unresolved grievances
        </div>
      ) : chartType === "table" ? (
        renderTable()
      ) : (
        renderList()
      )}
    </div>
  );
}
