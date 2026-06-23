import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { ChartType, WIDGET_CATALOG, WidgetKey } from "./config/dashboardLayoutDefaults";

interface ChartTypeMenuProps {
  widgetKey: WidgetKey;
  currentChart: ChartType;
  onChange: (chartType: ChartType) => void;
  onRemove: () => void;
}

const CHART_LABELS: Record<string, string> = {
  kpi: "KPI Cards",
  bar: "Bar Chart",
  pie: "Pie Chart",
  donut: "Donut Chart",
  list: "List",
  table: "Table",
};

export function ChartTypeMenu({ widgetKey, currentChart, onChange, onRemove }: ChartTypeMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const catalogItem = WIDGET_CATALOG.find((item) => item.widgetKey === widgetKey);
  const allowedCharts = catalogItem?.allowedCharts || [];

  // Calculate fixed position relative to viewport when opening
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = allowedCharts.length * 38 + 80;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight;

      setMenuStyle({
        position: "fixed",
        right: window.innerWidth - rect.right,
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
        width: 176,
        zIndex: 99999,
      });
    }
  }, [open, allowedCharts.length]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on scroll / resize
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (allowedCharts.length <= 1) {
    return (
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        title="Remove widget"
      >
        <span className="text-xs px-1">Remove</span>
      </button>
    );
  }

  const dropdown = open ? (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-card border border-border rounded-xl shadow-2xl py-1"
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        View As
      </div>
      {allowedCharts.map((chart) => (
        <button
          key={chart}
          type="button"
          onClick={() => {
            onChange(chart);
            setOpen(false);
          }}
          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
            currentChart === chart
              ? "bg-primary/10 text-primary font-medium"
              : "text-foreground hover:bg-secondary"
          }`}
        >
          <span>{CHART_LABELS[chart] ?? chart}</span>
          {currentChart === chart && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          )}
        </button>
      ))}
      <div className="my-1 border-t border-border" />
      <button
        type="button"
        onClick={() => {
          onRemove();
          setOpen(false);
        }}
        className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
      >
        Remove Widget
      </button>
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Render dropdown via portal so it always paints above all grid items */}
      {typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
