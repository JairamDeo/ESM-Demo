import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
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
  const recent = useMemo(() => data?.recent || [], [data]);

  const renderTable = () => (
    <div className="w-full overflow-x-auto h-full">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-secondary/20">
          <tr>
            <th className="px-4 py-3 rounded-tl-xl">ID</th>
            <th className="px-4 py-3">Veteran</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Station</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3 rounded-tr-xl">Status</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((g: { grievanceId: string; veteranName: string; type: string; stationName: string; createdAt: string; status: string }) => (
            <tr key={g.grievanceId} className="border-b border-border hover:bg-secondary/20 cursor-pointer" onClick={() => navigate("/grievances")}>
              <td className="px-4 py-3 font-medium text-primary">{g.grievanceId}</td>
              <td className="px-4 py-3 text-foreground">{g.veteranName}</td>
              <td className="px-4 py-3 text-muted-foreground">{g.type}</td>
              <td className="px-4 py-3 text-muted-foreground">{g.stationName}</td>
              <td className="px-4 py-3 text-muted-foreground">{new Date(g.createdAt).toLocaleDateString("en-IN")}</td>
              <td className="px-4 py-3">
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
    <div className="space-y-1 h-full overflow-y-auto pr-2">
      {recent.map((g: { grievanceId: string; veteranName: string; type: string; stationName: string; createdAt: string; status: string }) => (
        <button
          key={g.grievanceId}
          type="button"
          onClick={() => navigate("/grievances")}
          className="w-full flex items-center justify-between gap-3 py-3 px-2 rounded-xl hover:bg-secondary/40 transition-colors text-left"
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
            <span className="text-[11px] text-muted-foreground hidden sm:block">
              {new Date(g.createdAt).toLocaleDateString("en-IN")}
            </span>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {isLoading ? (
        <div className="space-y-2 flex-1">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-14 bg-secondary/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-muted-foreground text-sm">
          No grievances yet
        </div>
      ) : chartType === "table" ? (
        renderTable()
      ) : (
        renderList()
      )}
    </div>
  );
}
