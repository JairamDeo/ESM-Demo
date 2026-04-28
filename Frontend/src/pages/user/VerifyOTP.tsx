import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default memo(function VerifyOTP() {
  const [otp, setOtp] = useState(["","","",""]);
  const [timer, setTimer] = useState(119);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement|null)[]>([]);
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
      setOtp(["","","",""]);
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
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto px-6">
      <div className="flex items-center justify-between pt-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-secondary text-muted-foreground">
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center pt-12">
        <h1 className="text-xl font-bold text-foreground mb-3">Verify OTP</h1>
        <p className="text-sm text-muted-foreground text-center mb-1">We've sent a 4-digit verification code to</p>
        <p className="text-sm text-muted-foreground text-center mb-8">your registered mobile number ending in <span className="font-semibold text-foreground">{maskedPhone}</span></p>
        <div className="flex gap-4 mb-6">
          {otp.map((digit, i) => (
            <input key={i} ref={(el) => (inputRefs.current[i] = el)} type="tel" maxLength={1} value={digit}
              onChange={(e) => handleChange(i, e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-14 h-14 rounded-xl bg-secondary border border-border text-center text-xl font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all" />
          ))}
        </div>
        <div className="flex items-center gap-1 text-sm mb-2">
          <span className="text-primary">⏱</span>
          <span className="text-primary font-medium">{String(minutes).padStart(2,"0")}:{String(seconds).padStart(2,"0")}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Didn't receive the code?{" "}
          <button onClick={handleResend} disabled={timer > 0} className="font-semibold text-foreground underline disabled:opacity-50">Resend OTP</button>
        </p>
        <div className="mt-4 bg-info/10 border border-info/20 rounded-xl px-4 py-2">
          <p className="text-xs text-info">Dev mode: use OTP <span className="font-mono font-bold">1234</span></p>
        </div>
      </div>
      <div className="pb-8">
        <button onClick={handleVerify} disabled={!otp.every((d) => d !== "") || loading} className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</> : "Verify OTP"}
        </button>
      </div>
    </div>
  );
});
