import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight, Plus, Minus } from "lucide-react";
import { useCaseTypes } from "@/hooks/useApi";

const CATEGORY_CONFIG = [
  {
    key: "Identity & Personal",
    title: "Identity & Personal",
    icon: <img src="/icons/profile-filled.svg" alt="" className="w-7 h-7" />,
    bg: "bg-[#D2E5FC]",
  },
  {
    key: "Pension & Financial",
    title: "Pension & Financial",
    icon: <img src="/icons/money-rupee.svg" alt="" className="w-7 h-7" />,
    bg: "bg-[#FDE7E7]",
  },
  {
    key: "Family Details",
    title: "Family Details",
    icon: <img src="/icons/family.svg" alt="" className="w-7 h-7" />,
    bg: "bg-[#E8FDE7]",
  },
  {
    key: "Requests & Tracking",
    title: "Requests & Tracking",
    icon: <img src="/icons/seal-check.svg" alt="" className="w-7 h-7" />,
    bg: "bg-[#FFFFE4]",
  },
] as const;

const normalizeCategory = (value: string) =>
  String(value || "").trim().toLowerCase().replace("idenity", "identity");

const categorySortIndex = (name: string) => {
  const norm = normalizeCategory(name);
  const idx = CATEGORY_CONFIG.findIndex((c) => normalizeCategory(c.key) === norm);
  return idx === -1 ? 999 : idx;
};

const getCaseTypeCategoryLabel = (ct: any) =>
  ct?.categoryName ??
  (typeof ct?.category === "object" && ct?.category?.name ? ct.category.name : null) ??
  (typeof ct?.category === "string" ? ct.category : "Other");

const getCategoryMeta = (categoryName: string) => {
  const meta = CATEGORY_CONFIG.find(
    (c) => normalizeCategory(c.key) === normalizeCategory(categoryName)
  );
  return meta ?? { key: categoryName, title: categoryName, icon: null, bg: "bg-secondary" };
};

export default function Services() {
  const { data: caseTypes = [], isLoading, isError, error } = useCaseTypes({ status: "active" });
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>("Identity & Personal");

  const groupedCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = Array.isArray(caseTypes) ? caseTypes : [];

    const filtered = q
      ? list.filter((ct: any) => {
          const name = String(ct?.name ?? "").toLowerCase();
          const desc = String(ct?.description ?? "").toLowerCase();
          const category = getCaseTypeCategoryLabel(ct).toLowerCase();
          return name.includes(q) || desc.includes(q) || category.includes(q);
        })
      : list;

    const byCategory = new Map<string, any[]>();
    for (const ct of filtered) {
      const category = getCaseTypeCategoryLabel(ct).trim() || "Other";
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category)!.push(ct);
    }

    return Array.from(byCategory.entries())
      .sort(([a], [b]) => categorySortIndex(a) - categorySortIndex(b))
      .map(([categoryName, items]) => {
        const meta = getCategoryMeta(categoryName);
        return {
          key: categoryName,
          title: meta.title,
          icon: meta.icon,
          bg: meta.bg,
          items: items.map((ct: any) => ({
            id: String(ct._id ?? ct.id ?? ct.name),
            label: ct.name,
            description: ct.description || "",
          })),
        };
      });
  }, [caseTypes, searchQuery]);

  // open all categories when searching
  const effectiveOpen = searchQuery.trim()
    ? groupedCategories.map((c) => c.key)
    : openCategory
    ? [openCategory]
    : [];

  const isOpen = (key: string) => effectiveOpen.includes(key);

  const toggle = (key: string) => {
    if (searchQuery.trim()) return;
    setOpenCategory((prev) => (prev === key ? null : key));
  };

  return (
    <div className="px-3 space-y-4 pb-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground mt-1">
          <ChevronRight className="w-5 h-5 rotate-180 text-foreground" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Services</h1>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 border border-border">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search services"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <span className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading services...</p>
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="text-center py-10 bg-card border border-border rounded-2xl space-y-2">
          <p className="text-sm text-destructive">Could not load services.</p>
          <p className="text-xs text-muted-foreground">
            {(error as any)?.response?.data?.message || (error as Error)?.message}
          </p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && groupedCategories.length === 0 && (
        <div className="text-center py-10 bg-card border border-border rounded-2xl">
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No services found matching your search." : "No active services available."}
          </p>
        </div>
      )}

      {/* Accordion Categories */}
      {!isLoading && !isError && groupedCategories.map((cat) => (
        <div
          key={cat.key}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          {/* Category Header — always visible */}
          <button
            onClick={() => toggle(cat.key)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                {cat.icon}
              </div>
              <span className="text-sm font-semibold text-foreground">{cat.title}</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#D6D6D6] dark:bg-secondary flex items-center justify-center flex-shrink-0">
              {isOpen(cat.key)
                ? <Minus className="w-3.5 h-3.5 text-foreground" />
                : <Plus className="w-3.5 h-3.5 text-foreground" />
              }
            </div>
          </button>

          {/* Expanded items */}
          {isOpen(cat.key) && (
            <div className="px-3 pb-3 space-y-2 pt-2">
              {cat.items.map((item) => (
                <Link
                  key={item.id}
                  to="/user/raise-grievance"
                  state={{ caseType: item.label }}
                  className="flex items-center justify-between bg-[#F1F1F1] dark:bg-secondary/40 border border-border rounded-xl px-4 py-3 hover:border-primary/40 transition-all group"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {item.label}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}