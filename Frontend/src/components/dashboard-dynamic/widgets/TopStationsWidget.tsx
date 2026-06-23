import React, { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useDashboardData } from "../DashboardDataContext";
import { useChartTheme, getTooltipProps } from "@/hooks/useChartTheme";

export function TopStationsWidget({ chartType }: { chartType: string }) {
  const { data, isLoading } = useDashboardData();
  const chartTheme = useChartTheme();
  
  const stationData = useMemo(() => data?.byStation || [], [data]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (stationData.length === 0) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No station data yet</div>;
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stationData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            stroke={chartTheme.axis}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke={chartTheme.axis}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={88}
          />
          <Tooltip {...getTooltipProps(chartTheme)} />
          <Bar
            dataKey="cases"
            fill={chartTheme.bar}
            radius={[0, 8, 8, 0]}
            barSize={22}
            activeBar={{ fill: chartTheme.barHover }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
