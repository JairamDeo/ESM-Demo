import React, { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useDashboardData } from "../DashboardDataContext";
import { useChartTheme, getTooltipProps } from "@/hooks/useChartTheme";

const PRIORITY_COLORS: Record<string, string> = {
  high: "hsl(var(--destructive))",
  medium: "hsl(var(--warning))",
  low: "hsl(var(--success))",
};

export function PriorityWidget({ chartType }: { chartType: string }) {
  const { data, isLoading } = useDashboardData();
  const chartTheme = useChartTheme();
  
  const pieData = useMemo(() => {
    if (!data?.byPriority?.length) return [];
    return data.byPriority.map((p: any) => ({
      name: p.name.charAt(0).toUpperCase() + p.name.slice(1),
      value: p.value,
      color: PRIORITY_COLORS[p.name.toLowerCase()] || "hsl(var(--primary))",
    }));
  }, [data]);

  const pieTotal = useMemo(() => pieData.reduce((sum: number, d: any) => sum + d.value, 0), [pieData]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (pieData.length === 0) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No priority data</div>;
  }

  if (chartType === "bar") {
    return (
      <div className="h-full w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pieData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke={chartTheme.axis} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke={chartTheme.axis} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip {...getTooltipProps(chartTheme)} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
              {pieData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const innerRadius = chartType === "donut" ? 52 : 0;

  return (
    <div className="h-full flex flex-col">
      <div className="relative flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={78}
              innerRadius={innerRadius}
              paddingAngle={chartType === "donut" ? 3 : 0}
              stroke="transparent"
            >
              {pieData.map((entry: any, i: number) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip {...getTooltipProps(chartTheme)} />
          </PieChart>
        </ResponsiveContainer>
        {chartType === "donut" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-foreground tabular-nums">{pieTotal}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
          </div>
        )}
      </div>
      <div className="space-y-2 mt-3 pt-3 border-t border-border overflow-y-auto max-h-[100px]">
        {pieData.map((item: any) => (
          <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
              <span className="text-muted-foreground truncate">{item.name}</span>
            </div>
            <span className="text-foreground font-semibold tabular-nums shrink-0">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
