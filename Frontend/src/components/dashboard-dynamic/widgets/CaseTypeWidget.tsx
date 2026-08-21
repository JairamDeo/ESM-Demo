import React, { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useDashboardData } from "../DashboardDataContext";
import { useChartTheme, PIE_COLORS, getTooltipProps } from "@/hooks/useChartTheme";

export function CaseTypeWidget({ chartType }: { chartType: string }) {
  const { data, isLoading } = useDashboardData();
  const chartTheme = useChartTheme();
  
  const pieData = useMemo(() => {
    if (!data?.byType?.length) return [];
    return data.byType.map((t: { name: string; value: number }, i: number) => ({
      name: t.name?.trim() ? t.name : "Unknown type",
      value: t.value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [data]);

  const pieTotal = useMemo(() => pieData.reduce((sum: number, d: { value: number }) => sum + d.value, 0), [pieData]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (pieData.length === 0) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No grievance type data</div>;
  }

  if (chartType === "bar") {
    return (
      <div className="h-full w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pieData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke={chartTheme.axis} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val.length > 10 ? val.substring(0,10)+'...' : val} />
            <YAxis stroke={chartTheme.axis} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip {...getTooltipProps(chartTheme)} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={28}>
              {pieData.map((entry: { color: string }, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const innerRadius = chartType === "donut" ? "52%" : 0;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="relative flex-1 min-h-[120px] overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius="72%"
              innerRadius={innerRadius}
              paddingAngle={chartType === "donut" ? 3 : 0}
              stroke="hsl(var(--card))"
              strokeWidth={2}
            >
              {pieData.map((entry: { color: string }, i: number) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip {...getTooltipProps(chartTheme)} />
          </PieChart>
        </ResponsiveContainer>
        {chartType === "donut" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-foreground tabular-nums">{pieTotal}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Grievances</span>
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-border/70 overflow-y-auto max-h-[80px] shrink-0">
        <div className="flex items-center justify-between px-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>Type</span>
          <span>Count</span>
        </div>
        <div className="space-y-1.5">
          {pieData.map((item: { name: string; value: number; color: string }) => (
            <div key={item.name} className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded-lg bg-secondary/35">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0 ring-2 ring-background" style={{ background: item.color }} />
                <span className="text-muted-foreground truncate">{item.name}</span>
              </div>
              <span className="text-foreground font-semibold tabular-nums shrink-0">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
