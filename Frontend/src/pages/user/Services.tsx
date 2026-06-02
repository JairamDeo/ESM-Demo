import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft } from "lucide-react";
import { Icon } from "@iconify/react";
import { useCaseTypes } from "@/hooks/useApi";

const CATEGORY_ORDER = [
  "Identity & personal",
  "Pension & Financial",
  "Family Details",
  "Requests & Tracking",
] as const;

const displayCategoryTitle = (category: string) => {
  // Keep the existing UI spelling for now (matches current design).
  if (category.toLowerCase() === "identity & personal") return "Idenity & personal";
  return category;
};

const CATEGORY_ICONS: Record<string, JSX.Element> = {
  "Identity & personal": <img src="/icons/user.svg" alt="" className="w-5 h-5" />,
  "Pension & Financial": <Icon icon="noto:money-bag" className="w-5 h-5 text-info" />,
  "Family Details": <Icon icon="noto-v1:family" className="w-5 h-5 text-info" />,
  "Requests & Tracking": <Icon icon="glyphs-poly:check-badge" className="w-5 h-5" />,
};

const SERVICE_ICON_BY_NAME: Record<string, string> = {
  "Update Name": "/icons/updatename.svg",
  "Update Aadhaar & PAN": "/icons/address-card.svg",
  "Update Mobile & Email": "/icons/mobile.svg",
  "Update Address": "/icons/location.svg",
  "Resolve Pension Issues": "/icons/hand.svg",
  "Pension Payment Order": "/icons/money.svg",
  "Monthly Pay Slip": "/icons/notes.svg",
  "Stop FMA": "/icons/medical.svg",
  "Add Nominee": "/icons/person.svg",
  "Add Family Details": "/icons/family.svg",
  "Add/Update Family Details": "/icons/family.svg",
  "Update Spouse Details": "/icons/spouse.svg",
  "Update DOB of Spouse": "/icons/event.svg",
  "Death Intimation": "/icons/document.svg",
  "Grievance for Increment": "/icons/graph.svg",
  "Track Case Status": "/icons/factcheck.svg",
  "SMS / Portal Alerts": "/icons/alert.svg",
};

export default function Services() {
  const { data: caseTypes = [], isLoading } = useCaseTypes({ status: "active" });
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = Array.isArray(caseTypes) ? caseTypes : [];

    const filtered = q
      ? list.filter((ct: any) => {
          const name = String(ct?.name ?? "").toLowerCase();
          const desc = String(ct?.description ?? "").toLowerCase();
          const category = String(ct?.category ?? "").toLowerCase();
          return name.includes(q) || desc.includes(q) || category.includes(q);
        })
      : list;

    const map = new Map<string, any[]>();
    for (const ct of filtered) {
      const category = String(ct?.category ?? "Other");
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(ct);
    }

    // Sort items by casetypeN if present, else name.
    for (const [category, items] of map.entries()) {
      items.sort((a: any, b: any) => {
        const aId = String(a?.id ?? "");
        const bId = String(b?.id ?? "");
        const aMatch = /^casetype(\d+)$/i.exec(aId);
        const bMatch = /^casetype(\d+)$/i.exec(bId);
        if (aMatch && bMatch) return Number(aMatch[1]) - Number(bMatch[1]);
        return String(a?.name ?? "").localeCompare(String(b?.name ?? ""));
      });
      map.set(category, items);
    }

    const orderedCategories = [
      ...CATEGORY_ORDER.filter((c) => map.has(c)),
      ...Array.from(map.keys()).filter((c) => !CATEGORY_ORDER.includes(c as any)).sort(),
    ];

    return orderedCategories.map((category) => ({
      category,
      icon: CATEGORY_ICONS[category] ?? <Icon icon="mdi:shape" className="w-5 h-5 text-info" />,
      items: map.get(category) ?? [],
    }));
  }, [caseTypes, search]);

  return (
    <div className="px-2 space-y-3 animate-fade-in ">

      {/* Header */}
      <div className="flex items-center gap-5">
        <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
          <ChevronLeft className="w-5 h-5 " color="#FFFFFF" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Services</h1>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-[#222223] rounded-xl px-4 py-3">
        <Search className="w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search services"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground/40 w-full"
        />
      </div>

      {/* Categories */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-[#1B1B1B] p-3 h-[150px] animate-pulse" />
          ))}
        </div>
      ) : grouped.map((cat) => (
        <div key={cat.category} className="rounded-xl bg-[#1B1B1B] p-3 lg:h-[150px] ">
          <div className="flex items-center gap-2 mb-3 lg:gap-4 lg:mb-2  ">
            <span className="text-lg ">{cat.icon}</span>
            <h2 className="font-semibold text-sm text-foreground lg:text-md lg:font-bold">
              {displayCategoryTitle(cat.category)}
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {cat.items.map((ct: any) => {
              const icon = SERVICE_ICON_BY_NAME[String(ct?.name ?? "")] ?? "/icons/document.svg";
              return (
              <Link
                key={String(ct?._id ?? ct?.id ?? ct?.name)}
                to="/user/raise-grievance"
                state={{ caseType: ct.name }}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className="w-14 h-14 lg:mt-2 lg:w-18 lg:h-18  rounded-sm bg-[#222223] flex items-center justify-center group-hover:border-primary/30 transition-colors">
                  <img
                    src={icon}
                    alt={ct.name}
                    className="w-[24px] h-[24px] object-contain"
                  />
                </div>
                <span className="text-[10px] lg:text-[12px] text-foreground/80 text-center leading-tight">
                  {ct.name}
                </span>
              </Link>
            )})}
          </div>
        </div>
      ))}

    </div>
  );
}