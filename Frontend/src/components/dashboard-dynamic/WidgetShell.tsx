import React from "react";
import { ChartTypeMenu } from "./ChartTypeMenu";
import { ChartType, WidgetKey, WIDGET_CATALOG } from "./config/dashboardLayoutDefaults";

interface WidgetShellProps {
  id: string;
  widgetKey: WidgetKey;
  chartType: ChartType;
  onChartTypeChange: (id: string, newType: ChartType) => void;
  children: React.ReactNode;
  fitContent?: boolean;
}

export function WidgetShell({
  id,
  widgetKey,
  chartType,
  onChartTypeChange,
  children,
  fitContent = false,
}: WidgetShellProps) {
  const catalogItem = WIDGET_CATALOG.find((item) => item.widgetKey === widgetKey);
  const title = catalogItem?.title || "Widget";

  return (
    <div
      className={`je-dash-card flex flex-col w-full bg-card border border-border/80 rounded-2xl group ${
        fitContent ? "h-auto max-h-full" : "h-full"
      }`}
      style={{ overflow: "visible" }}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="w-1 h-7 rounded-full bg-primary/80 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-[13px] tracking-tight truncate">{title}</h3>
            {catalogItem?.hint && (
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">{catalogItem.hint}</p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <ChartTypeMenu
            widgetKey={widgetKey}
            currentChart={chartType}
            onChange={(newType) => onChartTypeChange(id, newType)}
          />
        </div>
      </div>

      <div className={`${fitContent ? "p-4" : "flex-1 p-4 overflow-hidden min-h-0"} relative`}>
        {children}
      </div>
    </div>
  );
}
