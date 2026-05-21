import { useState, memo, useMemo } from "react";
import { BarChart3, Download, Calendar, FileText, TrendingUp, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useReports } from "@/hooks/useApi";

const TT = { background: "hsl(240 3% 12%)", border: "1px solid hsl(240 3% 20%)", borderRadius: "8px", color: "#fff" };

export default memo(function Reports() {
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useReports(months);

  const summary = useMemo(() => data?.summary || {}, [data]);
  const monthly = useMemo(() => data?.monthly || [], [data]);
  const sla = useMemo(() => data?.slaCompliance || [], [data]);
  const stationPerf = useMemo(() => data?.stationPerformance?.slice(0, 5) || [], [data]);

  const summaryCards = useMemo(() => [
    { label: "Total Grievances", value: summary.totalGrievances ?? "—", icon: FileText, color: "primary" },
    { label: "Resolved", value: summary.totalResolved ?? "—", icon: CheckCircle2, color: "success" },
    { label: "Pending", value: summary.totalPending ?? "—", icon: Clock, color: "warning" },
    { label: "Escalated", value: summary.totalEscalated ?? "—", icon: AlertTriangle, color: "destructive" },
  ], [summary]);

  const handleExport = () => {
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `vitric_report_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Performance metrics and audit reports</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="px-3 py-2 text-sm bg-secondary border border-border text-foreground rounded-lg outline-none focus:border-primary">
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
          <button onClick={handleExport} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Export JSON
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-5">
            <div className={`w-9 h-9 rounded-lg bg-${s.color}/15 flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 text-${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Monthly: Received vs Resolved</h3>
          {isLoading ? <div className="h-[280px] bg-secondary/50 rounded-lg animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <XAxis dataKey="month" stroke="hsl(240 3% 40%)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(240 3% 40%)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="received" name="Received" fill="hsl(255 60% 69%)" radius={[4,4,0,0]} barSize={20} />
                <Bar dataKey="resolved" name="Resolved" fill="hsl(142 71% 45%)" radius={[4,4,0,0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">SLA Compliance (%)</h3>
          {isLoading ? <div className="h-[280px] bg-secondary/50 rounded-lg animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={sla}>
                <XAxis dataKey="month" stroke="hsl(240 3% 40%)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(240 3% 40%)" fontSize={12} tickLine={false} axisLine={false} domain={[0,100]} />
                <Tooltip contentStyle={TT} formatter={(v: any) => [`${v}%`, "SLA"]} />
                <Line type="monotone" dataKey="sla" stroke="hsl(255 60% 69%)" strokeWidth={2.5} dot={{ fill: "hsl(255 60% 69%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Station Performance Table */}
      {stationPerf.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Station Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border  ">
                  {["Station","Total","Resolved","Pending","Resolution Rate"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stationPerf.map((s: any) => (
                  <tr key={s.station} className="border-b border-border/50 hover:bg-secondary/30 ">
                    <td className="py-3 px-3 text-sm font-medium text-foreground">{s.station}</td>
                    <td className="py-3 px-3 text-sm text-foreground">{s.total}</td>
                    <td className="py-3 px-3 text-sm text-success">{s.resolved}</td>
                    <td className="py-3 px-3 text-sm text-warning">{s.pending}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-1.5 max-w-[80px]">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${s.rate}%` }} />
                        </div>
                        <span className="text-xs text-foreground font-medium">{s.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Available Reports */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Available Reports</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {["Monthly Summary Report","Station-wise Performance","Case Type Analysis","Escalation Report","Officer Workload Report","Veteran Satisfaction Report"].map((r) => (
            <button key={r} onClick={handleExport} className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer text-left">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">{r}</span>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
