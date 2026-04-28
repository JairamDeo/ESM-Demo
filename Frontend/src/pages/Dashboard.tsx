import { memo, useMemo } from "react";
import { FileText, Clock, CheckCircle2, AlertTriangle, TrendingUp, Building2, Users, QrCode } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { useDashboard } from "@/hooks/useApi";
import { useNavigate } from "react-router-dom";

const PIE_COLORS = ["hsl(255 60% 69%)", "hsl(199 89% 48%)", "hsl(142 71% 45%)", "hsl(38 92% 50%)", "hsl(240 3% 40%)"];
const TT_STYLE = { background: "hsl(240 3% 12%)", border: "1px solid hsl(240 3% 20%)", borderRadius: "8px", color: "#fff" };

const statusBadge: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  "in-progress": "bg-info/15 text-info",
  escalated: "bg-destructive/15 text-destructive",
  resolved: "bg-success/15 text-success",
};

// Skeleton loader
const StatSkeleton = () => (
  <div className="bg-card rounded-xl border border-border p-5 animate-pulse">
    <div className="w-10 h-10 rounded-lg bg-secondary mb-3" />
    <div className="h-7 w-20 bg-secondary rounded mb-2" />
    <div className="h-4 w-28 bg-secondary rounded" />
  </div>
);

export default memo(function Dashboard() {
  const { data, isLoading } = useDashboard();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!data?.stats) return [
      { label: "Total Grievances", value: "—", change: "", icon: FileText, color: "primary" },
      { label: "Pending Cases", value: "—", change: "", icon: Clock, color: "warning" },
      { label: "Resolved", value: "—", change: "", icon: CheckCircle2, color: "success" },
      { label: "Escalated", value: "—", change: "", icon: AlertTriangle, color: "destructive" },
    ];
    const s = data.stats;
    return [
      { label: "Total Grievances", value: s.total.toLocaleString(), change: "+12%", icon: FileText, color: "primary" },
      { label: "Pending Cases", value: s.pending.toLocaleString(), change: "-5%", icon: Clock, color: "warning" },
      { label: "Resolved", value: s.resolved.toLocaleString(), change: "+18%", icon: CheckCircle2, color: "success" },
      { label: "Escalated", value: s.escalated.toLocaleString(), change: "+3%", icon: AlertTriangle, color: "destructive" },
    ];
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.byType) return [];
    return data.byType.map((t: any, i: number) => ({ name: t.name, value: t.value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [data]);

  const areaData = useMemo(() => data?.monthly || [], [data]);
  const stationData = useMemo(() => data?.byStation || [], [data]);
  const recent = useMemo(() => data?.recent || [], [data]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">ESM Grievance Management — Nagpur Sub-Area Overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array(4).fill(0).map((_, i) => <StatSkeleton key={i} />) : stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-${stat.color}/15 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}`} />
              </div>
              {stat.change && (
                <span className={`text-xs font-medium flex items-center gap-1 ${stat.change.startsWith("+") ? "text-success" : "text-destructive"}`}>
                  <TrendingUp className="w-3 h-3" /> {stat.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(255 60% 69%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(255 60% 69%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="hsl(240 3% 40%)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(240 3% 40%)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TT_STYLE} />
              <Area type="monotone" dataKey="received" stroke="hsl(255 60% 69%)" fill="url(#areaGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="resolved" stroke="hsl(142 71% 45%)" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">By Case Type</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3}>
                    {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TT_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-foreground font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Grievances</h3>
            <button className="text-xs text-primary font-medium hover:underline" onClick={() => navigate("/grievances")}>View All</button>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => <div key={i} className="h-12 bg-secondary/50 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((g: any) => (
                <div key={g.grievanceId} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{g.veteranName}</p>
                      <p className="text-xs text-muted-foreground">{g.grievanceId} · {g.type} · {g.stationName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusBadge[g.status] || ""}`}>{g.status}</span>
                    <span className="text-xs text-muted-foreground hidden sm:block">{new Date(g.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
              ))}
              {recent.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No grievances yet</p>}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Top Stations</h3>
          {stationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stationData} layout="vertical">
                <XAxis type="number" stroke="hsl(240 3% 40%)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="hsl(240 3% 40%)" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={TT_STYLE} />
                <Bar dataKey="cases" fill="hsl(255 60% 69%)" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="text-center">
              <Building2 className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{data?.stats ? "10" : "—"}</p>
              <p className="text-xs text-muted-foreground">Stations</p>
            </div>
            <div className="text-center">
              <Users className="w-4 h-4 text-info mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{data?.stats ? "48" : "—"}</p>
              <p className="text-xs text-muted-foreground">Officers</p>
            </div>
            <div className="text-center">
              <QrCode className="w-4 h-4 text-success mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{data?.stats ? "10" : "—"}</p>
              <p className="text-xs text-muted-foreground">QR Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
