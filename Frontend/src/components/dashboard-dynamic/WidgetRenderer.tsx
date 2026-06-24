import React from "react";
import { WidgetKey, ChartType } from "./config/dashboardLayoutDefaults";
import { GrievanceStatsWidget } from "./widgets/GrievanceStatsWidget";
import { RecentGrievancesWidget } from "./widgets/RecentGrievancesWidget";
import { CaseTypeWidget } from "./widgets/CaseTypeWidget";
import { TopStationsWidget } from "./widgets/TopStationsWidget";
import { QuickCountsWidget } from "./widgets/QuickCountsWidget";
import { StatusBreakdownWidget } from "./widgets/StatusBreakdownWidget";
import { TrendOverTimeWidget } from "./widgets/TrendOverTimeWidget";
import { AvgResolutionTimeWidget } from "./widgets/AvgResolutionTimeWidget";
import { PriorityWidget } from "./widgets/PriorityWidget";
import { SubmissionSourceWidget } from "./widgets/SubmissionSourceWidget";
import { EscalationRateWidget } from "./widgets/EscalationRateWidget";
import { SlaComplianceWidget } from "./widgets/SlaComplianceWidget";

interface WidgetRendererProps {
  widgetKey: WidgetKey;
  chartType: ChartType;
  isEditMode?: boolean;
}

export function WidgetRenderer({ widgetKey, chartType, isEditMode = false }: WidgetRendererProps) {
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
      return <QuickCountsWidget chartType={chartType} isEditMode={isEditMode} />;
    case "status-breakdown":
      return <StatusBreakdownWidget chartType={chartType} />;
    case "trend-over-time":
      return <TrendOverTimeWidget chartType={chartType} />;
    case "avg-resolution-time":
      return <AvgResolutionTimeWidget chartType={chartType} />;
    case "by-priority":
      return <PriorityWidget chartType={chartType} />;
    case "by-submission-source":
      return <SubmissionSourceWidget chartType={chartType} />;
    case "escalation-rate":
      return <EscalationRateWidget chartType={chartType} />;
    case "sla-compliance":
      return <SlaComplianceWidget chartType={chartType} />;
    default:
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
          Unknown Widget: {widgetKey}
        </div>
      );
  }
}
