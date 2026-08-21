import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { WidgetShell } from "./WidgetShell";
import { WidgetRenderer } from "./WidgetRenderer";
import { DashboardDataProvider, DashboardData } from "./DashboardDataContext";
import {
  DashboardWidgetConfig,
  FRONTEND_LAYOUT_DEFAULTS,
  ChartType,
} from "./config/dashboardLayoutDefaults";
import {
  useDashboardLayout,
  useSaveDashboardLayout,
} from "@/hooks/useApi";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widgets whose default was changed to "bar". Force "bar" over any old saved "donut"/"pie" values.
const MIGRATED_BAR_WIDGETS = new Set(["status-breakdown", "by-submission-source", "by-priority"]);

function needsAlignmentMigration(layout: DashboardWidgetConfig[]): boolean {
  const sla = layout.find((w) => w.widgetKey === "sla-compliance");
  const avg = layout.find((w) => w.widgetKey === "avg-resolution-time");
  const pri = layout.find((w) => w.widgetKey === "by-priority");
  const esc = layout.find((w) => w.widgetKey === "escalation-rate");
  const status = layout.find((w) => w.widgetKey === "status-breakdown");
  const trend = layout.find((w) => w.widgetKey === "trend-over-time");
  const gs = layout.find((w) => w.widgetKey === "grievance-stats");

  if (!gs || gs.y !== 0 || gs.h < 3) return true;

  const recentW = layout.find((w) => w.widgetKey === "recent-grievances");
  const caseTypeW = layout.find((w) => w.widgetKey === "by-case-type");
  const stationsW = layout.find((w) => w.widgetKey === "top-stations");
  const typesNotBesideStations = Boolean(
    caseTypeW &&
      stationsW &&
      (caseTypeW.y !== stationsW.y || caseTypeW.w >= 12 || stationsW.w >= 12)
  );
  const lastRowGap =
    Boolean(sla) &&
    sla!.w <= 4 &&
    !layout.some((w) => w.id !== sla!.id && w.y === sla!.y && w.x >= 8);
  const avgShorter = Boolean(avg && pri && avg.y === pri.y && avg.h < pri.h);
  const escShorter = Boolean(esc && sla && esc.y === sla.y && esc.h < sla.h);
  const statusTrendSplit = Boolean(status && trend && status.w === 4 && trend.w === 8);

  return (
    lastRowGap ||
    avgShorter ||
    escShorter ||
    statusTrendSplit ||
    typesNotBesideStations ||
    Boolean(recentW && recentW.h >= 6)
  );
}

function migrateChartType(w: DashboardWidgetConfig, forceRecentTable: boolean): DashboardWidgetConfig {
  if (MIGRATED_BAR_WIDGETS.has(w.widgetKey) && (w.chartType === "donut" || w.chartType === "pie")) {
    return { ...w, chartType: "bar" };
  }
  if (forceRecentTable && w.widgetKey === "recent-grievances" && w.chartType === "list") {
    return { ...w, chartType: "table" };
  }
  return w;
}

function compactVertical(items: DashboardWidgetConfig[], cols = 12): DashboardWidgetConfig[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: DashboardWidgetConfig[] = [];

  const overlaps = (a: DashboardWidgetConfig, b: DashboardWidgetConfig) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  for (const item of sorted) {
    const w = Math.min(Math.max(item.w, 1), cols);
    const x = Math.min(Math.max(item.x, 0), cols - w);
    let y = 0;
    while (placed.some((p) => overlaps({ ...item, x, y, w }, p))) {
      const hit = placed.find((p) => overlaps({ ...item, x, y, w }, p));
      y = hit ? hit.y + hit.h : y + 1;
    }
    placed.push({ ...item, x, y, w });
  }
  return placed;
}

interface DynamicDashboardProps {
  data: DashboardData | null;
  isLoading: boolean;
  period: string;
}

export function DynamicDashboard({ data, isLoading, period }: DynamicDashboardProps) {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>([]);

  const { data: layoutData, isLoading: isLayoutLoading } = useDashboardLayout();
  const saveLayout = useSaveDashboardLayout();

  useEffect(() => {
    if (layoutData?.layout) {
      const savedLayout = layoutData.layout as DashboardWidgetConfig[];
      const rebuildAligned = needsAlignmentMigration(savedLayout);

      if (!rebuildAligned) {
        setWidgets(savedLayout.map((w) => migrateChartType(w, false)));
      } else {
        const savedChartTypes: Record<string, ChartType> = {};
        savedLayout.forEach((w) => {
          savedChartTypes[w.widgetKey] = w.chartType;
        });
        setWidgets(
          FRONTEND_LAYOUT_DEFAULTS.map((defaultWidget) => {
            const savedType = savedChartTypes[defaultWidget.widgetKey] ?? defaultWidget.chartType;
            return migrateChartType({ ...defaultWidget, chartType: savedType }, true);
          })
        );
      }
    } else if (!isLayoutLoading) {
      setWidgets(FRONTEND_LAYOUT_DEFAULTS);
    }
  }, [layoutData, isLayoutLoading]);

  const handleChartTypeChange = useCallback((id: string, newType: ChartType) => {
    setWidgets((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, chartType: newType } : w));
      saveLayout.mutate({ widgets: next });
      return next;
    });
  }, [saveLayout]);

  const unresolvedRecentCount = useMemo(() => {
    const list = data?.recent || [];
    return list
      .filter((g) => {
        const status = String((g as { status?: string }).status || "");
        return status !== "resolved" && status !== "closed";
      })
      .slice(0, 3).length;
  }, [data]);

  const hideRecentCard = !isLoading && unresolvedRecentCount === 0;

  const displayWidgets = useMemo(() => {
    const recentH =
      unresolvedRecentCount <= 1 ? 3 : unresolvedRecentCount === 2 ? 4 : 5;

    const sized = widgets
      .filter((w) => w.widgetKey !== "quick-counts")
      .filter((w) => !(hideRecentCard && w.widgetKey === "recent-grievances"))
      .map((w) => {
        if (w.widgetKey === "recent-grievances") {
          return { ...w, x: 0, w: 12, h: recentH, minH: 3 };
        }
        if (w.widgetKey === "by-case-type") {
          return { ...w, x: 0, w: 4, h: 5, minH: 4 };
        }
        if (w.widgetKey === "top-stations") {
          return { ...w, x: 4, w: 8, h: 5 };
        }
        return w;
      });

    return compactVertical(sized);
  }, [widgets, hideRecentCard, unresolvedRecentCount]);

  const layout = useMemo(() => {
    return displayWidgets.map((w) => ({
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: w.minW,
      minH: w.minH,
      static: true,
    }));
  }, [displayWidgets]);

  if (isLayoutLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard layout...</div>;
  }

  return (
    <DashboardDataProvider data={data} isLoading={isLoading} period={period}>
      <div className="dashboard-grid-container -mx-4 sm:mx-0">
        <ResponsiveGridLayout
          className="layout je-dashboard-grid"
          layouts={{ lg: layout, md: layout, sm: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 12, xs: 1, xxs: 1 }}
          rowHeight={50}
          containerPadding={[16, 16]}
          margin={[16, 16]}
          compactType="vertical"
          isDraggable={false}
          isResizable={false}
          useCSSTransforms={true}
        >
          {displayWidgets.map((w) => (
            <div
              key={w.id}
              className={`relative z-0 min-h-0 bg-transparent flex flex-col ${
                w.widgetKey === "recent-grievances" ? "je-dash-fit h-auto justify-start" : "h-full"
              }`}
            >
              <WidgetShell
                id={w.id}
                widgetKey={w.widgetKey}
                chartType={w.chartType}
                onChartTypeChange={handleChartTypeChange}
                fitContent={w.widgetKey === "recent-grievances"}
              >
                <WidgetRenderer widgetKey={w.widgetKey} chartType={w.chartType} />
              </WidgetShell>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </DashboardDataProvider>
  );
}
