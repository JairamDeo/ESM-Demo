import { useState, useEffect, useRef, useId } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export const grievanceProgressMap: Record<string, number> = {
  pending: 10,
  "in-progress": 80,
  escalated: 55,
  resolved: 100,
  closed: 100,
};

const SIZES = {
  sm: { px: 68, viewBox: 72, r: 28, stroke: 6, pctClass: "text-xs" },
  lg: { px: 96, viewBox: 112, r: 46, stroke: 6, pctClass: "text-xl font-bold text-primary" },
} as const;

type Size = keyof typeof SIZES;

export function AnimatedCircularProgress({
  progress,
  size = "sm",
  subtitle,
}: {
  progress: number;
  size?: Size;
  subtitle?: string;
}) {
  const cfg = SIZES[size];
  const circumference = 2 * Math.PI * cfg.r;
  const gradientId = `prog-${useId().replace(/:/g, "")}`;
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const target = Math.min(100, Math.max(0, progress));
    const duration = 1400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    setValue(0);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [progress]);

  const filled = (value / 100) * circumference;
  const display = Math.round(value);

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: cfg.px, height: cfg.px }}
    >
      <svg
        width={cfg.px}
        height={cfg.px}
        viewBox={`0 0 ${cfg.viewBox} ${cfg.viewBox}`}
        className="-rotate-90"
      >
        <circle
          cx={cfg.viewBox / 2}
          cy={cfg.viewBox / 2}
          r={cfg.r}
          fill="none"
          stroke="currentColor"
          strokeWidth={cfg.stroke}
          className="text-border"
        />
        <circle
          cx={cfg.viewBox / 2}
          cy={cfg.viewBox / 2}
          r={cfg.r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={cfg.stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-[stroke-dasharray] duration-75 ease-out"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F8DFF" />
            <stop offset="100%" stopColor="#826CF3" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${cfg.pctClass} tabular-nums ${size === "sm" ? "font-bold text-foreground" : ""}`}>
          {display}%
        </span>
        {subtitle && (
          <span className="text-[10px] text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
