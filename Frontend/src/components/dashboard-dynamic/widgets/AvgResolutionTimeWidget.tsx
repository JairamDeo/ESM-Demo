import React, { useMemo } from "react";
import { Timer } from "lucide-react";
import { useDashboardData } from "../DashboardDataContext";

export function AvgResolutionTimeWidget({ chartType }: { chartType: string }) {
  const { data, isLoading } = useDashboardData();

  const formattedTime = useMemo(() => {
    if (data?.avgResolutionHours === undefined) return "—";
    const hours = data.avgResolutionHours;
    if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }, [data]);

  if (isLoading) {
    return <div className="h-full rounded-2xl border border-border bg-secondary/20 animate-pulse" />;
  }

  return (
    <div className="h-full relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent flex flex-col justify-center px-6 py-4">
      <div className="flex items-center gap-4 mb-2 z-10">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Timer className="w-5 h-5" />
        </div>
        <p className="text-3xl font-bold text-foreground tabular-nums leading-none truncate">{formattedTime}</p>
      </div>
      <div className="min-w-0 z-10">
        <p className="text-sm text-muted-foreground leading-tight">Average Resolution Time</p>
      </div>
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-5 bg-primary/15" />
    </div>
  );
}
