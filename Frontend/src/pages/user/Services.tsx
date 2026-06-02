import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft } from "lucide-react";
import { Icon } from "@iconify/react";
import { useCaseTypes } from "@/hooks/useApi";

// Icon mapping for case types to display their custom SVGs
const iconMap: Record<string, string> = {
  "update name": "/icons/updatename.svg",
  "update aadhaar & pan": "/icons/address-card.svg",
  "update mobile & email": "/icons/mobile.svg",
  "update address": "/icons/location.svg",
  "resolve pension issues": "/icons/hand.svg",
  "pension payment order": "/icons/money.svg",
  "monthly pay slip": "/icons/notes.svg",
  "stop fma": "/icons/medical.svg",
  "add nominee": "/icons/person.svg",
  "add family details": "/icons/family.svg",
  "add/update family details": "/icons/family.svg",
  "update spouse details": "/icons/spouse.svg",
  "update dob of spouse": "/icons/event.svg",
  "death intimation": "/icons/document.svg",
  "grievance for increment": "/icons/graph.svg",
  "track case status": "/icons/factcheck.svg",
  "sms / portal alerts": "/icons/alert.svg",
  "medical certificate": "/icons/medical.svg",
};

// Category display order + icons (matches admin category names in DB)
const CATEGORY_CONFIG = [
  {
    key: "Identity & Personal",
    title: "Idenity & personal",
    icon: <img src="/icons/user.svg" alt="Identity & Personal" className="w-5 h-5" />,
  },
  {
    key: "Pension & Financial",
    title: "Pension & Financial",
    icon: <Icon icon="noto:money-bag" className="w-5 h-5" />,
  },
  {
    key: "Family Details",
    title: "Family Details",
    icon: <Icon icon="noto-v1:family" className="w-5 h-5" />,
  },
  {
    key: "Requests & Tracking",
    title: "Requests & Tracking",
    icon: <Icon icon="glyphs-poly:check-badge" className="w-5 h-5 text-primary" />,
  },
] as const;

const normalizeCategory = (value: string) =>
  String(value || "").trim().toLowerCase().replace("idenity", "identity");

const matchesCategory = (dbCategory: string, configKey: string) =>
  normalizeCategory(dbCategory) === normalizeCategory(configKey);

export default function Services() {
  const { data: caseTypes = [], isLoading } = useCaseTypes({ status: "active" });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCaseTypes = caseTypes.filter((ct: any) =>
    ct.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ct.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(ct.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedCategories = CATEGORY_CONFIG.map((cfg) => {
    const items = filteredCaseTypes
      .filter((ct: any) => matchesCategory(ct.category, cfg.key))
      .sort((a: any, b: any) => {
        const aMatch = /^casetype(\d+)$/i.exec(String(a?.id ?? ""));
        const bMatch = /^casetype(\d+)$/i.exec(String(b?.id ?? ""));
        if (aMatch && bMatch) return Number(aMatch[1]) - Number(bMatch[1]);
        return String(a?.name ?? "").localeCompare(String(b?.name ?? ""));
      })
      .map((ct: any) => ({
        id: ct._id || ct.id || ct.name,
        label: ct.name,
        desc: ct.description || "",
        icon: iconMap[ct.name.toLowerCase()] || "/icons/document.svg",
      }));

    return { ...cfg, items };
  }).filter((cat) => cat.items.length > 0);

  return (
    <div className="px-2 space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-5">
        <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground cursor-pointer">
          <ChevronLeft className="w-5 h-5" color="#FFFFFF" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Services</h1>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-[#222223] rounded-xl px-4 py-3">
        <Search className="w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search services"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground/40 w-full"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <span className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading services...</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && groupedCategories.length === 0 && (
        <div className="text-center py-12 bg-[#1B1B1B] rounded-xl">
          <p className="text-sm text-muted-foreground">No services found matching your search.</p>
        </div>
      )}

      {/* Categories */}
      {!isLoading &&
        groupedCategories.map((cat) => (
          <div key={cat.key} className="rounded-xl bg-[#1B1B1B] p-3 lg:h-[150px]">
            <div className="flex items-center gap-2 mb-3 lg:gap-4 lg:mb-2">
              <span className="text-lg flex items-center justify-center">{cat.icon}</span>
              <h2 className="font-semibold text-sm text-foreground lg:text-md lg:font-bold">{cat.title}</h2>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {cat.items.map((item) => (
                <Link
                  key={item.id}
                  to="/user/raise-grievance"
                  state={{ caseType: item.label }}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div className="w-14 h-14 lg:mt-2 lg:w-18 lg:h-18 rounded-sm bg-[#222223] flex items-center justify-center group-hover:border-primary/30 transition-colors">
                    <img
                      src={item.icon}
                      alt={item.label}
                      className="w-[24px] h-[24px] object-contain transition-transform group-hover:scale-110"
                    />
                  </div>
                  <span className="text-[10px] lg:text-[12px] text-foreground/80 text-center leading-tight">
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
