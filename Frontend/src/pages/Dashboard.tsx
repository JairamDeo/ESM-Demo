import { memo, useState } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { useDashboard } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { DynamicDashboard } from "@/components/dashboard-dynamic/DynamicDashboard";

const PERIOD_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "this_year", label: `This Year (${new Date().getFullYear()})` },
];

export default memo(function Dashboard() {
  const [period, setPeriod] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { data, isLoading } = useDashboard(period);
  const { user } = useAuth();

  const selectedLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label || "All Time";
  const scopeLabel = user?.stateName || user?.hqName || user?.stationName || "your scope";

  return (
    <div className="space-y-6 animate-fade-in pb-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Grievance overview · {scopeLabel}
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 min-w-[11rem] px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground hover:bg-secondary/50 transition-colors shadow-sm"
          >
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left truncate">{selectedLabel}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-20 bg-card border border-border rounded-xl shadow-xl py-1 w-52">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPeriod(opt.value);
                      setDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2.5 text-sm transition-colors text-left ${
                      period === opt.value
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {opt.label}
                    {period === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <DynamicDashboard data={data} isLoading={isLoading} period={period} />
    </div>
  );
});
