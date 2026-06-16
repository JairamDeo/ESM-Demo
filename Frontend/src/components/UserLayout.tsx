import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Sun, Moon, Home, FileText, Layers, User, Settings, X, ChevronDown } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@iconify/react";
import { useCategories, useNotifications } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { usePushSync } from "@/hooks/usePushSync";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

const MOCKUP_WIDTH = 390;
const MOCKUP_HEIGHT = 844;
const MOCKUP_VIEWPORT_PAD_Y = 16;

const TAB_PATHS = ["/user", "/user/complaints", "/user/services", "/user/profile"] as const;
type NavDirection = "left" | "right" | null;

const SERVICE_CATEGORY_ORDER = [
  "Identity & Personal",
  "Pension & Financial",
  "Family Details",
  "Requests & Tracking",
] as const;

function categorySortIndex(name: string) {
  const norm = name.trim().toLowerCase();
  const idx = SERVICE_CATEGORY_ORDER.findIndex((c) => c.toLowerCase() === norm);
  return idx === -1 ? 999 : idx;
}

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
  const { t } = useTranslation();

  const mainRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0, active: false });
  const [navDirection, setNavDirection] = useState<NavDirection>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const { data: categories = [] } = useCategories({ status: "active" });

  const navItems = [
    { to: "/user", icon: Home, label: t("home") },
    { to: "/user/complaints", icon: FileText, label: t("complaints") },
    { to: "/user/services", icon: Layers, label: t("services"), hasCategories: true },
    { to: "/user/profile", icon: User, label: t("profile") },
  ];

  const menuCategories = useMemo(
    () =>
      [...categories]
        .filter((c: { isActive?: boolean; name?: string }) => c.isActive !== false && c.name)
        .sort(
          (a: { name: string }, b: { name: string }) =>
            categorySortIndex(a.name) - categorySortIndex(b.name)
        ),
    [categories]
  );

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

  const goToServicesCategory = useCallback(
    (categoryName: string) => {
      const currentIdx = getTabIndex(location.pathname);
      const nextIdx = getTabIndex("/user/services");
      if (currentIdx >= 0 && nextIdx >= 0 && currentIdx !== nextIdx) {
        setNavDirection(nextIdx > currentIdx ? "left" : "right");
      }
      navigate("/user/services", { state: { openCategory: categoryName } });
      setMenuOpen(false);
      setServicesExpanded(false);
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

  useEffect(() => {
    setMenuOpen(false);
    setServicesExpanded(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) setServicesExpanded(false);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen && location.pathname.startsWith("/user/services")) {
      setServicesExpanded(true);
    }
  }, [menuOpen, location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

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
          {/* FIX: header always fixed at h-[56px], no wrapping */}
          <header className="flex-shrink-0 z-50 bg-background/95 backdrop-blur-md border-b border-border h-[60px]">
            <div className="flex items-center justify-between px-3 h-full gap-2">

              {/* Left: hamburger + portal name */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/80 transition-colors"
                  aria-label="Open menu"
                >
                  <img
                    src="/icons/hamburger.svg"
                    alt=""
                    className="w-6 h-6 dark:invert"
                  />
                </button>
                <Link to="/user" className="min-w-0 group">
                  {/* FIX: single line, truncate if too long */}
                  <p className="text-foreground text-[14px] font-semibold leading-tight tracking-[0.01em] truncate max-w-[140px] group-hover:text-primary transition-colors">
                    {t("welcomeTo")}
                  </p>
                </Link>
              </div>

              {/* Right: action icons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  to="/user/notifications"
                  className="relative w-8 h-8 rounded-full bg-secondary dark:bg-[#1A1A1A] hover:bg-secondary/80 dark:hover:bg-[#252525] flex items-center justify-center transition-colors"
                  aria-label="Notifications"
                >
                  <Icon icon="mi:notification" className="w-5 h-5 text-foreground dark:text-[#E4E4E4]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#D81B60]" />
                  )}
                </Link>

                <Link
                  to="/user/settings"
                  className="w-8 h-8 rounded-full bg-secondary dark:bg-[#1A1A1A] hover:bg-secondary/80 dark:hover:bg-[#252525] flex items-center justify-center transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4 text-foreground" />
                </Link>

                {/* Language switcher */}
                <button
                  type="button"
                  onClick={() => {
                    const next = i18n.language === "hi" ? "en" : "hi";
                    i18n.changeLanguage(next);
                    localStorage.setItem("lang", next);
                  }}
                  className="h-8 px-2 rounded-full bg-secondary dark:bg-[#1A1A1A] hover:bg-secondary/80 dark:hover:bg-[#252525] flex items-center justify-center transition-colors text-[11px] font-bold text-foreground tracking-wide select-none"
                  aria-label="Toggle language"
                >
                  {i18n.language === "hi" ? "EN" : "हिं"}
                </button>

                <button
                  onClick={toggleTheme}
                  className="w-8 h-8 rounded-full bg-secondary dark:bg-[#1A1A1A] hover:bg-secondary/80 dark:hover:bg-[#252525] flex items-center justify-center transition-colors"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="w-4 h-4 text-foreground" />
                  ) : (
                    <Moon className="w-4 h-4 text-foreground" />
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* Slide-in menu */}
          <div
            className={`absolute inset-0 z-[60] transition-opacity duration-[400ms] ease-out ${
              menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={!menuOpen}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <aside
              className={`absolute top-0 left-0 bottom-0 w-1/2 min-w-[200px] max-w-[280px] bg-background border-r border-border shadow-2xl flex flex-col transition-transform duration-[400ms] ease-out ${
                menuOpen ? "translate-x-0" : "-translate-x-full"
              }`}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-start justify-between gap-2 px-5 pt-6 pb-4 border-b border-border">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("menu")}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{t("grievancePortal")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="shrink-0 w-9 h-9 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const IconComp = item.icon;
                  const active = isActive(item.to);
                  const isServices = "hasCategories" in item && item.hasCategories;

                  if (isServices) {
                    return (
                      <div key={item.to} className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => setServicesExpanded((v) => !v)}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
                            active
                              ? "bg-primary/12 text-primary font-semibold"
                              : "text-foreground hover:bg-secondary/80"
                          }`}
                        >
                          <IconComp
                            className={`w-5 h-5 shrink-0 ${active ? "stroke-[2.5px]" : "stroke-[1.8px]"}`}
                          />
                          <span className="text-sm flex-1 text-left">{item.label}</span>
                          <ChevronDown
                            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                              servicesExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-200 ease-out ${
                            servicesExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                          }`}
                        >
                          <div className="pl-4 pr-2 pb-1 space-y-0.5">
                            <Link
                              to="/user/services"
                              onClick={() => {
                                handleTabPress("/user/services");
                                setMenuOpen(false);
                              }}
                              className="block px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            >
                              {t("allServicesMenu")}
                            </Link>
                            {menuCategories.map((cat: { _id: string; name: string }) => (
                              <button
                                key={cat._id}
                                type="button"
                                onClick={() => goToServicesCategory(cat.name)}
                                className="w-full text-left px-4 py-2.5 text-xs text-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors truncate"
                              >
                                {cat.name}
                              </button>
                            ))}
                            {menuCategories.length === 0 && (
                              <p className="px-4 py-2 text-xs text-muted-foreground">{t("noCategories")}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => {
                        handleTabPress(item.to);
                        setMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
                        active
                          ? "bg-primary/12 text-primary font-semibold"
                          : "text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      <IconComp
                        className={`w-5 h-5 shrink-0 ${active ? "stroke-[2.5px]" : "stroke-[1.8px]"}`}
                      />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>

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