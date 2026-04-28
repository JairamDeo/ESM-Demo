import { Link, useLocation } from "react-router-dom";
import { User, Bell, Settings, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex bg-background">

      {/* Sidebar (Desktop Only) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4">
        <h2 className="text-lg font-bold text-foreground mb-6">Grievance Portal</h2>

        <nav className="flex flex-col gap-2">
          <Link to="/user" className={`px-3 py-2 rounded-lg text-sm ${location.pathname === "/user" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>Home</Link>
          <Link to="/user/services" className={`px-3 py-2 rounded-lg text-sm ${location.pathname === "/user/services" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>Services</Link>
          <Link to="/user/complaints" className={`px-3 py-2 rounded-lg text-sm ${location.pathname === "/user/complaints" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>Complaints</Link>
          <Link to="/user/profile" className={`px-3 py-2 rounded-lg text-sm ${location.pathname === "/user/profile" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>Profile</Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">

        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Welcome Back</span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <Link to="/user/notifications" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Link>

            <Link to="/user/settings" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

    </div>
  );
}