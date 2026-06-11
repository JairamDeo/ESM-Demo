import { useLocation, useNavigate } from "react-router-dom";
import { Check, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

export default function Success() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    grievanceId = "GRV/2025/05/24/0815",
    caseType = "Update DOB",
    category = "Identity & Personal",
    concernType = "Self",
    stationHQ = "Nagpur",
    date = new Date(),
  } = location.state || {};

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(date);
      const datePart = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      }).format(d);
      const timePart = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit", minute: "2-digit", hour12: true,
      }).format(d);
      return `${datePart}, ${timePart}`;
    } catch {
      return "-";
    }
  }, [date]);

  const handleCopy = () => {
    navigator.clipboard.writeText(grievanceId);
    toast.success("Grievance ID copied to clipboard");
  };

  return (
    <div className="px-4 pb-8 min-h-full bg-background flex flex-col items-center pt-8">

      {/* Success Icon — green glow rings */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Outer glow ring */}
        <div className="absolute w-28 h-28 rounded-full bg-green-500/10" />
        <div className="absolute w-24 h-24 rounded-full bg-green-500/15" />
        {/* Inner circle */}
        <div className="w-20 h-20 rounded-full bg-[#34D35D] flex items-center justify-center shadow-[0_0_24px_rgba(52,211,93,0.4)] z-10">
          <Check className="w-9 h-9 text-white stroke-[3]" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-foreground mb-2 text-center">
        Grievance submitted Successfully!
      </h1>
      <p className="text-sm text-muted-foreground text-center max-w-[260px] leading-relaxed mb-8">
        Your grievance has been submitted successfully & is being processed
      </p>

      {/* Details Card */}
      <div className="w-full bg-card border border-border rounded-2xl overflow-hidden">

        {/* Grievance ID row */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#826CF3]/15 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-[#826CF3]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Grievance ID</p>
              <p className="text-sm font-bold text-amber-500 dark:text-[#F0C902]">{grievanceId}</p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 hover:bg-secondary transition-colors"
          >
            <Copy className="w-4 h-4 text-foreground" />
            <span className="text-sm text-foreground font-medium">Copy</span>
          </button>
        </div>

        {/* Detail rows */}
        <div className="px-4 divide-y divide-border">

          <div className="flex items-center justify-between py-3.5">
            <span className="text-sm text-muted-foreground">Date & Time</span>
            <span className="text-sm text-foreground font-medium text-right">{formattedDate}</span>
          </div>

          <div className="flex items-start justify-between py-3.5">
            <span className="text-sm text-muted-foreground pt-0.5">Service</span>
            <div className="text-right flex flex-col items-end gap-1">
              <span className="text-sm text-foreground font-medium">{category}</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                {caseType}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <span className="text-sm text-muted-foreground">Concern Type</span>
            <span className="text-sm text-foreground font-medium">{concernType}</span>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <span className="text-sm text-muted-foreground">Station HQ</span>
            <span className="text-sm text-foreground font-medium">{stationHQ}</span>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="text-sm font-semibold text-[#34D35D]">Submitted</span>
          </div>

        </div>
      </div>

      {/* Back to Home */}
      <button
        onClick={() => navigate("/user")}
        className="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Back to Home
      </button>

    </div>
  );
}