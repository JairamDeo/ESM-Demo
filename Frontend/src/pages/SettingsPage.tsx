import { Settings, Bell, Shield, Globe, Clock, Mail } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">System configuration and preferences</p>
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Appearance</h3>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Theme</p>
            <p className="text-xs text-muted-foreground">Toggle between dark and light mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className="relative w-14 h-7 rounded-full bg-secondary transition-colors"
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-primary transition-all ${theme === "dark" ? "left-[calc(100%-1.625rem)]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Notifications</h3>
        </div>
        {["Email notifications for new grievances", "SMS alerts for escalated cases", "Daily digest report", "Weekly summary to Sub-Area Commander"].map((item) => (
          <div key={item} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <p className="text-sm text-foreground">{item}</p>
            <div className="w-10 h-5 rounded-full bg-primary/30 relative cursor-pointer">
              <div className="absolute top-0.5 left-[calc(100%-1.125rem)] w-4 h-4 rounded-full bg-primary" />
            </div>
          </div>
        ))}
      </div>

      {/* Escalation */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Auto-Escalation Rules</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <span className="text-sm text-foreground">Escalate to ESM Officer after</span>
            <span className="text-sm font-bold text-primary">15 days</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <span className="text-sm text-foreground">Escalate to Sub-Area Commander after</span>
            <span className="text-sm font-bold text-primary">30 days</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <span className="text-sm text-foreground">Send reminder to officer after</span>
            <span className="text-sm font-bold text-primary">7 days</span>
          </div>
        </div>
      </div>

      {/* System */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">System</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2"><span className="text-muted-foreground">Version</span><span className="text-foreground">1.0.0</span></div>
          <div className="flex justify-between py-2"><span className="text-muted-foreground">Region</span><span className="text-foreground">Nagpur Sub-Area</span></div>
          <div className="flex justify-between py-2"><span className="text-muted-foreground">Covering</span><span className="text-foreground">10 Station HQs (Maharashtra & Gujarat)</span></div>
          <div className="flex justify-between py-2"><span className="text-muted-foreground">SPARSH Integration</span><span className="text-warning">Independent Module</span></div>
        </div>
      </div>
    </div>
  );
}
