import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Save, RefreshCw, LayoutTemplate, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { WidgetShell } from "./WidgetShell";
import { WidgetRenderer } from "./WidgetRenderer";
import { DashboardDataProvider } from "./DashboardDataContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  DashboardWidgetConfig,
  WIDGET_CATALOG,
  FRONTEND_LAYOUT_DEFAULTS,
  ChartType,
  WidgetKey
} from "./config/dashboardLayoutDefaults";
import {
  useDashboardLayout,
  useSaveDashboardLayout,
  useResetDashboardLayout,
} from "@/hooks/useApi";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widgets whose default was changed to "bar". Force "bar" over any old saved "donut"/"pie" values.
const MIGRATED_BAR_WIDGETS = new Set(["status-breakdown", "by-submission-source", "by-priority"]);

import { DashboardData } from "./DashboardDataContext";

interface DynamicDashboardProps {
  data: DashboardData | null;
  isLoading: boolean;
  period: string;
}

export function DynamicDashboard({ data, isLoading, period }: DynamicDashboardProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.widget-dropdown-container')) {
        setIsWidgetMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const { data: layoutData, isLoading: isLayoutLoading } = useDashboardLayout();
  const saveLayout = useSaveDashboardLayout();
  const resetLayout = useResetDashboardLayout();

  useEffect(() => {
    if (layoutData?.layout) {
      const gsWidget = layoutData.layout.find(
        (w: DashboardWidgetConfig) => w.widgetKey === "grievance-stats"
      );

      const migrateChartType = (w: DashboardWidgetConfig): DashboardWidgetConfig => {
        // Force "bar" for these widgets if they still have an old "donut" or "pie" saved value
        if (MIGRATED_BAR_WIDGETS.has(w.widgetKey) && (w.chartType === "donut" || w.chartType === "pie")) {
          return { ...w, chartType: "bar" };
        }
        return w;
      };

      if (gsWidget && gsWidget.y === 0 && gsWidget.h >= 3) {
        // Layout is fully correct — use as-is, only enforce min height + migrate chart types
        const fixedLayout = layoutData.layout.map((w: DashboardWidgetConfig) => {
          const migrated = migrateChartType(w);
          if (migrated.widgetKey === "grievance-stats") {
            return { ...migrated, h: Math.max(migrated.h, 3), minH: 3 };
          }
          return migrated;
        });
        setWidgets(fixedLayout);
      } else {
        // Old / corrupted layout — rebuild positions from defaults but keep saved chart types
        const savedChartTypes: Record<string, string> = {};
        layoutData.layout.forEach((w: DashboardWidgetConfig) => {
          savedChartTypes[w.widgetKey] = w.chartType;
        });
        const fixedLayout = FRONTEND_LAYOUT_DEFAULTS.map((defaultWidget) => {
          const savedType = (savedChartTypes[defaultWidget.widgetKey] as ChartType) ?? defaultWidget.chartType;
          // Migrate old "donut" or "pie" saves to "bar" for affected widgets
          const chartType = MIGRATED_BAR_WIDGETS.has(defaultWidget.widgetKey) && (savedType === "donut" || savedType === "pie")
            ? "bar"
            : savedType;
          return { ...defaultWidget, chartType };
        });
        setWidgets(fixedLayout);
      }
      setHasUnsavedChanges(false);
    } else if (!isLayoutLoading) {
      setWidgets(FRONTEND_LAYOUT_DEFAULTS);
    }
  }, [layoutData, isLayoutLoading]);


  const onLayoutChange = useCallback((layout: Layout) => {
    if (!isEditMode) return;
    
    setWidgets((prev) => {
      const updated = prev.map((w) => {
        const l = layout.find((item) => item.i === w.id);
        if (l) {
          return { ...w, x: l.x, y: l.y, w: l.w, h: l.h };
        }
        return w;
      });
      // Check if actually changed
      const changed = JSON.stringify(prev) !== JSON.stringify(updated);
      if (changed) setHasUnsavedChanges(true);
      return updated;
    });
  }, [isEditMode]);

  const handleChartTypeChange = useCallback((id: string, newType: ChartType) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, chartType: newType } : w)));
    setHasUnsavedChanges(true);
  }, []);

  const handleRemoveWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    setHasUnsavedChanges(true);
  }, []);

  const handleAddWidget = useCallback((widgetKey: WidgetKey) => {
    const catalogItem = WIDGET_CATALOG.find((i) => i.widgetKey === widgetKey);
    if (!catalogItem) return;

    // Check if already exists (we only allow 1 instance of each widget for now)
    if (widgets.some((w) => w.widgetKey === widgetKey)) {
      toast.error("Widget already exists on dashboard");
      return;
    }

    const newWidget: DashboardWidgetConfig = {
      id: `${widgetKey}-${Date.now()}`,
      widgetKey,
      chartType: catalogItem.defaultChart,
      x: 0,
      y: Infinity, // puts it at the bottom
      w: catalogItem.defaultW,
      h: catalogItem.defaultH,
      minW: catalogItem.minW,
      minH: catalogItem.minH,
    };

    setWidgets((prev) => [...prev, newWidget]);
    setHasUnsavedChanges(true);
  }, [widgets]);

  const handleSave = () => {
    saveLayout.mutate({ widgets }, {
      onSuccess: () => setHasUnsavedChanges(false)
    });
  };

  const handleReset = () => {
    setIsResetDialogOpen(true);
  };

  const confirmReset = () => {
    resetLayout.mutate(undefined, {
      onSuccess: () => {
        // Always use frontend defaults here in case backend hasn't restarted with new defaults
        setWidgets(FRONTEND_LAYOUT_DEFAULTS);
        setHasUnsavedChanges(false);
        setIsResetDialogOpen(false);
      }
    });
  };

  // Build grid layout format
  const layout = useMemo(() => {
    return widgets.map((w) => ({
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: w.minW,
      minH: w.minH,
      static: !isEditMode,
    }));
  }, [widgets, isEditMode]);

  const availableWidgetsToAdd = WIDGET_CATALOG.filter(
    (item) => !widgets.some((w) => w.widgetKey === item.widgetKey)
  );

  if (isLayoutLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard layout...</div>;
  }

  return (
    <DashboardDataProvider data={data} isLoading={isLoading} period={period}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isEditMode
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Settings2 className="w-4 h-4" />
              {isEditMode ? "Finish Editing" : "Customize Dashboard"}
            </button>
            
            {isEditMode && hasUnsavedChanges && (
              <span className="text-xs text-warning font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                Unsaved changes
              </span>
            )}
          </div>

          {isEditMode && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative mr-2 widget-dropdown-container">
                <button
                  type="button"
                  onClick={() => setIsWidgetMenuOpen(!isWidgetMenuOpen)}
                  disabled={availableWidgetsToAdd.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> Add Widget
                </button>
                {isWidgetMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg transition-all z-50 py-1">
                    {availableWidgetsToAdd.length > 0 ? (
                      availableWidgetsToAdd.map((item) => (
                        <button
                          key={item.widgetKey}
                          type="button"
                          onClick={() => {
                            handleAddWidget(item.widgetKey);
                            setIsWidgetMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
                        >
                          <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
                          {item.title}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                        All widgets added
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleReset}
                disabled={resetLayout.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${resetLayout.isPending ? "animate-spin" : ""}`} />
                Reset
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!hasUnsavedChanges || saveLayout.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Layout
              </button>
            </div>
          )}
        </div>

        {/* Grid Layout */}
        <div className="dashboard-grid-container -mx-4 sm:mx-0">
          <ResponsiveGridLayout
            className="layout je-dashboard-grid"
            layouts={{ lg: layout, md: layout, sm: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 12, sm: 12, xs: 1, xxs: 1 }}
            rowHeight={50}
            containerPadding={[16, 16]}
            margin={[16, 16]}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            draggableHandle=".je-widget-drag-zone"
            onLayoutChange={onLayoutChange}
            useCSSTransforms={true}
          >
            {widgets.map((w) => (
              <div key={w.id} className="relative z-0 bg-transparent flex flex-col">
                <WidgetShell
                  id={w.id}
                  widgetKey={w.widgetKey}
                  chartType={w.chartType}
                  isEditMode={isEditMode}
                  onChartTypeChange={handleChartTypeChange}
                  onRemove={handleRemoveWidget}
                >
                  <WidgetRenderer widgetKey={w.widgetKey} chartType={w.chartType} isEditMode={isEditMode} />
                </WidgetShell>
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      </div>

      <ConfirmDialog
        open={isResetDialogOpen}
        title="Reset Dashboard"
        message="Are you sure you want to reset your dashboard to the default layout? All custom positioning and sizing will be lost."
        confirmLabel="Reset"
        variant="danger"
        loading={resetLayout.isPending}
        onConfirm={confirmReset}
        onClose={() => setIsResetDialogOpen(false)}
      />
    </DashboardDataProvider>
  );
}
