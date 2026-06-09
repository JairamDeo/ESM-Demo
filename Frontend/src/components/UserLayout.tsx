import { Link, useLocation } from "react-router-dom";
import { Sun, Moon, Home, FileText, Layers, User, Settings } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@iconify/react";
import { useNotifications } from "@/hooks/useApi";

const BottomNavItem = ({
  to,
  icon: IconComp,
  label,
  active,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) => (
  <Link
    to={to}
    className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors ${
      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`}
  >
    <div
      className={`w-10 h-6 flex items-center justify-center rounded-full transition-all ${
        active ? "bg-primary/15" : ""
      }`}
    >
      <IconComp className={`w-5 h-5 ${active ? "stroke-[2.5px]" : "stroke-[1.8px]"}`} />
    </div>
    <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>{label}</span>
  </Link>
);

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { data } = useNotifications();
  const unreadCount = data?.unreadCount || 0;

  const navItems = [
    { to: "/user",            icon: Home,     label: "Home"       },
    { to: "/user/complaints", icon: FileText, label: "Complaints" },
    { to: "/user/services",   icon: Layers,   label: "Services"   },
    { to: "/user/profile",    icon: User,     label: "Profile"    },
  ];

  const isActive = (path: string) =>
    path === "/user"
      ? location.pathname === "/user"
      : location.pathname.startsWith(path);

  return (
    // Desktop: gray bg, centers the phone card
    // Mobile: full screen
    <div className="
      min-h-screen bg-muted/40 dark:bg-zinc-950
      sm:flex sm:items-center sm:justify-center sm:p-6
    ">
      {/* 
        The card:
        - Mobile: full screen, flex col, fixed height
        - Desktop: fixed phone-sized card, rounded, shadow
      */}
      <div className="
        flex flex-col
        w-full h-screen
        sm:h-[90vh] sm:max-w-sm
        sm:rounded-3xl sm:shadow-2xl
        sm:dark:border sm:dark:border-border
        bg-background overflow-hidden
      ">

        {/* ── Header — never scrolls ─────────────────────────────────── */}
        <header className="flex-shrink-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <Link to="/user" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 dark:text-[#FFFFFF] flex items-center justify-center">
                <img src="/icons/hamburger.svg" className="w-5 h-5 dark:text-[#FFFFFF] dark:invert" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-foreground leading-tight">Welcome to</p>
                <p className="text-sm font-semibold text-foreground leading-tight">Grievance Portal</p>
              </div>
            </Link>
            <div className="flex items-center gap-1.5">
              <Link
                to="/user/notifications"
                className="relative w-9 h-9 rounded-full dark:bg-[#212121] bg-[#FFFFFF] hover:bg-secondary/80 flex items-center justify-center transition-colors"
                aria-label="Notifications"
              >
                <Icon icon="iconoir:bell" className="w-[18px] h-[18px] text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-rose-500 " />
                )}
              </Link>
              
              <Link
  to="/user/settings"
  className="w-9 h-9 rounded-full dark:bg-[#212121] bg-[#FFFFFF] hover:bg-secondary/80 flex items-center justify-center transition-colors"
  aria-label="Settings"
>
  <Settings className="w-4 h-4 text-foreground" />
</Link>


              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-full dark:bg-[#212121] bg-[#FFFFFF] hover:bg-secondary/80 flex items-center justify-center transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-foreground" />
                ) : (
                  <Moon className="w-4 h-4 text-foreground" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ── Scrollable content area only ──────────────────────────── */}
        <main className="flex-1 overflow-y-auto py-4">
          {children}
        </main>

        {/* ── Bottom nav — never scrolls ─────────────────────────────── */}
        <nav className="flex-shrink-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
          <div className="flex items-stretch px-2">
            {navItems.map((item) => (
              <BottomNavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={isActive(item.to)}
              />
            ))}
          </div>
        </nav>

      </div>
    </div>
  );
}