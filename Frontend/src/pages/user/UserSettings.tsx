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
  Monitor,
} from "lucide-react";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
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

function AppearanceSelector({
  value,
  onChange,
}: {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}) {
  const options: {
    id: ThemePreference;
    label: string;
    icon: typeof Sun;
  }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {options.map(({ id, label, icon: Icon }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition-colors ${
              selected
                ? "border-[#826CF3] bg-[#826CF3]/10 text-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-[#826CF3]/30"
            }`}
          >
            <Icon className={`w-4 h-4 ${selected ? "text-[#826CF3]" : ""}`} />
            <span className="text-[11px] font-semibold">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(function UserSettings() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: notifData } = useNotifications(false);
  const unreadCount = notifData?.unreadCount || 0;
  const isDark = resolvedTheme === "dark";

  const appearanceDescription =
    theme === "system"
      ? `System default (${isDark ? "Dark" : "Light"})`
      : theme === "dark"
        ? "Dark mode"
        : "Light mode";

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
            <div className="w-full bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark ? "bg-[#826CF3]/15" : "bg-amber-500/15"
                  }`}
                >
                  {isDark ? (
                    <Moon className="w-5 h-5 text-[#826CF3]" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-foreground">Appearance</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{appearanceDescription}</p>
                </div>
              </div>
              <AppearanceSelector value={theme} onChange={setTheme} />
            </div>
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
