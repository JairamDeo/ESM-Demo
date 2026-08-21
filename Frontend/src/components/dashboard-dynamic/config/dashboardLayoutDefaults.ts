export type WidgetKey =
  | "grievance-stats"
  | "recent-grievances"
  | "by-case-type"
  | "top-stations"
  | "quick-counts"
  | "status-breakdown"
  | "trend-over-time"
  | "avg-resolution-time"
  | "by-priority"
  | "by-submission-source"
  | "escalation-rate"
  | "sla-compliance";

export type ChartType = "kpi" | "list" | "table" | "donut" | "pie" | "bar" | "line";

export interface DashboardWidgetConfig {
  id: string;
  widgetKey: WidgetKey;
  chartType: ChartType;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
}

export interface WidgetCatalogItem {
  widgetKey: WidgetKey;
  title: string;
  hint?: string;
  defaultChart: ChartType;
  allowedCharts: ChartType[];
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
}

export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  {
    widgetKey: "grievance-stats",
    title: "Grievance Stats",
    hint: "Total, pending, resolved, and sent to higher HQ",
    defaultChart: "kpi",
    allowedCharts: ["kpi", "bar"],
    defaultW: 12,
    defaultH: 3,
    minW: 4,
    minH: 3,
  },
  {
    widgetKey: "recent-grievances",
    title: "Recent Grievances",
    hint: "Latest open cases that still need action",
    defaultChart: "table",
    allowedCharts: ["table", "list"],
    defaultW: 12,
    defaultH: 4,
    minW: 4,
    minH: 3,
  },
  {
    widgetKey: "by-case-type",
    title: "Grievance Types",
    hint: "How many grievances of each type",
    defaultChart: "donut",
    allowedCharts: ["donut", "pie", "bar"],
    defaultW: 4,
    defaultH: 5,
    minW: 3,
    minH: 4,
  },
  {
    widgetKey: "top-stations",
    title: "Top Stations",
    hint: "Stations with the most grievances",
    defaultChart: "bar",
    allowedCharts: ["bar"],
    defaultW: 8,
    defaultH: 5,
    minW: 4,
    minH: 4,
  },
  // Hidden from dashboard for now — uncomment to restore the add-widget option.
  // {
  //   widgetKey: "quick-counts",
  //   title: "Quick Counts",
  //   defaultChart: "kpi",
  //   allowedCharts: ["kpi"],
  //   defaultW: 4,
  //   defaultH: 5,
  //   minW: 3,
  //   minH: 4,
  // },
  {
    widgetKey: "status-breakdown",
    title: "Grievance Status",
    hint: "Pending, in progress, or resolved",
    defaultChart: "bar",
    allowedCharts: ["bar", "pie", "donut"],
    defaultW: 6,
    defaultH: 5,
    minW: 3,
    minH: 4,
  },
  {
    widgetKey: "trend-over-time",
    title: "Monthly Trend",
    hint: "New grievances vs resolved each month",
    defaultChart: "line",
    allowedCharts: ["line", "bar"],
    defaultW: 6,
    defaultH: 5,
    minW: 4,
    minH: 4,
  },
  {
    widgetKey: "avg-resolution-time",
    title: "Time to Resolve",
    hint: "Average time to close a grievance",
    defaultChart: "kpi",
    allowedCharts: ["kpi"],
    defaultW: 4,
    defaultH: 5,
    minW: 3,
    minH: 3,
  },
  {
    widgetKey: "by-priority",
    title: "Priority Level",
    hint: "High, medium, and low priority cases",
    defaultChart: "bar",
    allowedCharts: ["bar", "pie", "donut"],
    defaultW: 4,
    defaultH: 5,
    minW: 3,
    minH: 4,
  },
  {
    widgetKey: "by-submission-source",
    title: "How Submitted",
    hint: "Portal, QR code, walk-in, or added by admin",
    defaultChart: "bar",
    allowedCharts: ["bar", "pie", "donut"],
    defaultW: 4,
    defaultH: 5,
    minW: 3,
    minH: 4,
  },
  {
    widgetKey: "escalation-rate",
    title: "Sent to Higher HQ",
    hint: "Percent of grievances escalated upward",
    defaultChart: "kpi",
    allowedCharts: ["kpi"],
    defaultW: 6,
    defaultH: 5,
    minW: 3,
    minH: 3,
  },
  {
    widgetKey: "sla-compliance",
    title: "On Time vs Overdue",
    hint: "Closed within the allowed time limit",
    defaultChart: "donut",
    allowedCharts: ["donut", "pie", "bar"],
    defaultW: 6,
    defaultH: 5,
    minW: 3,
    minH: 4,
  },
];

export const FRONTEND_LAYOUT_DEFAULTS: DashboardWidgetConfig[] = [
  { id: "grievance-stats", widgetKey: "grievance-stats", chartType: "kpi", x: 0, y: 0, w: 12, h: 3, minW: 4, minH: 3 },
  { id: "recent-grievances", widgetKey: "recent-grievances", chartType: "table", x: 0, y: 3, w: 12, h: 4, minW: 4, minH: 3 },
  { id: "by-case-type", widgetKey: "by-case-type", chartType: "donut", x: 0, y: 7, w: 4, h: 5, minW: 3, minH: 4 },
  { id: "top-stations", widgetKey: "top-stations", chartType: "bar", x: 4, y: 7, w: 8, h: 5, minW: 4, minH: 4 },
  // { id: "quick-counts", widgetKey: "quick-counts", chartType: "kpi", x: 8, y: 7, w: 4, h: 5, minW: 3, minH: 4 },
  { id: "status-breakdown", widgetKey: "status-breakdown", chartType: "bar", x: 0, y: 12, w: 6, h: 5, minW: 3, minH: 4 },
  { id: "trend-over-time", widgetKey: "trend-over-time", chartType: "line", x: 6, y: 12, w: 6, h: 5, minW: 4, minH: 4 },
  { id: "avg-resolution-time", widgetKey: "avg-resolution-time", chartType: "kpi", x: 0, y: 17, w: 4, h: 5, minW: 3, minH: 3 },
  { id: "by-priority", widgetKey: "by-priority", chartType: "bar", x: 4, y: 17, w: 4, h: 5, minW: 3, minH: 4 },
  { id: "by-submission-source", widgetKey: "by-submission-source", chartType: "bar", x: 8, y: 17, w: 4, h: 5, minW: 3, minH: 4 },
  { id: "escalation-rate", widgetKey: "escalation-rate", chartType: "kpi", x: 0, y: 22, w: 6, h: 5, minW: 3, minH: 3 },
  { id: "sla-compliance", widgetKey: "sla-compliance", chartType: "donut", x: 6, y: 22, w: 6, h: 5, minW: 3, minH: 4 },
];
