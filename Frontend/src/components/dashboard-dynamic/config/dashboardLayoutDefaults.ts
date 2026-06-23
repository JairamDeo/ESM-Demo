export type WidgetKey =
  | "grievance-stats"
  | "recent-grievances"
  | "by-case-type"
  | "top-stations"
  | "quick-counts";

export type ChartType = "kpi" | "list" | "table" | "donut" | "pie" | "bar";

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
];

export const FRONTEND_LAYOUT_DEFAULTS: DashboardWidgetConfig[] = [
  { id: "grievance-stats", widgetKey: "grievance-stats", chartType: "kpi", x: 0, y: 0, w: 12, h: 3, minW: 4, minH: 3 },
  { id: "recent-grievances", widgetKey: "recent-grievances", chartType: "list", x: 0, y: 3, w: 8, h: 5, minW: 4, minH: 4 },
  { id: "by-case-type", widgetKey: "by-case-type", chartType: "donut", x: 8, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
  { id: "top-stations", widgetKey: "top-stations", chartType: "bar", x: 0, y: 8, w: 8, h: 5, minW: 4, minH: 4 },
  { id: "quick-counts", widgetKey: "quick-counts", chartType: "kpi", x: 8, y: 8, w: 4, h: 5, minW: 3, minH: 4 },
];
