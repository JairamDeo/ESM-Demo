import { useState, memo, useCallback, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Building2, Users, Settings, Bell,
  ChevronLeft, ChevronRight, LogOut, Search, Moon, Sun, QrCode,
  BarChart3, AlertTriangle, ClipboardList, Menu, X,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",        path: "/" },
  { icon: FileText,        label: "Grievances",       path: "/grievances" },
  { icon: ClipboardList,   label: "Case Types",       path: "/case-types" },
  { icon: Building2,       label: "Station HQs",      path: "/stations" },
  { icon: QrCode,          label: "QR Codes",         path: "/qr-codes" },
  { icon: Users,           label: "Users & Officers", path: "/users" },
  { icon: AlertTriangle,   label: "Escalations",      path: "/escalations" },
  { icon: BarChart3,       label: "Reports",          path: "/reports" },
  { icon: Settings,        label: "Settings",         path: "/settings" },
];

export default memo(function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const searchRef = useRef<HTMLDivElement>(null);

  const filtered = search.length >= 2
    ? navItems.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    toast.success("Logged out successfully");
    navigate("/admin/login");
  }, [logout, navigate]);

  const SideNav = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`${mobile ? "w-64" : collapsed ? "w-[72px]" : "w-64"} flex flex-col border-r border-border bg-sidebar h-full transition-all duration-300 shrink-0`}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-sm">V</span>
        </div>
        {(mobile || !collapsed) && <span className="font-semibold text-foreground text-lg tracking-tight">Vitric ESM</span>}
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => mobile && setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${active ? "text-primary" : ""}`} />
              {(mobile || !collapsed) && <span>{item.label}</span>}
              {active && (mobile || !collapsed) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t border-border space-y-1">
        {!mobile && (
          <button onClick={() => setCollapsed((c) => !c)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors text-sm">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
          </button>
        )}
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-sm">
          <LogOut className="w-4 h-4 shrink-0" />
          {(mobile || !collapsed) && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex flex-shrink-0"><SideNav /></div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full"><SideNav mobile /></div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 shrink-0 gap-3">
          <button className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground shrink-0" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 max-w-md relative" ref={searchRef}>
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 border border-transparent focus-within:border-primary/50 transition-colors">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }} onFocus={() => setShowSearch(true)} placeholder="Search pages..." className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full" />
              {search && <button onClick={() => { setSearch(""); setShowSearch(false); }} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></button>}
            </div>
            {showSearch && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                {filtered.map((item) => (
                  <button key={item.path} onClick={() => { navigate(item.path); setSearch(""); setShowSearch(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground relative">
              <Bell className="w-5 h-5" /><span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
            </button>
            <div className="w-px h-8 bg-border mx-1" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm font-semibold">{user?.name?.[0] ?? "A"}</span>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-foreground">{user?.name ?? "Admin Officer"}</p>
                <p className="text-xs text-muted-foreground">{user?.station ?? "Nagpur Sub-Area"}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
});
