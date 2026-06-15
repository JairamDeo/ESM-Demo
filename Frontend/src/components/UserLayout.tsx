import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { Sun, Moon, Home, FileText, Layers, User, Settings } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@iconify/react";
import { useNotifications } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { usePushSync } from "@/hooks/usePushSync";

const MOCKUP_WIDTH = 390;
const MOCKUP_HEIGHT = 844;
const MOCKUP_VIEWPORT_PAD_Y = 16;

const TAB_PATHS = ["/user", "/user/complaints", "/user/services", "/user/profile"] as const;
type NavDirection = "left" | "right" | null;

function normalizePath(pathname: string) {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function getTabIndex(pathname: string): number {
  return TAB_PATHS.indexOf(normalizePath(pathname) as (typeof TAB_PATHS)[number]);
}

function useMockupScale() {
  const [state, setState] = useState({ isMockup: false, scale: 1 });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");

    const update = () => {
      const isMockup = mq.matches;
      if (!isMockup) {
        setState({ isMockup: false, scale: 1 });
        return;
      }

      const scaleW = window.innerWidth / MOCKUP_WIDTH;
      const scaleH = (window.innerHeight - MOCKUP_VIEWPORT_PAD_Y) / MOCKUP_HEIGHT;
      setState({ isMockup: true, scale: Math.min(scaleW, scaleH) });
    };

    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return state;
}

const BottomNavItem = ({
  to,
  icon: IconComp,
  label,
  active,
  onTabPress,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onTabPress: (to: string) => void;
}) => (
  <Link
    to={to}
    onClick={() => onTabPress(to)}
    className={`relative z-10 flex flex-col items-center gap-1 flex-1 py-2.5 transition-colors active:scale-[0.94] duration-150 ${
      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`}
  >
    <div className="w-11 h-7 flex items-center justify-center rounded-full">
      <IconComp
        className={`w-[22px] h-[22px] transition-transform duration-300 ${
          active ? "stroke-[2.5px] scale-105" : "stroke-[1.8px] scale-100"
        }`}
      />
    </div>
    <span
      className={`text-[11px] font-medium leading-tight transition-all duration-300 ${
        active ? "font-semibold scale-105" : "scale-100"
      }`}
    >
      {label}
    </span>
  </Link>
);

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { data } = useNotifications();
  usePushSync(!!user, user?.id);
  const unreadCount = data?.unreadCount || 0;
  const { isMockup, scale } = useMockupScale();

  const mainRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0, active: false });
  const [navDirection, setNavDirection] = useState<NavDirection>(null);

  const navItems = [
    { to: "/user", icon: Home, label: "Home" },
    { to: "/user/complaints", icon: FileText, label: "Complaints" },
    { to: "/user/services", icon: Layers, label: "Services" },
    { to: "/user/profile", icon: User, label: "Profile" },
  ];

  const tabIndex = getTabIndex(location.pathname);
  const isTabScreen = tabIndex >= 0;

  const isActive = (path: string) =>
    path === "/user" ? location.pathname === "/user" : location.pathname.startsWith(path);

  const goToTab = useCallback(
    (to: string, direction?: NavDirection) => {
      const currentIdx = getTabIndex(location.pathname);
      const nextIdx = getTabIndex(to);
      if (direction) {
        setNavDirection(direction);
      } else if (currentIdx >= 0 && nextIdx >= 0 && currentIdx !== nextIdx) {
        setNavDirection(nextIdx > currentIdx ? "left" : "right");
      } else {
        setNavDirection(null);
      }
      navigate(to);
    },
    [location.pathname, navigate]
  );

  const handleTabPress = useCallback(
    (to: string) => {
      if (normalizePath(to) === normalizePath(location.pathname)) return;
      goToTab(to);
    },
    [goToTab, location.pathname]
  );

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (!navDirection) return;
    const timer = window.setTimeout(() => setNavDirection(null), 340);
    return () => window.clearTimeout(timer);
  }, [navDirection, location.pathname]);

  useEffect(() => {
    if (isMockup) return;
    const main = mainRef.current;
    if (!main) return;

    const onTouchStart = (e: TouchEvent) => {
      if (getTabIndex(location.pathname) < 0) return;
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        active: true,
      };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current.active) return;
      touchStartRef.current.active = false;

      const idx = getTabIndex(location.pathname);
      if (idx < 0) return;

      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.25) return;

      if (dx < 0 && idx < TAB_PATHS.length - 1) {
        goToTab(TAB_PATHS[idx + 1], "left");
      } else if (dx > 0 && idx > 0) {
        goToTab(TAB_PATHS[idx - 1], "right");
      }
    };

    main.addEventListener("touchstart", onTouchStart, { passive: true });
    main.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      main.removeEventListener("touchstart", onTouchStart);
      main.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMockup, location.pathname, goToTab]);

  useEffect(() => {
    if (!isMockup) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isMockup]);

  const shellClass = isMockup
    ? "relative flex flex-col font-['Montserrat',sans-serif] bg-background overflow-hidden h-[844px] w-[390px] shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_20px_40px_rgba(15,23,42,0.12),0_8px_16px_rgba(15,23,42,0.06)] dark:shadow-none"
    : "relative flex flex-col font-['Montserrat',sans-serif] w-full h-screen max-h-[100dvh] bg-background overflow-hidden";

  const contentAnimation =
    isTabScreen && navDirection === "left"
      ? "tab-enter-left"
      : isTabScreen && navDirection === "right"
        ? "tab-enter-right"
        : "";

  return (
    <div
      className={
        isMockup
          ? "fixed inset-0 z-50 overflow-hidden bg-muted/40 dark:bg-zinc-950 flex items-center justify-center py-[8px]"
          : "min-h-screen bg-muted/40 dark:bg-zinc-950"
      }
    >
      <div
        style={
          isMockup
            ? {
                width: MOCKUP_WIDTH * scale,
                height: MOCKUP_HEIGHT * scale,
              }
            : undefined
        }
        className={isMockup ? "relative shrink-0" : "contents"}
      >
        <div
          id="user-app-shell"
          style={
            isMockup
              ? {
                  width: MOCKUP_WIDTH,
                  height: MOCKUP_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }
              : undefined
          }
          className={shellClass}
        >
          <header className="flex-shrink-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
            <div className="flex items-center justify-between px-6 h-[69px]">
              <Link to="/user" className="flex items-center gap-4 group min-w-0">
                <img
                  src="/icons/hamburger.svg"
                  alt=""
                  className="w-[30px] h-[30px] dark:invert shrink-0"
                />
                <p className="text-foreground text-sm font-semibold leading-5 tracking-[0.01em] max-w-[140px]">
                  Welcome to Grievance Portal
                </p>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/user/notifications"
                  className="relative w-10 h-10 rounded-full bg-secondary dark:bg-[#1A1A1A] hover:bg-secondary/80 dark:hover:bg-[#252525] flex items-center justify-center transition-colors"
                  aria-label="Notifications"
                >
                  <Icon icon="mi:notification" className="w-6 h-6 text-foreground dark:text-[#E4E4E4]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[#D81B60]" />
                  )}
                </Link>

                <Link
                  to="/user/settings"
                  className="w-10 h-10 rounded-full bg-secondary dark:bg-[#1A1A1A] hover:bg-secondary/80 dark:hover:bg-[#252525] flex items-center justify-center transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="w-5 h-5 text-foreground" />
                </Link>

                <button
                  onClick={toggleTheme}
                  className="w-10 h-10 rounded-full bg-secondary dark:bg-[#1A1A1A] hover:bg-secondary/80 dark:hover:bg-[#252525] flex items-center justify-center transition-colors"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="w-5 h-5 text-foreground" />
                  ) : (
                    <Moon className="w-5 h-5 text-foreground" />
                  )}
                </button>
              </div>
            </div>
          </header>

          <main
            ref={mainRef}
            className="flex-1 overflow-y-auto overflow-x-hidden bg-background scrollbar-none touch-pan-y"
          >
            <div key={isTabScreen ? TAB_PATHS[tabIndex] : location.pathname} className={contentAnimation}>
              {children}
            </div>
          </main>

          <nav className="flex-shrink-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
            <div className="relative flex items-stretch px-2 min-h-[62px]">
              {isTabScreen && (
                <div
                  aria-hidden
                  className="user-tab-indicator absolute top-1.5 bottom-1.5 left-2 rounded-2xl bg-primary/12 pointer-events-none"
                  style={{
                    width: `calc((100% - 16px) / ${navItems.length})`,
                    transform: `translateX(calc(${tabIndex} * 100%))`,
                  }}
                />
              )}
              {navItems.map((item) => (
                <BottomNavItem
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  active={isActive(item.to)}
                  onTabPress={handleTabPress}
                />
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
