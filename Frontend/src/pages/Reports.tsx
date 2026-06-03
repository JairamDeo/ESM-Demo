import { useState, memo, useMemo } from "react";
import { Download, FileText, TrendingUp, CheckCircle2, AlertTriangle, Clock, ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useReports } from "@/hooks/useApi";
import { usePermissions } from "@/stores/rbac";

const TT = { background: "hsl(240 3% 12%)", border: "1px solid hsl(240 3% 20%)", borderRadius: "8px", color: "#fff" };

const PERIOD_OPTIONS = [
  { value: "all",           label: "All Time",                               months: 12 },
  { value: "today",         label: "Today",                                  months: 1  },
  { value: "this_week",     label: "This Week",                              months: 1  },
  { value: "this_month",    label: "This Month",                             months: 1  },
  { value: "last_3_months", label: "Last 3 Months",                          months: 3  },
  { value: "last_6_months", label: "Last 6 Months",                          months: 6  },
  { value: "this_year",     label: `This Year (${new Date().getFullYear()})`, months: 12 },
];

export default memo(function Reports() {
  const permissions = usePermissions();
  const canExport = permissions.exportReports;

  const [period, setPeriod] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Get months from selected period automatically
  const selectedOption = PERIOD_OPTIONS.find((o) => o.value === period) || PERIOD_OPTIONS[0];
  const months = selectedOption.months;

  const { data, isLoading } = useReports(months, period);

  const selectedLabel = selectedOption.label;

  const summary     = useMemo(() => data?.summary                       || {}, [data]);
  const monthly     = useMemo(() => data?.monthly                       || [], [data]);
  const sla         = useMemo(() => data?.slaCompliance                 || [], [data]);
  const stationPerf = useMemo(() => data?.stationPerformance?.slice(0, 5) || [], [data]);

  const summaryCards = useMemo(() => [
    { label: "Total Grievances", value: summary.totalGrievances ?? "—", icon: FileText,     color: "primary"     },
    { label: "Resolved",         value: summary.totalResolved   ?? "—", icon: CheckCircle2, color: "success"     },
    { label: "Pending",          value: summary.totalPending    ?? "—", icon: Clock,         color: "warning"     },
    { label: "Escalated",        value: summary.totalEscalated  ?? "—", icon: AlertTriangle, color: "destructive" },
  ], [summary]);

  const handleExport = () => {
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vitric_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Performance metrics and audit reports</p>
        </div>

        <div className="flex items-center gap-2">

          {/* Period Filter Dropdown */}
          <div className="relative">
          <button onClick={() => setDropdownOpen((o) => !o)} className="flex items-center justify-between w-44 px-4 py-2 bg-secondary/50 border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors"
  >        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />

          {/* label area */}
          <span className="flex-1 text-center">
            {selectedLabel}
          </span>

          <ChevronDown className="w-4 h-4 text-secondary-foreground shrink-0" />
          </button>

          {dropdownOpen && (
        <>
        <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}/>

        <div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-xl shadow-xl py-1 w-48">
            {PERIOD_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => {setPeriod(opt.value); setDropdownOpen(false);
            }}
            className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors text-left
              ${
                period === opt.value
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-foreground hover:bg-secondary/60"
              }`}
          >
                {opt.label}

                {period === opt.value && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> 
                )}
              </button>
              ))}
            </div>
          </>
          )}
          </div>

          {canExport && (
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export JSON
            </button>
          )}

        </div>
      </div>

      {/* Summary Cards */}
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
                <YAxis stroke="hsl(240 3% 40%)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
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
                <YAxis stroke="hsl(240 3% 40%)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
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
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Station Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Station", "Total", "Resolved", "Pending", "Resolution Rate"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 px-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stationPerf.map((s: any) => (
                  <tr key={s.station} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-3 px-3 text-sm font-medium text-foreground">{s.station}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{s.total}</td>
                    <td className="py-3 px-5 text-sm text-success">{s.resolved}</td>
                    <td className="py-3 px-5 text-sm text-warning">{s.pending}</td>
                    <td className="py-3 px-2">
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
          {["Monthly Summary Report", "Station-wise Performance", "Case Type Analysis", "Escalation Report", "Officer Workload Report", "Veteran Satisfaction Report"].map((r) => (
            <button
              key={r}
              onClick={canExport ? handleExport : undefined}
              disabled={!canExport}
              className={`flex items-center justify-between p-4 rounded-lg border border-border transition-colors text-left ${canExport ? "hover:border-primary/30 cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
            >
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