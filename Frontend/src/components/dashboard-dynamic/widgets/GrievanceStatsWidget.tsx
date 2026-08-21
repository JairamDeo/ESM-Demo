import React, { useMemo } from "react";
import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useDashboardData } from "../DashboardDataContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useChartTheme, getTooltipProps } from "@/hooks/useChartTheme";

const STAT_CONFIG = [
  { label: "All grievances", key: "total",     icon: FileText,      iconCls: "bg-primary/15 text-primary",      gradFrom: "from-primary/12",     border: "border-primary/20",     accent: "bg-primary"     },
  { label: "Pending",          key: "pending",   icon: Clock,         iconCls: "bg-warning/15 text-warning",      gradFrom: "from-warning/12",     border: "border-warning/20",     accent: "bg-warning"     },
  { label: "Resolved",         key: "resolved",  icon: CheckCircle2,  iconCls: "bg-success/15 text-success",      gradFrom: "from-success/12",     border: "border-success/20",     accent: "bg-success"     },
  { label: "Sent to higher HQ", key: "escalated", icon: AlertTriangle, iconCls: "bg-destructive/15 text-destructive", gradFrom: "from-destructive/12", border: "border-destructive/20", accent: "bg-destructive" },
];

export function GrievanceStatsWidget({ chartType }: { chartType: string }) {
  const { data, isLoading } = useDashboardData();
  const theme = useChartTheme();

  const stats = useMemo(() => {
    if (!data?.stats) return STAT_CONFIG.map((s) => ({ ...s, value: "—", rawValue: 0 }));
    const s = data.stats;
    return STAT_CONFIG.map((item) => ({
      ...item,
      value: ((s[item.key as keyof typeof s] as number) ?? 0).toLocaleString(),
      rawValue: (s[item.key as keyof typeof s] as number) ?? 0,
    }));
  }, [data]);

  const chartData = useMemo(
    () => stats.filter((s) => s.key !== "total").map((s) => ({ name: s.label, value: s.rawValue })),
    [stats]
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 h-full">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-secondary/20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (chartType === "bar") {
    return (
      <div className="w-full h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
            <XAxis dataKey="name" stroke={theme.axis} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={theme.axis} fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip {...getTooltipProps(theme)} cursor={{ fill: "hsl(var(--muted) / 0.1)" }} />
            <Bar dataKey="value" fill={theme.bar} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // KPI cards — horizontal layout that fits any reasonable widget height
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 h-full">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`relative overflow-hidden rounded-2xl border ${stat.border} bg-gradient-to-br ${stat.gradFrom} to-card flex items-center gap-3.5 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
        >
          <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${stat.accent}`} />
          <div className={`w-11 h-11 rounded-2xl ${stat.iconCls} flex items-center justify-center shrink-0 ring-1 ring-inset ring-white/10`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[1.65rem] font-semibold text-foreground tabular-nums leading-none tracking-tight">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight font-medium">{stat.label}</p>
          </div>
          <div className={`absolute -right-5 -top-5 w-24 h-24 rounded-full opacity-[0.12] ${stat.iconCls}`} />
        </div>
      ))}
    </div>
  );
}
