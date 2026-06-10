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
  const stationFromQR = urlParams.get("station") || (location.state as any)?.station || "";
  const preselectedType = (location.state as any)?.caseType || "";
  const isFromQR = !!stationFromQR;

  const [form, setForm] = useState({
    concernType: "",
    caseType:    preselectedType || "",
    stationHQ:   stationFromQR  || "",
    description: "",
    armyNumber:  "",
    rank:        "",
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [servicesOpen, setServicesOpen] = useState(true);
  const createGrievance = useCreateGrievance();

  // ── Sync openCategory when caseTypesList loads ────────────────────────────
  useEffect(() => {
    if (!(caseTypesList as any[]).length) return;

    if (preselectedType) {
      // open the category that contains the preselected case type
      const ct = (caseTypesList as any[]).find((c: any) => c.name === preselectedType);
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

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValidType = ["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024;
      if (!isValidType) toast.error(`${file.name} — only JPG, PNG, PDF allowed`);
      if (!isValidSize) toast.error(`${file.name} — file must be under 5MB`);
      return isValidType && isValidSize;
    });
    setAttachments((prev) => [...prev, ...validFiles].slice(0, 3));
    e.target.value = "";
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!form.concernType || !form.caseType || !form.stationHQ) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("type", form.caseType);
      const veteranName = user?.name?.trim() || "";
      if (veteranName) formData.append("veteranName", veteranName);
      if (user?.phone) formData.append("veteranPhone", user.phone);
      if (form.rank) formData.append("veteranRank", form.rank);
      if (form.armyNumber) formData.append("veteranArmyNo", form.armyNumber);
      formData.append("stationName", form.stationHQ);
      if (form.description) formData.append("description", form.description);
      formData.append("submissionSource", isFromQR ? "qr_code" : "portal");
      formData.append("priority", "medium");
      attachments.forEach((file) => formData.append("attachments", file));

      const result = await createGrievance.mutateAsync(formData);
      toast.success("Grievance submitted successfully!", {
        description: `Complaint ID: ${result?.grievanceId || "Generated"}`,
      });
      navigate("/user/complaints");
    } catch {
      // error handled by hook
    }
  }, [form, user, createGrievance, navigate, isFromQR, attachments]);

  return (
    <div className="bg-background min-h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
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
                                setForm((prev) => ({ ...prev, caseType: item.name }));
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

        {/* Attachments */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Attachments{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (optional · max 3 · JPG, PNG, PDF · 5MB)
            </span>
          </label>
          <label className="flex items-center gap-2 w-full bg-secondary border border-dashed border-border rounded-xl px-4 py-3 cursor-pointer hover:border-primary/50 transition-colors">
            <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              {attachments.length > 0
                ? `${attachments.length} file(s) — tap to add more`
                : "Tap to attach documents"}
            </span>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={attachments.length >= 3}
            />
          </label>
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center justify-between bg-secondary border border-border rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {file.type === "application/pdf"
                      ? <FileText className="w-4 h-4 text-primary shrink-0" />
                      : <Image className="w-4 h-4 text-primary shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-xs text-foreground truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="p-1 rounded-full hover:bg-border text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={createGrievance.isPending || !form.concernType || !form.caseType || !form.stationHQ}
          className="w-full bg-[#826CF3] text-white font-bold text-sm py-4 rounded-xl shadow-[0_4px_16px_rgba(130,108,243,0.35)] flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createGrievance.isPending ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Submitting...
            </>
          ) : (
            "Continue"
          )}
        </button>

      </div>

      <style>{`
        select option { background-color: var(--background); color: var(--foreground); }
      `}</style>
    </div>
  );
});