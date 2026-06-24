import React, { useMemo, useState } from "react";
import { Building2, Users, QrCode, GripVertical } from "lucide-react";
import { useDashboardData } from "../DashboardDataContext";

export function QuickCountsWidget({ chartType, isEditMode = false }: { chartType: string; isEditMode?: boolean }) {
  const { data, isLoading } = useDashboardData();
  const counts = useMemo(() => data?.counts || { stations: 0, officers: 0, activeQR: 0 }, [data]);

  const allRows = useMemo(() => ({
    stations: { id: "stations", icon: Building2, label: "Station HQs", value: counts.stations, cls: "text-primary bg-primary/15" },
    officers: { id: "officers", icon: Users, label: "Active Officers", value: counts.officers, cls: "text-info bg-info/15" },
    activeQR: { id: "activeQR", icon: QrCode, label: "QR Active", value: counts.activeQR, cls: "text-success bg-success/15" },
  }), [counts]);

  const [order, setOrder] = useState(["stations", "officers", "activeQR"]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isEditMode) return;
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!isEditMode || !draggedItem || draggedItem === id) return;

    const currentOrder = [...order];
    const draggedIndex = currentOrder.indexOf(draggedItem);
    const targetIndex = currentOrder.indexOf(id);

    currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedItem);
    setOrder(currentOrder);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 h-full">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="flex-1 rounded-xl border border-border bg-secondary/20 animate-pulse min-h-[70px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1">
      {order.map((id) => {
        const row = allRows[id as keyof typeof allRows];
        if (!row) return null;
        
        return (
          <div
            key={row.id}
            draggable={isEditMode}
            onDragStart={(e) => handleDragStart(e, row.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, row.id)}
            className={`flex items-center gap-3 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/30 px-3 py-3 flex-1 min-h-[70px] transition-colors ${
              isEditMode ? "group cursor-grab active:cursor-grabbing" : "cursor-default"
            } ${
              draggedItem === row.id ? "opacity-40 border-dashed" : "opacity-100"
            }`}
          >
            {isEditMode && (
              <div className="shrink-0 flex items-center justify-center text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors">
                <GripVertical className="w-5 h-5" />
              </div>
            )}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${row.cls}`}>
              <row.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold text-foreground tabular-nums leading-none mb-1">
                {row.value}
              </p>
              <p className="text-xs text-muted-foreground truncate">{row.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
