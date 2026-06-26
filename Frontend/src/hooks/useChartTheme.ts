import { useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  return useMemo(
    () => ({
      grid: isDark ? "hsl(240 3% 22%)" : "hsl(240 5% 88%)",
      axis: isDark ? "hsl(240 3% 55%)" : "hsl(240 4% 46%)",
      bar: "hsl(255 60% 69%)",
      barHover: "hsl(255 60% 62%)",
      tooltip: {
        background: isDark ? "hsl(240 3% 14%)" : "hsl(0 0% 100%)",
        border: isDark ? "hsl(240 3% 24%)" : "hsl(240 5% 88%)",
        color: isDark ? "hsl(0 0% 92%)" : "hsl(240 5% 15%)",
      },
    }),
    [isDark]
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
