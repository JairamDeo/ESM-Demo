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
    <div className="h-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/12 via-primary/5 to-transparent flex flex-col justify-center px-5 py-4">
      <div className="flex items-center gap-4 mb-2 z-10">
        <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/15">
          <Timer className="w-5 h-5" />
        </div>
        <p className="text-[1.85rem] font-semibold text-foreground tabular-nums leading-none truncate tracking-tight">{formattedTime}</p>
      </div>
      <div className="min-w-0 z-10">
        <p className="text-sm text-muted-foreground leading-tight">Average time to close a grievance</p>
      </div>
      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-[0.08] bg-primary" />
    </div>
  );
}
