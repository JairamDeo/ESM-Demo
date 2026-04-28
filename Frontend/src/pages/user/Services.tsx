import { Link } from "react-router-dom";
import { ArrowLeft, Search, User, Wallet, Users, ClipboardList } from "lucide-react";

const categories = [
  {
    icon: <User className="w-5 h-5 text-primary" />,
    emoji: "👤",
    title: "Identity & Personal",
    items: [
      { label: "Update Name", desc: "As per Pt II Order" },
      { label: "Aadhaar & PAN", desc: "Identity document updates" },
      { label: "Update Mobile & Email", desc: "Contact detail updates" },
      { label: "Update Address", desc: "Residential address changes" },
    ],
  },
  {
    icon: <Wallet className="w-5 h-5 text-warning" />,
    emoji: "💰",
    title: "Pension & Financial",
    items: [
      { label: "Resolve Pension Issues", desc: "Pension queries & corrections" },
      { label: "Pension Payment Order", desc: "PPO access & updates" },
      { label: "Monthly Pay Slip", desc: "Download & view slips" },
      { label: "Stop FMA", desc: "Fixed Medical Allowance" },
    ],
  },
  {
    icon: <Users className="w-5 h-5 text-info" />,
    emoji: "👨‍👩‍👧",
    title: "Family Details",
    items: [
      { label: "Add Nominee", desc: "Nominee registration" },
      { label: "Add Family Details", desc: "Family composition records" },
      { label: "Update Spouse Details", desc: "Name, PAN, Aadhaar, Email" },
      { label: "Update DOB of Spouse", desc: "Date of birth correction" },
    ],
  },
  {
    icon: <ClipboardList className="w-5 h-5 text-success" />,
    emoji: "📋",
    title: "Requests & Tracking",
    items: [
      { label: "Death Intimation", desc: "ESM & Dependents" },
      { label: "Grievance for Increment", desc: "As per Rank & Service" },
      { label: "Track Case Status", desc: "Real-time tracking portal" },
      { label: "SMS / Portal Alerts", desc: "Notifications on updates" },
    ],
  },
];

export default function Services() {
  return (
    <div className="px-4 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Services</h1>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 border border-border">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search services"
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      {/* Categories */}
      {categories.map((cat) => (
        <div key={cat.title}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{cat.emoji}</span>
            <h2 className="font-semibold text-sm text-foreground">{cat.title}</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {cat.items.map((item) => (
              <Link
                key={item.label}
                to="/user/raise-grievance"
                state={{ caseType: item.label }}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors">
                  <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
                    <span className="text-primary text-xs">📄</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
