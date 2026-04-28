import { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Shield, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default memo(function Login() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { sendOtp } = useAuth();

  const handleRegister = useCallback(async () => {
    if (phone.length < 10) return;
    setLoading(true);
    try {
      await sendOtp(phone);
      toast.success("OTP sent successfully!");
      navigate("/user/verify-otp", { state: { phone } });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [phone, sendOtp, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto px-6">
      <div className="flex justify-end pt-4">
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground">
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
      <div className="flex flex-col items-center mt-8 mb-10">
        <div className="w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center mb-4 relative">
          <Shield className="w-12 h-12 text-primary" />
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-success flex items-center justify-center">
            <svg className="w-5 h-5 text-success-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-1">Login</h1>
        <p className="text-muted-foreground text-sm mb-8">Enter your mobile number to get started.</p>
        <div className="space-y-2 mb-2">
          <label className="text-sm font-medium text-foreground">Phone Number</label>
          <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3.5 border border-border focus-within:border-primary transition-colors">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-sm shrink-0">+91</span>
            <input type="tel" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && handleRegister()} placeholder="" className="bg-transparent border-none outline-none text-foreground text-sm flex-1 w-full" />
          </div>
          <p className="text-xs text-muted-foreground">We'll send a 4-digit verification code</p>
        </div>
        <button onClick={handleRegister} disabled={phone.length < 10 || loading} className="w-full mt-6 bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending OTP...</> : "Register"}
        </button>
        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to our <span className="text-primary underline cursor-pointer">Terms and Conditions</span>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-3">
          Admin? <a href="/admin/login" className="text-primary underline">Login here</a>
        </p>
      </div>
    </div>
  );
});
