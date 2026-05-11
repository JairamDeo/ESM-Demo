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
      <div className="flex flex-col items-center mt-0 mb-2 ">
        {/* <div className="w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center mb-4 relative"> */}
          {/* <Shield className="w-12 h-12 text-primary" /> */}
          <img src="../Logo.svg" alt="" className="w-[50%] h-[50%]" />
          {/* <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-success flex items-center justify-center">
            <svg className="w-5 h-5 text-success-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div> */}
        {/* </div> */}
      </div>
      <div className="flex-1">
        <h1 className="text-2xl font-semibold text-foreground text-[#FFFFFF] mb-1">Login</h1>
        <p className="text-muted-foreground text-sm mb-8 font-normal text-[#94A3B8] ">Enter your mobile number to get started.</p>
        <div className="space-y-2 mb-2">
          <label className="text-sm font-medium text-foreground text-[#FFFFFF]">Phone Number</label>
          <div className="flex items-center gap-3 bg-[#23222A] rounded-xl px-4 py-3.5 border border-[#697787] focus-within:border-primary transition-colors">
            <img src="/icons/phone.svg" alt="" className="w-4 h-4 text-muted-foreground/101 shrink-0" color="#CBD5E1" />
            <span className="text-muted-foreground text-[#d0d9e4] text-sm shrink-0  font-normal">+91</span>
            <input type="tel" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && handleRegister()} placeholder="" className="bg-transparent border-none outline-none text-foreground text-sm flex-1 w-full" />
          </div>
          <p className="text-xs font-thin  text-[#FFFFFF] text-foreground px-2 opacity-80 ">We'll send a 4-digit verification code</p>
        </div>
        <button onClick={handleRegister} disabled={phone.length < 10 || loading} className="w-full shadow-[0_4px_12px_rgba(23,84,207,0.2)]  mt-6 bg-[#826CF3] text-primary-foreground font-bold py-3.5 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending OTP...</> : "Register"}
        </button>
        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to our <span className="text-primary underline  cursor-pointer">Terms and Conditions</span>
        </p>
        <p className="text-center text-xs  text-muted-foreground mt-3">
          Admin? <a href="/admin/login" className="text-primary underline">Login here</a>
        </p>
      </div>
    </div>
  );
});
