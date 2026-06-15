import { memo, useMemo, useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  QrCode,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { useDashboard } from "@/hooks/useApi";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/stores/rbac";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";

const PIE_COLORS = [
  "hsl(255 60% 69%)",
  "hsl(199 89% 48%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(280 55% 60%)",
  "hsl(210 40% 55%)",
];

const STAT_STYLES: Record<string, { wrap: string; icon: string }> = {
  primary: { wrap: "from-primary/20 to-primary/5", icon: "bg-primary/15 text-primary" },
  warning: { wrap: "from-warning/20 to-warning/5", icon: "bg-warning/15 text-warning" },
  success: { wrap: "from-success/20 to-success/5", icon: "bg-success/15 text-success" },
  destructive: { wrap: "from-destructive/20 to-destructive/5", icon: "bg-destructive/15 text-destructive" },
};

const statusBadge: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/25",
  "in-progress": "bg-info/15 text-info border-info/25",
  escalated: "bg-destructive/15 text-destructive border-destructive/25",
  resolved: "bg-success/15 text-success border-success/25",
};

const PERIOD_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "this_year", label: `This Year (${new Date().getFullYear()})` },
];

function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return useMemo(
    () => ({
      grid: isDark ? "hsl(240 3% 22%)" : "hsl(240 5% 88%)",
      axis: isDark ? "hsl(240 3% 55%)" : "hsl(240 4% 46%)",
      bar: "hsl(255 60% 69%)",
      barHover: "hsl(255 60% 62%)",
      tooltip: {
        background: isDark ? "hsl(240 3% 14%)" : "hsl(0 0% 100%)",
        border: isDark ? "hsl(240 3% 24%)" : "hsl(240 5% 88%)",
        color: isDark ? "hsl(0 0% 92%)" : "hsl(240 5% 15%)",
      },
    }),
    [isDark]
  );
}

const StatSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
    <div className="w-11 h-11 rounded-xl bg-secondary mb-4" />
    <div className="h-8 w-16 bg-secondary rounded mb-2" />
    <div className="h-3.5 w-24 bg-secondary rounded" />
  </div>
);

export default memo(function Dashboard() {
  const [period, setPeriod] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { data, isLoading } = useDashboard(period);
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { user } = useAuth();
  const chart = useChartTheme();
  const canSeeTopStations = permissions.viewStations;

  const selectedLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label || "All Time";
  const scopeLabel = user?.stateName || user?.hqName || user?.stationName || "your scope";

  const stats = useMemo(() => {
    const base = [
      { label: "Total Grievances", key: "total", icon: FileText, color: "primary" },
      { label: "Pending Cases", key: "pending", icon: Clock, color: "warning" },
      { label: "Resolved", key: "resolved", icon: CheckCircle2, color: "success" },
      { label: "Escalated", key: "escalated", icon: AlertTriangle, color: "destructive" },
    ];
    if (!data?.stats) {
      return base.map((s) => ({ ...s, value: "—" }));
    }
    const s = data.stats;
    return base.map((item) => ({
      ...item,
      value: (s[item.key as keyof typeof s] as number)?.toLocaleString() ?? "0",
    }));
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.byType?.length) return [];
    return data.byType.map((t: { name: string; value: number }, i: number) => ({
      name: t.name,
      value: t.value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [data]);

  const pieTotal = useMemo(() => pieData.reduce((sum, d) => sum + d.value, 0), [pieData]);
  const stationData = useMemo(() => data?.byStation || [], [data]);
  const recent = useMemo(() => data?.recent || [], [data]);
  const counts = useMemo(() => data?.counts || { stations: 0, officers: 0, activeQR: 0 }, [data]);

  const tooltipProps = {
    contentStyle: {
      background: chart.tooltip.background,
      border: `1px solid ${chart.tooltip.border}`,
      borderRadius: 10,
      color: chart.tooltip.color,
      fontSize: 12,
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    },
    cursor: { fill: "hsl(var(--muted) / 0.35)" },
  };

  return (
    <div className="space-y-6 animate-fade-in pb-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Grievance overview · {scopeLabel}
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 min-w-[11rem] px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground hover:bg-secondary/50 transition-colors shadow-sm"
          >
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left truncate">{selectedLabel}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-20 bg-card border border-border rounded-xl shadow-xl py-1 w-52">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPeriod(opt.value);
                      setDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2.5 text-sm transition-colors text-left ${
                      period === opt.value
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {opt.label}
                    {period === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading
          ? Array(4)
              .fill(0)
              .map((_, i) => <StatSkeleton key={i} />)
          : stats.map((stat) => {
              const style = STAT_STYLES[stat.color] || STAT_STYLES.primary;
              return (
                <div
                  key={stat.label}
                  className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${style.wrap} p-5 hover:border-primary/25 transition-colors`}
                >
                  <div className={`w-11 h-11 rounded-xl ${style.icon} flex items-center justify-center mb-4`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-bold text-foreground tabular-nums">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              );
            })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Grievances</h3>
            <button
              type="button"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
              onClick={() => navigate("/grievances")}
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-14 bg-secondary/40 rounded-xl animate-pulse" />
                ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No grievances yet</p>
          ) : (
            <div className="space-y-1">
              {recent.map((g: any) => (
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
          )}
        </div>

        {/* Pie */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col">
          <h3 className="font-semibold text-foreground mb-1">By Case Type</h3>
          <p className="text-xs text-muted-foreground mb-3">Distribution for selected period</p>
          {pieData.length > 0 ? (
            <>
              <div className="relative flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={78}
                      innerRadius={52}
                      paddingAngle={3}
                      stroke="transparent"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipProps} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-foreground tabular-nums">{pieTotal}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
                </div>
              </div>
              <div className="space-y-2 mt-3 pt-3 border-t border-border">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <span className="text-foreground font-semibold tabular-nums shrink-0">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 min-h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No case type data
            </div>
          )}
        </div>
      </div>

      {/* Top stations */}
      {canSeeTopStations && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Top Stations</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 min-h-[260px]">
              {stationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stationData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                    <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke={chart.axis}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke={chart.axis}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={88}
                    />
                    <Tooltip {...tooltipProps} />
                    <Bar
                      dataKey="cases"
                      fill={chart.bar}
                      radius={[0, 8, 8, 0]}
                      barSize={22}
                      activeBar={{ fill: chart.barHover }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm rounded-xl bg-secondary/20 border border-dashed border-border">
                  No station data yet
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 justify-center">
              {[
                { icon: Building2, label: "Station HQs", value: counts.stations, cls: "text-primary bg-primary/15" },
                { icon: Users, label: "Active Officers", value: counts.officers, cls: "text-info bg-info/15" },
                { icon: QrCode, label: "QR Active", value: counts.activeQR, cls: "text-success bg-success/15" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3.5"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${row.cls}`}>
                    <row.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {isLoading ? "—" : row.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
