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
    defaultChart: "list",
    allowedCharts: ["list", "table"],
    defaultW: 8,
    defaultH: 5,
    minW: 4,
    minH: 4,
  },
  {
    widgetKey: "by-case-type",
    title: "By Case Type",
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
    defaultChart: "bar",
    allowedCharts: ["bar"],
    defaultW: 8,
    defaultH: 5,
    minW: 4,
    minH: 4,
  },
  {
    widgetKey: "quick-counts",
    title: "Quick Counts",
    defaultChart: "kpi",
    allowedCharts: ["kpi"],
    defaultW: 4,
    defaultH: 5,
    minW: 3,
    minH: 4,
  },
  {
    widgetKey: "status-breakdown",
    title: "Status Breakdown",
    defaultChart: "donut",
    allowedCharts: ["donut", "pie", "bar"],
    defaultW: 4,
    defaultH: 5,
    minW: 3,
    minH: 4,
  },
  {
    widgetKey: "trend-over-time",
    title: "Trend Over Time",
    defaultChart: "line",
    allowedCharts: ["line", "bar"],
    defaultW: 8,
    defaultH: 5,
    minW: 4,
    minH: 4,
  },
  {
    widgetKey: "avg-resolution-time",
    title: "Avg Resolution Time",
    defaultChart: "kpi",
    allowedCharts: ["kpi"],
    defaultW: 4,
    defaultH: 3,
    minW: 3,
    minH: 3,
  },
  {
    widgetKey: "by-priority",
    title: "Grievances by Priority",
    defaultChart: "pie",
    allowedCharts: ["pie", "donut", "bar"],
    defaultW: 4,
    defaultH: 5,
    minW: 3,
    minH: 4,
  },
  {
    widgetKey: "by-submission-source",
    title: "Submission Source",
    defaultChart: "donut",
    allowedCharts: ["donut", "pie", "bar"],
    defaultW: 4,
    defaultH: 5,
    minW: 3,
    minH: 4,
  },
  {
    widgetKey: "escalation-rate",
    title: "Escalation Rate",
    defaultChart: "kpi",
    allowedCharts: ["kpi"],
    defaultW: 4,
    defaultH: 3,
    minW: 3,
    minH: 3,
  },
  {
    widgetKey: "sla-compliance",
    title: "SLA Compliance",
    defaultChart: "donut",
    allowedCharts: ["donut", "pie", "bar"],
    defaultW: 4,
    defaultH: 5,
    minW: 3,
    minH: 4,
  },
];

export const FRONTEND_LAYOUT_DEFAULTS: DashboardWidgetConfig[] = [
  { id: "grievance-stats", widgetKey: "grievance-stats", chartType: "kpi", x: 0, y: 0, w: 12, h: 3, minW: 4, minH: 3 },
  { id: "recent-grievances", widgetKey: "recent-grievances", chartType: "list", x: 0, y: 3, w: 8, h: 5, minW: 4, minH: 4 },
  { id: "by-case-type", widgetKey: "by-case-type", chartType: "donut", x: 8, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
  { id: "top-stations", widgetKey: "top-stations", chartType: "bar", x: 0, y: 8, w: 8, h: 5, minW: 4, minH: 4 },
  { id: "quick-counts", widgetKey: "quick-counts", chartType: "kpi", x: 8, y: 8, w: 4, h: 5, minW: 3, minH: 4 },
  { id: "status-breakdown", widgetKey: "status-breakdown", chartType: "donut", x: 0, y: 13, w: 4, h: 5, minW: 3, minH: 4 },
  { id: "trend-over-time", widgetKey: "trend-over-time", chartType: "line", x: 4, y: 13, w: 8, h: 5, minW: 4, minH: 4 },
  { id: "avg-resolution-time", widgetKey: "avg-resolution-time", chartType: "kpi", x: 0, y: 18, w: 4, h: 3, minW: 3, minH: 3 },
  { id: "by-priority", widgetKey: "by-priority", chartType: "pie", x: 4, y: 18, w: 4, h: 5, minW: 3, minH: 4 },
  { id: "by-submission-source", widgetKey: "by-submission-source", chartType: "donut", x: 8, y: 18, w: 4, h: 5, minW: 3, minH: 4 },
  { id: "escalation-rate", widgetKey: "escalation-rate", chartType: "kpi", x: 0, y: 23, w: 4, h: 3, minW: 3, minH: 3 },
  { id: "sla-compliance", widgetKey: "sla-compliance", chartType: "donut", x: 4, y: 23, w: 4, h: 5, minW: 3, minH: 4 },
];
