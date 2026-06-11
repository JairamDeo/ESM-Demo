import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Sun, Moon, Clock } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  const { theme, toggleTheme } = useTheme();
  const { sendOtp, verifyOtp } = useAuth();
  const phone = (location.state as any)?.phone || "";

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

  const handleChange = useCallback((index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  }, [otp]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  }, [otp]);

  const handleVerify = useCallback(async () => {
    const otpValue = otp.join("");
    if (otpValue.length < 4) return;
    if (expiryTimer <= 0) {
      toast.error("OTP expired. Please resend a new code.");
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone, otpValue);
      toast.success("Verified successfully!");
      navigate("/user");
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
    <div className="h-screen overflow-hidden bg-muted/40 dark:bg-zinc-950 flex items-center justify-center sm:p-6 p-0">
      <div className="flex flex-col w-full bg-background h-screen overflow-hidden sm:h-auto sm:max-w-sm sm:rounded-3xl sm:shadow-xl sm:dark:border sm:dark:border-border px-6 pt-10 pb-8 sm:pt-12 sm:pb-8">

        <div className="flex items-center justify-between mb-4">
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
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-start pt-2">
          <h1 className="text-2xl font-semibold text-foreground mb-3 text-center">Verify OTP</h1>
          <p className="text-xs text-foreground/80 text-center mb-1">
            We've sent a 4-digit verification code to your
          </p>
          <p className="text-xs text-foreground/80 text-center mb-10">
            registered mobile number ending in{" "}
            <span className="font-semibold text-foreground">{maskedPhone}</span>
          </p>

          <div className="flex gap-3 justify-center mb-8">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="tel"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-16 h-20 rounded-xl bg-[#FFFFFF] dark:bg-[#2B2B2B] border border-border text-center text-2xl font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            ))}
          </div>

          <div className="flex justify-center mb-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              expiryTimer > 0 ? "bg-[#1754CF] dark:bg-black/20" : "bg-destructive/15"
            }`}>
              <Clock className={`w-3.5 h-3.5 ${expiryTimer > 0 ? "text-[#FFFFFF] dark:text-[#73A2FF]" : "text-destructive"}`} />
              <span className={`text-sm font-normal ${expiryTimer > 0 ? "text-[#FFFFFF] dark:text-[#73A2FF]" : "text-destructive"}`}>
                {expiryTimer > 0
                  ? `${String(expiryMinutes).padStart(2, "0")}:${String(expirySeconds).padStart(2, "0")}`
                  : "Expired"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
            <button
              onClick={handleResend}
              disabled={resendTimer > 0 || resending}
              className="text-sm font-medium text-[#1754CF] dark:text-[#9CF3D2] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending
                ? "Sending..."
                : resendTimer > 0
                  ? `Resend in ${resendTimer}s`
                  : "Resend OTP"}
            </button>
          </div>

          {devOtp && (
            <div className="bg-info/10 border border-info/20 rounded-xl px-4 py-2 mx-auto">
              <p className="text-xs text-info text-center">
                Dev / SMS off: use OTP <span className="font-mono font-bold">{devOtp}</span>
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleVerify}
          disabled={!otp.every((d) => d !== "") || loading || expiryTimer <= 0}
          className="w-full mt-4 bg-[#826CF3] text-white font-bold py-4 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(130,108,243,0.35)]"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify OTP"
          )}
        </button>
      </div>
    </div>
  );
});
