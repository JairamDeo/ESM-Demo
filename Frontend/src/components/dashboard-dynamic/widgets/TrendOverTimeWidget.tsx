import React, { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useDashboardData } from "../DashboardDataContext";
import { useChartTheme, getTooltipProps } from "@/hooks/useChartTheme";

export function TrendOverTimeWidget({ chartType }: { chartType: string }) {
  const { data, isLoading } = useDashboardData();
  const theme = useChartTheme();

  const chartData = useMemo(() => {
    if (!data?.monthly?.length) return [];
    return data.monthly;
  }, [data]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (chartData.length === 0) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No trend data</div>;
  }

  if (chartType === "bar") {
    return (
      <div className="h-full w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
            <XAxis dataKey="name" stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip {...getTooltipProps(theme)} cursor={{ fill: "hsl(var(--muted) / 0.1)" }} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar dataKey="received" name="Received" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="resolved" name="Resolved" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
          <XAxis dataKey="name" stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...getTooltipProps(theme)} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Line type="monotone" dataKey="received" name="Received" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="resolved" name="Resolved" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
