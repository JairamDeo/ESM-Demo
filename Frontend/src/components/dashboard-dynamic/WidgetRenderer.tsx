import React from "react";
import { WidgetKey, ChartType } from "./config/dashboardLayoutDefaults";
import { GrievanceStatsWidget } from "./widgets/GrievanceStatsWidget";
import { RecentGrievancesWidget } from "./widgets/RecentGrievancesWidget";
import { CaseTypeWidget } from "./widgets/CaseTypeWidget";
import { TopStationsWidget } from "./widgets/TopStationsWidget";
import { QuickCountsWidget } from "./widgets/QuickCountsWidget";

interface WidgetRendererProps {
  widgetKey: WidgetKey;
  chartType: ChartType;
}

export function WidgetRenderer({ widgetKey, chartType }: WidgetRendererProps) {
  switch (widgetKey) {
    case "grievance-stats":
      return <GrievanceStatsWidget chartType={chartType} />;
    case "recent-grievances":
      return <RecentGrievancesWidget chartType={chartType} />;
    case "by-case-type":
      return <CaseTypeWidget chartType={chartType} />;
    case "top-stations":
      return <TopStationsWidget chartType={chartType} />;
    case "quick-counts":
      return <QuickCountsWidget chartType={chartType} />;
    default:
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
          Unknown Widget: {widgetKey}
        </div>
      );
  }
}
