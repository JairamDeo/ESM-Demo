import { useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";

export function useChartTheme() {
  const { resolvedTheme } = useTheme();

  return useMemo(
    () => ({
      grid: "hsl(var(--border))",
      axis: "hsl(var(--muted-foreground))",
      bar: "hsl(var(--primary))",
      barHover: "hsl(var(--primary))",
      tooltip: {
        background: "hsl(var(--popover))",
        border: "hsl(var(--border))",
        color: "hsl(var(--popover-foreground))",
      },
    }),
    [resolvedTheme]
  );
}

export const PIE_COLORS = [
  "hsl(255 60% 69%)",
  "hsl(199 89% 48%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(280 55% 60%)",
  "hsl(210 40% 55%)",
];

export const getTooltipProps = (chart: ReturnType<typeof useChartTheme>) => ({
  contentStyle: {
    background: chart.tooltip.background,
    border: `1px solid ${chart.tooltip.border}`,
    borderRadius: 10,
    color: chart.tooltip.color,
    fontSize: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
  },
  cursor: { fill: "hsl(var(--muted) / 0.35)" },
});
