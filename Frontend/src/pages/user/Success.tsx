import { useLocation, useNavigate } from "react-router-dom";
import { Check, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export default function Success() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
    toast.success("Copied to clipboard");
  };

  return (
    <div className="px-4 pb-8 min-h-full bg-background flex flex-col items-center pt-8">

      {/* Success Icon — green glow rings */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Outer glow ring */}
         <div className="absolute w-28 h-28 rounded-full bg-green-500/20 dark:bg-green-500/10" />
         <div className="absolute w-24 h-24 rounded-full bg-green-500/30 dark:bg-green-500/15" />
        {/* Inner circle */}
        <div className="w-20 h-20 rounded-full bg-[#05B642] flex items-center justify-center shadow-[0_0_24px_rgba(52,211,93,0.4)] z-10">
          <img src="/icons/check-fill.svg" className="w-9 h-9 text-white stroke-[3]" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-foreground mb-2 text-center">
        {t("grievanceSubmitted")}
      </h1>
      <p className="text-sm text-foreground/70 text-center max-w-[260px] leading-relaxed mb-8">
        {t("successMessage")}
      </p>

      {/* Details Card */}
      <div className="w-full bg-card border border-border rounded-2xl overflow-hidden">

        {/* Grievance ID row */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full dark:bg-[#272723] bg-[#826CF3] flex items-center justify-center flex-shrink-0">
              <img src="/icons/file.svg" className="w-5 h-5 brightness-0 invert dark:brightness-100 dark:invert-0" />
            </div>
            <div>
              <p className="text-xs text-foreground mb-0.5">Grievance ID</p>
              <p className="text-sm font-bold text-[#155DFC] dark:text-[#F0C902]">{grievanceId}</p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 border border-primary rounded-md px-3 py-1.5 hover:bg-secondary transition-colors"
          >
            <Copy className="w-4 h-4 text-foreground" />
            <span className="text-sm dark:text-foreground text-[#826CF3] font-medium">Copy</span>
          </button>
        </div>

        {/* Detail rows */}
        <div className="px-4 divide-y divide-border">

          <div className="flex items-center justify-between py-3.5">
            <span className="text-sm text-foreground">Date & Time</span>
            <span className="text-sm text-foreground font-medium text-right">{formattedDate}</span>
          </div>

          <div className="flex items-start justify-between py-3.5">
            <span className="text-sm text-foreground pt-0.5">{t("services")}</span>
            <div className="text-right flex flex-col items-end gap-1">
              <span className="text-sm text-foreground font-medium ">{category}</span>
              <span className="text-sm text-foreground flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-foreground flex-shrink-0" />
                {caseType}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <span className="text-sm text-foreground">{t("concernFor")}</span>
            <span className="text-sm text-foreground font-medium">{concernType === "Self" ? t("self") : concernType === "Dependent" ? t("dependent") : concernType}</span>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <span className="text-sm text-foreground">{t("stationHQLabel")}</span>
            <span className="text-sm text-foreground font-medium">{stationHQ}</span>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <span className="text-sm text-foreground">{t("status")}</span>
            <span className="text-sm font-semibold text-[#20A13C]">Submitted</span>
          </div>

        </div>
      </div>

      {/* Back to Home */}
      <button
        onClick={() => navigate("/user")}
        className="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {t("backToHome")}
      </button>

    </div>
  );
}