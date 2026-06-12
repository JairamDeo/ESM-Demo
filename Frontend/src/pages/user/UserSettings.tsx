import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Bell,
  Shield,
  LogOut,
  User,
  FileText,
  HelpCircle,
  Smartphone,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useApi";
import { toast } from "sonner";

function SettingRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  description,
  trailing,
  onClick,
  to,
}: {
  icon: typeof Bell;
  iconBg: string;
  iconColor: string;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  to?: string;
}) {
  const inner = (
    <>
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {trailing ?? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
    </>
  );

  const className =
    "w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-[#826CF3]/30 transition-colors active:scale-[0.99]";

  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    );
  }

  // Custom trailing (e.g. theme switch) — use div to avoid nested <button>
  if (trailing) {
    return <div className={className}>{inner}</div>;
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
        dark ? "bg-[#826CF3]" : "bg-secondary border border-border"
      }`}
    >
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform ${
          dark ? "translate-x-5" : "translate-x-0.5"
        }`}
      >
        {dark ? <Moon className="w-3.5 h-3.5 text-[#826CF3]" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
      </span>
    </button>
  );
}

export default memo(function UserSettings() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: notifData } = useNotifications(false);
  const unreadCount = notifData?.unreadCount || 0;
  const isDark = theme === "dark";

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/user/login");
  };

  return (
    <div className="flex flex-col min-h-full pb-6 animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-2 pb-5 bg-gradient-to-b from-[#826CF3]/10 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/user"
            className="p-1.5 rounded-full hover:bg-secondary/80 text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage your portal preferences</p>
          </div>
        </div>

        {/* Account mini card */}
        <Link
          to="/user/profile"
          className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#826CF3]/20 to-[#4F81FF]/10 border border-[#826CF3]/25 hover:border-[#826CF3]/40 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#826CF3] to-[#4F81FF] flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-[#826CF3]/20">
            {(user?.name || user?.phone || "V")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.name || "Veteran"}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.phone ? `+91 ${user.phone}` : "Complete your profile"}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </Link>
      </div>

      <div className="px-4 space-y-6">
        {/* Preferences */}
        <section>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Preferences
          </p>
          <div className="space-y-2">
            <SettingRow
              icon={isDark ? Moon : Sun}
              iconBg={isDark ? "bg-[#826CF3]/15" : "bg-amber-500/15"}
              iconColor={isDark ? "text-[#826CF3]" : "text-amber-500"}
              label="Appearance"
              description={isDark ? "Dark mode on" : "Light mode on"}
              trailing={<ThemeToggle dark={isDark} onToggle={toggleTheme} />}
            />
            <SettingRow
              icon={Bell}
              iconBg="bg-[#4F81FF]/15"
              iconColor="text-[#4F81FF]"
              label="Notifications"
              description={
                unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}` : "View all updates"
              }
              to="/user/notifications"
              trailing={
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#826CF3] text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              }
            />
          </div>
        </section>

        {/* Account */}
        <section>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Account
          </p>
          <div className="space-y-2">
            <SettingRow
              icon={User}
              iconBg="bg-[#826CF3]/15"
              iconColor="text-[#826CF3]"
              label="My Profile"
              description="Name, rank, contact details"
              to="/user/profile"
            />
            <SettingRow
              icon={FileText}
              iconBg="bg-emerald-500/15"
              iconColor="text-emerald-500"
              label="My Complaints"
              description="Track submitted grievances"
              to="/user/complaints"
            />
            <SettingRow
              icon={Shield}
              iconBg="bg-secondary"
              iconColor="text-muted-foreground"
              label="Privacy & Security"
              description="Your data is encrypted & secure"
              onClick={() => toast.info("Your account is protected with secure OTP login.")}
            />
          </div>
        </section>

        {/* Support */}
        <section>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Support
          </p>
          <div className="space-y-2">
            <SettingRow
              icon={HelpCircle}
              iconBg="bg-[#4F81FF]/15"
              iconColor="text-[#4F81FF]"
              label="Help & Support"
              description="ESM Grievance Portal assistance"
              onClick={() => toast.info("Contact your Station HQ for grievance support.")}
            />
            <SettingRow
              icon={Smartphone}
              iconBg="bg-secondary"
              iconColor="text-muted-foreground"
              label="App Version"
              description="ESM Veteran Portal v1.0"
              trailing={<span className="text-xs text-muted-foreground">Latest</span>}
              onClick={() => {}}
            />
          </div>
        </section>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full bg-destructive/8 border border-destructive/25 rounded-2xl p-4 flex items-center justify-center gap-2.5 hover:bg-destructive/12 transition-colors active:scale-[0.99]"
        >
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">Logout</span>
        </button>
      </div>
    </div>
  );
});
