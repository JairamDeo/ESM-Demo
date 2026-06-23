import React, { useMemo } from "react";
import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useDashboardData } from "../DashboardDataContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useChartTheme, getTooltipProps } from "@/hooks/useChartTheme";

const STAT_CONFIG = [
  { label: "Total Grievances", key: "total",     icon: FileText,      iconCls: "bg-primary/15 text-primary",      gradFrom: "from-primary/10",     border: "border-primary/20"     },
  { label: "Pending Cases",    key: "pending",   icon: Clock,         iconCls: "bg-warning/15 text-warning",      gradFrom: "from-warning/10",     border: "border-warning/20"     },
  { label: "Resolved",         key: "resolved",  icon: CheckCircle2,  iconCls: "bg-success/15 text-success",      gradFrom: "from-success/10",     border: "border-success/20"     },
  { label: "Escalated",        key: "escalated", icon: AlertTriangle, iconCls: "bg-destructive/15 text-destructive", gradFrom: "from-destructive/10", border: "border-destructive/20" },
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
            <Bar dataKey="value" fill={theme.bar} radius={[4, 4, 0, 0]} />
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
          className={`relative overflow-hidden rounded-2xl border ${stat.border} bg-gradient-to-br ${stat.gradFrom} to-transparent flex items-center gap-3 px-4 py-3 hover:brightness-105 transition-all duration-200`}
        >
          {/* Icon */}
          <div className={`w-11 h-11 rounded-xl ${stat.iconCls} flex items-center justify-center shrink-0`}>
            <stat.icon className="w-5 h-5" />
          </div>

          {/* Text */}
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-tight">{stat.label}</p>
          </div>

          {/* Decorative blob */}
          <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 ${stat.iconCls}`} />
        </div>
      ))}
    </div>
  );
}
