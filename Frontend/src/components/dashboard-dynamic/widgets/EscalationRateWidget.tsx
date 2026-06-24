import React, { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { useDashboardData } from "../DashboardDataContext";

export function EscalationRateWidget({ chartType }: { chartType: string }) {
  const { data, isLoading } = useDashboardData();

  const formattedRate = useMemo(() => {
    if (!data?.stats) return "—";
    const total = data.stats.total;
    if (total === 0) return "0%";
    const rate = (data.stats.escalated / total) * 100;
    return `${rate.toFixed(1)}%`;
  }, [data]);

  if (isLoading) {
    return <div className="h-full rounded-2xl border border-border bg-secondary/20 animate-pulse" />;
  }

  return (
    <div className="h-full relative overflow-hidden rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/10 to-transparent flex flex-col justify-center px-6 py-4">
      <div className="flex items-center gap-4 mb-2 z-10">
        <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <p className="text-3xl font-bold text-foreground tabular-nums leading-none truncate">{formattedRate}</p>
      </div>
      <div className="min-w-0 z-10">
        <p className="text-sm text-muted-foreground leading-tight">Escalation Rate</p>
      </div>
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-5 bg-destructive/15" />
    </div>
  );
}
