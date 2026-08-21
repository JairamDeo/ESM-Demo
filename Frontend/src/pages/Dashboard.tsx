import { memo, useState } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { useDashboard } from "@/hooks/useApi";
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

  const selectedLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label || "All Time";

  return (
    <div className="space-y-5 animate-fade-in pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[1.65rem] font-semibold text-foreground tracking-tight leading-none">Dashboard</h1>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 min-w-[11.5rem] px-3.5 py-2.5 bg-card/90 border border-border rounded-2xl text-sm text-foreground hover:border-primary/30 hover:bg-card transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <span className="flex-1 text-left truncate font-medium">{selectedLabel}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl py-1.5 w-52 overflow-hidden">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPeriod(opt.value);
                      setDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-sm transition-colors text-left ${
                      period === opt.value
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary/70"
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
