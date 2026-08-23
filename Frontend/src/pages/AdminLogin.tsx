import { useState, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Sun, Moon, Lock, User } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AdminLogin = memo(() => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { adminLogin } = useAuth();

  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter username and password");
      return;
    }
    setLoading(true);
    try {
      await adminLogin(username.trim(), password.trim());
      toast.success("Login successful");
      navigate("/");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }, [username, password, adminLogin, navigate]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  }, [handleLogin]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
      >
        {resolvedTheme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-3">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ESM</h1>
          <p className="text-sm text-muted-foreground mt-1">Admin Portal</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Admin Login</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Sign in to manage grievances & officers</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Username</label>
            <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 border border-border focus-within:border-primary transition-colors">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={onKey}
                placeholder="Username or email (e.g. test-st1-l1@esm.in)"
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 border border-border focus-within:border-primary transition-colors">
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKey}
                placeholder="Enter password"
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1"
              />
              <button onClick={() => setShowPass((p) => !p)} className="text-muted-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
            ) : "Sign In"}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Are you a veteran?{" "}
          <a href="/user/login" className="text-primary underline">Login here</a>
        </p>
      </div>
    </div>
  );
});

export default AdminLogin;