import { useState, memo, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Building2, Users, Settings, Bell,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Search, Moon, Sun, QrCode,
  BarChart3, AlertTriangle, ClipboardList, Menu, X, Shield, ListTree, Megaphone
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
// import { useNotifications } from "@/hooks/useApi";
import { usePermissions } from "@/stores/rbac";

const ALL_NAV = [
  { icon: LayoutDashboard, label: "Dashboard",     path: "/",            perm: "viewDashboard"   },
  { icon: FileText,        label: "Grievances",    path: "/grievances",  perm: "viewGrievances"  },
  { icon: ListTree,        label: "Categories-Master",    path: "/categories",  perm: "viewCategories"  },
  { icon: ClipboardList,   label: "Case Types",    path: "/case-types",  perm: "viewCaseTypes"   },
  { icon: Building2,       label: "Station HQs",   path: "/stations",    perm: "viewStations"    },
  { icon: QrCode,          label: "QR Codes",      path: "/qr-codes",    perm: "viewQRCodes"     },
  { icon: Users,           label: "Officers",      path: "/users",       perm: "viewOfficers"    },
  { icon: AlertTriangle,   label: "Escalations",   path: "/escalations", perm: "viewEscalations" },
  { icon: Megaphone,       label: "Announcements", path: "/announcements",perm: "viewAnnouncements" },
  { icon: BarChart3,       label: "Reports",       path: "/reports",     perm: "viewReports"     },
  { icon: Settings,        label: "Settings",      path: "/settings",    perm: "viewSettings"    },
] as const;

const NavItem = memo(({ item, active, collapsed }: { item: any; active: boolean; collapsed: boolean }) => (
  <Link
    to={item.path}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`}
    title={collapsed ? item.label : undefined}
  >
    <item.icon className={`w-5 h-5 shrink-0 ${active ? "text-primary" : ""}`} />
    {!collapsed && <span>{item.label}</span>}
    {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
  </Link>
));

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const permissions = usePermissions();

  // Filter nav items by role permissions
  const navItems = useMemo(() =>
    ALL_NAV.filter((item) => {
      return permissions[item.perm as keyof typeof permissions];
    }),
    [permissions, user]
  );

  // Live unread notification count
  // const { data: notifData } = useNotifications();
  // const unreadCount = useMemo(() => {
  //   const list: any[] = (notifData as any)?.data?.notifications ?? (notifData as any)?.data ?? [];
  //   return Array.isArray(list) ? list.filter((n: any) => !n.isRead).length : 0;
  // }, [notifData]);

  // Admin notifications — disabled for now
  const unreadCount = 0;

  const handleLogout = useCallback(() => {
    logout();
    navigate("/admin/login", { replace: true });
  }, [logout, navigate]);

  // const roleLabel: Record<string, string> = {
  //   super_admin: "Super Admin",
  //   esm_officer: "ESM Officer",
  //   station_officer: "Station Officer",
  //   record_office: "Record Office",
  // };

  const roleLabel: Record<string, string> = {
  super_admin: "Super Admin",
  area:        "Area",
  headquarter: "Headquarter",
  station_hq:  "Station HQ",
};

  const Sidebar = memo(({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-sm">V</span>
        </div>
        {(!collapsed || mobile) && (
          <div>
            <span className="font-bold text-foreground text-base tracking-tight">Vitric ESM</span>
          </div>
        )}
        
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div> */}

      <div className="flex items-center px-4 h-16 border-b border-border shrink-0">
  
  {/* Logo */}
  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
    <span className="text-primary-foreground font-bold text-sm">
      V
    </span>
  </div>

  {/* Title */}
  {(!collapsed || mobile) && (
    <div className="ml-3">
      <span className="font-bold text-foreground text-base tracking-tight">
        Vitric ESM
      </span>
    </div>
  )}

  {/* Collapse Arrow */}
  {!mobile && (
    <button
      onClick={() => setCollapsed(!collapsed)}
      // className="ml-auto p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0"
      className={`p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0 ${
        collapsed ? "ml-2" : "ml-auto"
      }`}
    >
      {collapsed ? (
        <ChevronRight className="w-4 h-4" />
      ) : (
        <ChevronLeft className="w-4 h-4" />
      )}
    </button>
  )}

  {/* Mobile Close */}
  {mobile && (
    <button
      onClick={() => setMobileOpen(false)}
      className="ml-auto p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
    >
      <X className="w-5 h-5" />
    </button>
  )}
</div>

      {/* Role badge */}
      {(!collapsed || mobile) && user && (
        <div className="px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-10 py-2">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">{roleLabel[user.role || ""] || user.role}</span>
          </div>
        </div>
      )}

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            active={location.pathname === item.path}
            collapsed={collapsed && !mobile}
          />
        ))}
      </nav>

      {/* Only collapse button — logout removed from sidebar */}
      {/* <div className="p-2 border-t border-border shrink-0">
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors text-sm"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
          </button>
        )}
      </div> */}
    </>
  ));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className={`${collapsed ? "w-24" : "w-56"} hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-300 shrink-0`}>
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full flex flex-col border-r border-border bg-sidebar">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 shrink-0 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground shrink-0">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 border border-border flex-1 max-w-xs">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search grievances, officers..."
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {/* Theme toggle */}
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <div className="w-px h-8 bg-border mx-1" />

            {/* User info */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary text-sm font-semibold">{(user?.name || "A")[0].toUpperCase()}</span>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-foreground leading-tight">{user?.name || "Admin"}</p>
                <p className="text-xs text-muted-foreground">{roleLabel[user?.role || ""] || user?.station || "HQ"}</p>
              </div>
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                title="Account"
              >
                <ChevronDown className="w-6 h-6" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-xl shadow-xl py-1 w-48">

                    {/* User info in dropdown */}
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{user?.name || "Admin"}</p>
                      <p className="text-xs text-muted-foreground">{roleLabel[user?.role || ""] || "Admin"}</p>
                    </div>

                    {/* Switch to Veteran Portal */}
                    {/* <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/user");
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                      Veteran Portal
                    </button> */}

                    {/* Logout */}
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Logout
                    </button>

                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}