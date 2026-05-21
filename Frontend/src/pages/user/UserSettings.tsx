import { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Bell, Shield, LogOut, ChevronRight, ChevronLeft } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default memo(function UserSettings() {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/user/login");
  };

  const settings = [
    { icon: theme === "dark" ? Sun : Moon, label: "Appearance", value: theme === "dark" ? "Dark Mode" : "Light Mode", onClick: toggleTheme },
    { icon: Bell, label: "Notifications", value: "Enabled", onClick: () => {} },
    { icon: Shield, label: "Privacy & Security", value: "Manage", onClick: () => {} },
  ];

  return (
    <div className="px-4 space-y-5 animate-fade-in pb-6">
      <div className="flex items-center gap-5">
        <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground"><ChevronLeft className="w-5 h-5 " color="#FFFFFF" /></Link>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="space-y-3">
        {settings.map(({ icon: Icon, label, value, onClick }) => (
          <button key={label} onClick={onClick} className="w-full bg-card rounded-2xl border border-border p-4 flex items-center justify-between hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"><Icon className="w-4 h-4 text-muted-foreground" /></div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{value}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <button onClick={handleLogout} className="w-full bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-center gap-3 hover:bg-destructive/15 transition-colors">
        <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center"><LogOut className="w-4 h-4 text-destructive" /></div>
        <p className="text-sm font-semibold text-destructive">Logout</p>
      </button>
    </div>
  );
});
