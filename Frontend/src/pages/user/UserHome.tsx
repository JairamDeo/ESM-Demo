import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, FileText, Pencil, ClipboardList } from "lucide-react";
import { useMyGrievances } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";

const services = [
  { icon: "👤", label: "Identity & Personal", color: "bg-primary/15" },
  { icon: "💰", label: "Pension & Financial", color: "bg-warning/15" },
  { icon: "👨‍👩‍👧", label: "Family Details", color: "bg-info/15" },
  { icon: "📋", label: "Requests & Tracking", color: "bg-success/15" },
];

const progressMap: Record<string, number> = { pending:20,"in-progress":60,escalated:55,resolved:100 };

export default memo(function UserHome() {
  const { user } = useAuth();
  const { data: complaints = [] } = useMyGrievances();

  const recentComplaint = useMemo(() => complaints[0] || null, [complaints]);
  const progress = recentComplaint ? (progressMap[recentComplaint.status] || 20) : 80;
  const circumference = 138.2;

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-md lg:max-w-5xl px-4 lg:px-8 space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">
              {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Welcome to Grievance Portal"}
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground">Raise and monitor your concerns easily</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 border border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search complaint, services" className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full" />
        </div>

        <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl p-5 border border-primary/20">
          <h2 className="text-base lg:text-lg font-bold text-foreground mb-1">All Your Grievance Services in One Place</h2>
          <p className="text-xs lg:text-sm text-muted-foreground mb-3">Raise complaints, track status, and get timely updates with ease.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/user/raise-grievance" className="bg-primary rounded-2xl p-4 text-primary-foreground hover:opacity-90">
                <Pencil className="w-5 h-5 mb-3" />
                <h3 className="font-bold text-sm mb-1.5">Raise Grievance</h3>
                <ul className="text-[10px] space-y-0.5 opacity-90 mb-3">
                  <li>✓ Register Complaint</li><li>✓ Track Status</li><li>✓ Get Resolution</li>
                </ul>
                <div className="flex items-center gap-1 text-xs font-semibold">Start Now <ArrowRight className="w-3 h-3" /></div>
              </Link>
              <div className="flex flex-col gap-3">
                <Link to="/user/services" className="bg-success/15 rounded-2xl p-4 flex-1 hover:bg-success/20">
                  <ClipboardList className="w-5 h-5 text-success mb-2" />
                  <h3 className="font-semibold text-sm text-foreground">Service</h3>
                  <p className="text-[10px] text-muted-foreground">View available services</p>
                </Link>
                <Link to="/user/complaints" className="bg-info/15 rounded-2xl p-4 flex-1 hover:bg-info/20">
                  <FileText className="w-5 h-5 text-info mb-2" />
                  <h3 className="font-semibold text-sm text-foreground">My Complaints</h3>
                  {complaints.length > 0 && <p className="text-[10px] text-muted-foreground">{complaints.length} case{complaints.length !== 1 ? "s" : ""}</p>}
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-3">Services</h3>
              <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
                {services.map((s) => (
                  <Link key={s.label} to="/user/services" className="flex flex-col items-center gap-1.5 group">
                    <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center text-xl group-hover:scale-105 transition-transform`}>{s.icon}</div>
                    <span className="text-[10px] text-muted-foreground text-center">{s.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3">Recent Complaint</h3>
              {recentComplaint ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">ID: {recentComplaint.grievanceId || recentComplaint.id}</p>
                    <p className="text-xs text-muted-foreground mt-1">Status: <span className="text-info font-medium capitalize">{recentComplaint.status}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">{recentComplaint.type}</p>
                  </div>
                  <div className="relative w-14 h-14 shrink-0">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                      <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(progress / 100) * circumference} ${circumference}`} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">{progress}%</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No complaints yet.</p>
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground/50">Fast, transparent</p>
              <p className="text-lg font-bold text-foreground/50">grievance resolution</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
