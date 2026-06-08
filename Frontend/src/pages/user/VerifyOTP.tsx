import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Sun, Moon, Clock } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default memo(function VerifyOTP() {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(119);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { sendOtp, verifyOtp } = useAuth();
  const phone = (location.state as any)?.phone || "";

  useEffect(() => {
    if (!phone) { navigate("/user/login"); return; }
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer, phone, navigate]);

  const handleChange = useCallback((index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp]; newOtp[index] = value; setOtp(newOtp);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  }, [otp]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  }, [otp]);

  const handleVerify = useCallback(async () => {
    const otpValue = otp.join("");
    if (otpValue.length < 4) return;
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
  }, [otp, phone, verifyOtp, navigate]);

  const handleResend = useCallback(async () => {
    if (timer > 0) return;
    try {
      await sendOtp(phone);
      setTimer(119);
      toast.success("OTP resent!");
    } catch {
      toast.error("Failed to resend OTP");
    }
  }, [timer, phone, sendOtp]);

  const maskedPhone = phone.length >= 10 ? `****${phone.slice(-4)}` : `****${phone}`;
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <div className="h-screen overflow-hidden bg-muted/40 dark:bg-zinc-950 flex items-center justify-center sm:p-6 p-0">
      <div className="flex flex-col w-full bg-background h-screen overflow-hidden sm:h-auto sm:max-w-sm sm:rounded-3xl sm:shadow-xl sm:dark:border sm:dark:border-border px-6 pt-10 pb-8 sm:pt-12 sm:pb-8">

        {/* Top controls */}
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

        {/* Content */}
        <div className="flex-1 flex flex-col justify-start pt-2">

          {/* Heading */}
          <h1 className="text-2xl font-semibold text-foreground mb-3 text-center">Verify OTP</h1>
          <p className="text-xs text-foreground/80 text-center mb-1">
            We've sent a 4-digit verification code to your
          </p>
          <p className="text-xs text-foreground/80 text-center mb-10">
            registered mobile number ending in{" "}
            <span className="font-semibold text-foreground">{maskedPhone}</span>
          </p>

          {/* OTP inputs */}
          <div className="flex gap-3 justify-center mb-8">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="tel"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-16 h-20 rounded-xl bg-[#FFFFFF] dark:bg-[#2B2B2B] border border-border text-center text-2xl font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            ))}
          </div>

          {/* Timer */}
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-2 bg-[#1754CF] dark:bg-[black]/20 px-4 py-2 rounded-full">
              <Clock className="w-3.5 h-3.5 text-[#FFFFFF] dark:text-[#73A2FF]" />
              <span className="text-[#FFFFFF] dark:text-[#73A2FF] text-sm font-normal">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Resend */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
            <button
              onClick={handleResend}
              disabled={timer > 0}
              className="text-sm font-medium text-[#1754CF] dark:text-[#9CF3D2] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resend OTP
            </button>
          </div>

          {/* Dev mode hint */}
          <div className="bg-info/10 border border-info/20 rounded-xl px-4 py-2 mx-auto">
            <p className="text-xs text-info">
              Dev mode: use OTP <span className="font-mono font-bold">1234</span>
            </p>
          </div>

        </div>

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={!otp.every((d) => d !== "") || loading}
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