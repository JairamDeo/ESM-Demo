import React from "react";
import { GripHorizontal } from "lucide-react";
import { ChartTypeMenu } from "./ChartTypeMenu";
import { ChartType, WidgetKey, WIDGET_CATALOG } from "./config/dashboardLayoutDefaults";

interface WidgetShellProps {
  id: string;
  widgetKey: WidgetKey;
  chartType: ChartType;
  isEditMode: boolean;
  onChartTypeChange: (id: string, newType: ChartType) => void;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}

export function WidgetShell({
  id,
  widgetKey,
  chartType,
  isEditMode,
  onChartTypeChange,
  onRemove,
  children,
}: WidgetShellProps) {
  const catalogItem = WIDGET_CATALOG.find((item) => item.widgetKey === widgetKey);
  const title = catalogItem?.title || "Widget";

  return (
    <div className="flex flex-col h-full w-full bg-card border border-border rounded-2xl shadow-sm group" style={{ overflow: "visible" }}>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b border-border transition-colors ${
          isEditMode ? "je-widget-drag-zone cursor-grab active:cursor-grabbing hover:bg-secondary/40" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          {isEditMode && <GripHorizontal className="w-4 h-4 text-muted-foreground/50" />}
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        </div>
        
        {isEditMode && (
          <div className="shrink-0">
            <ChartTypeMenu
              widgetKey={widgetKey}
              currentChart={chartType}
              onChange={(newType) => onChartTypeChange(id, newType)}
              onRemove={() => onRemove(id)}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}
