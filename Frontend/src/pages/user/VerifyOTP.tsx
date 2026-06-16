import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Sun, Moon, Clock } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const DEFAULT_EXPIRY = 120;
const DEFAULT_RESEND_AFTER = 30;

export default memo(function VerifyOTP() {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [expiryTimer, setExpiryTimer] = useState(DEFAULT_EXPIRY);
  const [resendTimer, setResendTimer] = useState(DEFAULT_RESEND_AFTER);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { sendOtp, verifyOtp } = useAuth();
  const phone = (location.state as any)?.phone || "";
  const { t } = useTranslation();

  useEffect(() => {
    if (!phone) {
      navigate("/user/login");
      return;
    }
    const state = location.state as any;
    if (state?.expiresIn) setExpiryTimer(state.expiresIn);
    if (state?.resendAfter) setResendTimer(state.resendAfter);
    if (state?.devOtp) setDevOtp(state.devOtp);
  }, [phone, navigate, location.state]);

  useEffect(() => {
    const interval = setInterval(() => {
      setExpiryTimer((t) => (t > 0 ? t - 1 : 0));
      setResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (value.length > 1) return;
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < 3) inputRefs.current[index + 1]?.focus();
    },
    [otp]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
    },
    [otp]
  );

  const handleVerify = useCallback(async () => {
    const otpValue = otp.join("");
    if (otpValue.length < 4) return;
    if (expiryTimer <= 0) {
      toast.error("OTP expired. Please resend a new code.");
      return;
    }
    setLoading(true);
    try {
      const { isNewUser } = await verifyOtp(phone, otpValue);
      toast.success("Verified successfully!");
      if (isNewUser) {
        navigate("/user/complete-profile");
      } else {
        navigate("/user");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid OTP. Please try again.");
      setOtp(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [otp, phone, verifyOtp, navigate, expiryTimer]);

  const handleResend = useCallback(async () => {
    if (resendTimer > 0) return;
    setResending(true);
    try {
      const result = await sendOtp(phone);
      setExpiryTimer(result.expiresIn ?? DEFAULT_EXPIRY);
      setResendTimer(result.resendAfter ?? DEFAULT_RESEND_AFTER);
      setOtp(["", "", "", ""]);
      inputRefs.current[0]?.focus();
      if (result.devOtp) setDevOtp(result.devOtp);
      toast.success(result.smsSent ? "New OTP sent to your mobile" : "New OTP generated");
    } catch (err: any) {
      const retry = err?.response?.data?.retryAfter;
      toast.error(
        err?.response?.data?.message ||
          (retry ? `Please wait ${retry}s before resending` : "Failed to resend OTP")
      );
      if (retry) setResendTimer(retry);
    } finally {
      setResending(false);
    }
  }, [resendTimer, phone, sendOtp]);

  const maskedPhone = phone.length >= 10 ? `****${phone.slice(-4)}` : `****${phone}`;
  const expiryMinutes = Math.floor(expiryTimer / 60);
  const expirySeconds = expiryTimer % 60;

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-muted/40 dark:bg-zinc-950 flex items-stretch justify-center sm:items-center sm:p-6">
      <div className="flex flex-col w-full h-full max-h-[100dvh] bg-background overflow-hidden sm:h-auto sm:max-h-[90dvh] sm:max-w-sm sm:rounded-3xl sm:shadow-xl sm:dark:border sm:dark:border-border px-5 sm:px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pt-10 sm:pb-8">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between mb-3 sm:mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-muted-foreground border border-border"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-muted-foreground border border-border"
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Scroll only if keyboard / very small screen needs it */}
        <div className="flex-1 min-h-0 flex flex-col justify-center overflow-y-auto overscroll-contain scrollbar-none py-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-2 sm:mb-3 text-center">
            {t("verifyOtp")}
          </h1>
          <p className="text-xs text-foreground/80 text-center leading-relaxed mb-4 sm:mb-6 px-1">
            {t("otpSentTo")}{" "}
            <span className="font-semibold text-foreground">{maskedPhone}</span>
          </p>

          <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-[17rem] sm:max-w-xs w-full mx-auto mb-4 sm:mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="tel"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="aspect-[4/5] max-h-[4.5rem] sm:max-h-20 w-full rounded-xl bg-[#FFFFFF] dark:bg-[#2B2B2B] border border-border text-center text-xl sm:text-2xl font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            ))}
          </div>

          <div className="flex justify-center mb-2 sm:mb-3">
            <div
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full ${
                expiryTimer > 0 ? "bg-[#1754CF] dark:bg-black/20" : "bg-destructive/15"
              }`}
            >
              <Clock
                className={`w-3.5 h-3.5 ${expiryTimer > 0 ? "text-[#FFFFFF] dark:text-[#73A2FF]" : "text-destructive"}`}
              />
              <span
                className={`text-xs sm:text-sm font-normal ${expiryTimer > 0 ? "text-[#FFFFFF] dark:text-[#73A2FF]" : "text-destructive"}`}
              >
                {expiryTimer > 0
                  ? `${String(expiryMinutes).padStart(2, "0")}:${String(expirySeconds).padStart(2, "0")}`
                  : t("expired")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mb-2 sm:mb-4 px-1">
            <p className="text-xs sm:text-sm text-muted-foreground">{t("didntReceive")}</p>
            <button
              onClick={handleResend}
              disabled={resendTimer > 0 || resending}
              className="text-xs sm:text-sm font-medium text-[#1754CF] dark:text-[#9CF3D2] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending
                ? t("sendingOtp")
                : resendTimer > 0
                  ? `${t("resendIn")} ${resendTimer}s`
                  : t("resendOtp")}
            </button>
          </div>

          {devOtp && (
            <div className="bg-info/10 border border-info/20 rounded-xl px-3 py-2 mx-auto max-w-full">
              <p className="text-[11px] sm:text-xs text-info text-center">
                Dev / SMS off: use OTP <span className="font-mono font-bold">{devOtp}</span>
              </p>
            </div>
          )}
        </div>

        {/* Pinned footer button */}
        <div className="shrink-0 pt-2 sm:pt-3">
          <button
            onClick={handleVerify}
            disabled={!otp.every((d) => d !== "") || loading || expiryTimer <= 0}
            className="w-full bg-[#826CF3] text-white font-bold py-3.5 sm:py-4 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(130,108,243,0.35)]"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("verifying")}
              </>
            ) : (
              t("verifyOtp")
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
