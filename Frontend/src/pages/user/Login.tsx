import { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon, ChevronDown, Phone } from "lucide-react";  // ← add Phone
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
      const result = await sendOtp(phone);
      toast.success(result.smsSent ? "OTP sent to your mobile!" : "OTP generated — check server logs if SMS is off");
      navigate("/user/verify-otp", {
        state: {
          phone,
          expiresIn: result.expiresIn,
          resendAfter: result.resendAfter,
          devOtp: result.devOtp,
        },
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [phone, sendOtp, navigate]);

  return (
    <div className="h-screen bg-muted/40 dark:bg-zinc-950 flex items-center justify-center sm:p-6 p-0">
      <div className="flex flex-col w-full bg-background min-h-screen sm:min-h-0 sm:max-w-sm sm:rounded-3xl sm:shadow-xl sm:dark:border sm:dark:border-border px-6 pt-10 pb-8 sm:pt-8 sm:pb-8">

        {/* Top controls */}
        <div className="flex justify-end items-center gap-2 mb-2 ">
          <div className="relative">
            <select className="appearance-none bg-secondary text-foreground text-xs rounded-lg pl-3 pr-7 py-1.5 outline-none cursor-pointer border border-border">
              <option value="English">English</option>
              <option value="Hindi">हिंदी</option>
            </select>
            <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-muted-foreground border border-border"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-start ">

          {/* Logo */}
          <div className="flex justify-center mb-2">
            <img src="../Logo.svg" alt="App Logo" className="w-[50%] h-auto" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-semibold text-foreground mb-1">Login</h1>
          <p className="text-foreground text-xs mb-6">
            Enter your mobile number to get started.
          </p>

          {/* Phone input */}
          <div className="space-y-1.5 mb-1">
            <label className="text-sm font-medium text-foreground">Phone Number</label>
            <div className="flex items-center gap-2 bg-[#FFFFFF] dark:bg-[#23222A] rounded-xl px-4 py-3.5 border border-border focus-within:border-primary transition-colors">
              
              {/* ✅ Lucide icon — works in both light and dark automatically */}
              {/* <Phone className="w-4 h-4 shrink-0 text-muted-foreground" /> */}
              <img src="/icons/phone.svg" className="w-3 h-3 shrink-0 invert dark:invert-0" />

              
              
              <span className="text-sm text-foreground font-normal shrink-0">+91</span>
              <div className="w-px h-4 bg-border shrink-0 " /> {/* subtle divider */}
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                placeholder="Enter mobile number"
                className="bg-[#FFFFFF] dark:bg-[#23222A] border-none outline-none text-foreground text-sm flex-1 w-full placeholder:text-muted-foreground/50"
              />
            </div>
            <p className="text-xs text-foreground/80 px-1">
              We'll send a 4-digit verification code
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleRegister}
            disabled={phone.length < 10 || loading}
            className="w-full mt-6 bg-[#826CF3] text-white font-bold py-4 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(130,108,243,0.35)]"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending OTP...
              </>
            ) : (
              "Register"
            )}
          </button>

          <p className="text-center text-xs text-foreground mt-4">
            By continuing, you agree to our{" "}
            <span className="text-[#457def] underline cursor-pointer">Terms and Conditions</span>
          </p>
          <p className="text-center text-xs text-foreground mt-2">
            Admin?{" "}
            <a href="/admin/login" className="text-[#457def] underline">Login here</a>
          </p>

        </div>
      </div>
    </div>
  );
});