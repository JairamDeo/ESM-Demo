import { useState, memo, useCallback, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, Paperclip, X, FileText, Image, ChevronUp } from "lucide-react";
import { useCreateGrievance, useCaseTypes, useStations } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CATEGORY_CONFIG = [
  { key: "Identity & Personal", icon: <img src="/icons/profile-filled.svg" className="w-5 h-5" />, bg: "bg-[#D2E5FC]" },
  { key: "Pension & Financial", icon: <img src="/icons/money-rupee.svg" className="w-5 h-5" />,   bg: "bg-[#FDE7E7]" },
  { key: "Family Details",      icon: <img src="/icons/family.svg" className="w-5 h-5" />,        bg: "bg-[#E8FDE7]" },
  { key: "Requests & Tracking", icon: <img src="/icons/seal-check.svg" className="w-5 h-5" />,   bg: "bg-[#FFFFE4]" },
];

const normalizeCategory = (v: string) =>
  String(v || "").trim().toLowerCase().replace("idenity", "identity");

const getCaseTypeCategoryLabel = (ct: any): string =>
  ct?.categoryName ??
  (typeof ct?.category === "object" ? ct?.category?.name : null) ??
  (typeof ct?.category === "string" ? ct.category : "Other");

const SelectRow = ({ label, value, onChange, children, required = false, disabled = false }: any) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-foreground">
      {label}{required && <span className="text-red-500"> *</span>}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-primary transition-colors cursor-pointer
          ${!value ? "text-muted-foreground" : "text-foreground"}
          ${disabled ? "opacity-60 cursor-not-allowed" : ""}
        `}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      {disabled && (
        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
          QR
        </span>
      )}
    </div>
  </div>
);

const InputRow = ({ label, value, onChange, placeholder, required = false }: any) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-foreground">
      {label}{required && <span className="text-red-500"> *</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
    />
  </div>
);

export default memo(function RaiseGrievance() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: caseTypesList = [] } = useCaseTypes({ status: "active" });
  const { data: stationsData } = useStations({ limit: 100 });
  const stationHQsList = stationsData?.data || [];

  const urlParams = new URLSearchParams(window.location.search);
  const savedForm = (location.state as any)?.form || {};
  const stationFromQR = urlParams.get("station") || (location.state as any)?.station || savedForm.stationHQ || "";
  const preselectedType = (location.state as any)?.caseType || savedForm.caseType || "";
  const isFromQR = !!stationFromQR;

  const [form, setForm] = useState({
    concernType: savedForm.concernType || "",
    caseType:    preselectedType || "",
    caseTypeId:  savedForm.caseTypeId || "",
    stationHQ:   stationFromQR || savedForm.stationHQ || "",
    description: savedForm.description || "",
    armyNumber:  savedForm.armyNumber || "",
    rank:        savedForm.rank || "",
  });

  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [servicesOpen, setServicesOpen] = useState(true);

  // ── Sync openCategory when caseTypesList loads ────────────────────────────
  useEffect(() => {
    if (!(caseTypesList as any[]).length) return;

    if (preselectedType) {
      // open the category that contains the preselected case type
      const ct = (caseTypesList as any[]).find((c: any) => c.name === preselectedType);
      if (ct && !form.caseTypeId) {
        setForm(prev => ({ ...prev, caseTypeId: ct._id }));
      }
      const category = ct ? getCaseTypeCategoryLabel(ct) : null;
      const matched = CATEGORY_CONFIG.find(
        (cfg) => normalizeCategory(cfg.key) === normalizeCategory(category || "")
      );
      setOpenCategory(matched?.key ?? CATEGORY_CONFIG[0].key);
    } else {
      // default open first category
      setOpenCategory(CATEGORY_CONFIG[0].key);
    }
  }, [caseTypesList, preselectedType]);

  // ── Group case types by category ─────────────────────────────────────────
  const groupedCategories = useMemo(() => {
    const list = Array.isArray(caseTypesList) ? (caseTypesList as any[]) : [];
    const byCategory = new Map<string, any[]>();
    for (const ct of list) {
      const category = getCaseTypeCategoryLabel(ct).trim() || "Other";
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category)!.push(ct);
    }
    return CATEGORY_CONFIG.map((cfg) => {
      const matchedKey = [...byCategory.keys()].find(
        (k) => normalizeCategory(k) === normalizeCategory(cfg.key)
      );
      const items = matchedKey ? byCategory.get(matchedKey)! : [];
      return { ...cfg, items };
    }).filter((c) => c.items.length > 0);
  }, [caseTypesList]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!form.concernType || !form.caseType || !form.stationHQ) {
      toast.error("Please fill all required fields");
      return;
    }
    navigate("/user/document-checklist", { state: { form, isFromQR } });
  }, [form, navigate, isFromQR]);

  return (
    <div className="bg-background min-h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/user/services" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Raise Grievance</h1>
        </div>
        <span className="text-xs font-semibold text-[#1754CF] dark:text-[#F0C902]">Step 1 / 3</span>
      </div>

      {/* QR Banner */}
      {isFromQR && (
        <div className="mx-4 mb-3 flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-3 py-2">
          <span className="text-primary text-xs">📱</span>
          <p className="text-xs text-primary">
            Station pre-filled from QR — <span className="font-semibold">{stationFromQR}</span>
          </p>
        </div>
      )}

      <div className="px-4 space-y-4 pb-6">

        {/* ── Services accordion ───────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Services <span className="text-red-500">*</span>
          </label>

          {/* Toggle button showing selected value */}
          <button
            onClick={() => setServicesOpen((p) => !p)}
            className="w-full flex items-center justify-between bg-secondary border border-border rounded-xl px-4 py-3 text-sm transition-colors"
          >
            <span className={form.caseType ? "text-foreground font-normal" : "text-muted-foreground"}>
              {form.caseType || "Select Services"}
            </span>
            {servicesOpen
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {/* Accordion list */}
          {servicesOpen && (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              {groupedCategories.map((cat) => {
                const isOpen = openCategory === cat.key;
                const isSelected = cat.items.some((i: any) => i.name === form.caseType);
                return (
                  <div key={cat.key} className="border-b border-border last:border-none">

                    {/* Category header */}
                    <button
                      onClick={() => setOpenCategory(isOpen ? null : cat.key)}
                      className="w-full flex items-center justify-between px-4 py-3  hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                          {cat.icon}
                        </div>
                        <span className="text-sm font-medium text-foreground">{cat.key}</span>
                      </div>
                      {/* Radio indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? "border-primary bg-primary" : "border-border"
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>

                    {/* Case type items */}
                    {isOpen && (
                      <div className="px-3 pb-2 space-y-1 bg-secondary/20">
                        {cat.items.map((item: any) => {
                          const isItemSelected = form.caseType === item.name;
                          return (
                            <button
                              key={item._id || item.name}
                              onClick={() => {
                                setForm((prev) => ({ ...prev, caseType: item.name, caseTypeId: item._id }));
                                setServicesOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 bg-[#efefef] dark:bg-[#2f2f2f]
                                ${isItemSelected
                                  ? " invert/1 dark:invert-0 font-normal border border-primary/80"
                                  : "text-foreground hover:bg-secondary"
                                }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Concern For */}
        <SelectRow
          label="Concern For"
          value={form.concernType}
          onChange={(v: string) => setForm((prev) => ({ ...prev, concernType: v }))}
          required
        >
          <option value="" disabled hidden>Select concern type</option>
          <option value="Self">Self</option>
          <option value="Dependent">Dependent</option>
        </SelectRow>

        {/* Station HQ */}
        <SelectRow
          label="Station HQ"
          value={form.stationHQ}
          onChange={(v: string) => setForm((prev) => ({ ...prev, stationHQ: v }))}
          required
          disabled={isFromQR}
        >
          <option value="" disabled hidden>Select Station HQ</option>
          {stationHQsList.map((s: any) => (
            <option key={s._id || s.name} value={s.name}>{s.name}</option>
          ))}
        </SelectRow>

        {/* Rank */}
        <InputRow
          label="Rank"
          value={form.rank}
          onChange={(v: string) => setForm((prev) => ({ ...prev, rank: v }))}
          placeholder="Enter rank"
        />

        {/* Army No */}
        <InputRow
          label="Army No"
          value={form.armyNumber}
          onChange={(v: string) => setForm((prev) => ({ ...prev, armyNumber: v }))}
          placeholder="Enter army number"
        />

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={4}
            placeholder="Describe your grievance..."
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!form.concernType || !form.caseType || !form.stationHQ}
          className="w-full bg-[#826CF3] text-white font-bold text-sm py-4 rounded-xl shadow-[0_4px_16px_rgba(130,108,243,0.35)] flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>

      </div>

      <style>{`
        select option { background-color: var(--background); color: var(--foreground); }
      `}</style>
    </div>
  );
});