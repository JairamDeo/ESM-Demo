import { memo, useState, useCallback } from "react";
import { FileText, Users, CreditCard, Heart, Phone, MapPin, Shield, UserPlus, Receipt, FileCheck, Calendar, UserCog, Home, TrendingUp, Locate, Bell, Plus, X, ToggleLeft, ToggleRight } from "lucide-react";
import { useCaseTypes, useCreateCaseType, useUpdateCaseType ,useCategories } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";

const ICON_LIST = [
  FileText, Heart, CreditCard, Shield, Phone, MapPin, UserPlus, Receipt,
  FileCheck, Calendar, UserCog, Home, TrendingUp, Locate, Bell,
] as const;

const getDisplayNumber = (rawId: unknown): number | null => {
  if (typeof rawId === "number" && Number.isFinite(rawId)) return rawId;
  const s = String(rawId ?? "");
  const m = /^casetype(\d+)$/i.exec(s);
  if (m) return Number(m[1]);
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export default memo(function CaseTypes() {
  const { data: caseTypes = [], isLoading } = useCaseTypes();
  const { data: categories = [] } = useCategories();

  const createCaseType = useCreateCaseType();
  const updateCaseType = useUpdateCaseType();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "" });
  const [confirmState, setConfirmState] = useState<null | { id: string; name: string; nextIsActive: boolean }>(null);

  const handleAdd = useCallback(async () => {
    if (!form.name.trim()) return;
    if (!form.category.trim()) return;
    await createCaseType.mutateAsync({
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
    });
    setForm({ name: "", description: "", category: "" });
    setAddOpen(false);
  }, [form, createCaseType]);

  const handleToggleActive = useCallback((ct: any) => {
    setConfirmState({
      id: ct._id,
      name: ct.name,
      nextIsActive: !(ct.isActive !== false),
    });
  }, []);

  const confirmToggleActive = useCallback(async () => {
    if (!confirmState) return;
    await updateCaseType.mutateAsync({ id: confirmState.id, isActive: confirmState.nextIsActive });
    setConfirmState(null);
  }, [confirmState, updateCaseType]);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Case Types</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {caseTypes.length} case types · {caseTypes.filter((ct: any) => ct.isActive).length} active
          </p>
        </div>

        {/* Add button — super_admin only */}
        {isSuperAdmin && (
          <button
            onClick={() => setAddOpen(true)}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Case Type
          </button>
        )}
      </div>

      {/* Add Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Add Case Type</h2>
              <button onClick={() => setAddOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Medical Certificate"
                  className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Brief description..."
                  className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary resize-none placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary cursor-pointer"
                >
                  <option value="" disabled>Select category to assign</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setAddOpen(false)}
                  className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={createCaseType.isPending || !form.name.trim() || !form.category.trim()}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  {createCaseType.isPending
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Plus className="w-4 h-4" />
                  }
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Activate/Deactivate Modal */}
      {confirmState && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-foreground">
                {confirmState.nextIsActive ? "Activate Case Type" : "Deactivate Case Type"}
              </h2>
              <button onClick={() => setConfirmState(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to {confirmState.nextIsActive ? "activate" : "deactivate"}{" "}
              <span className="text-foreground font-medium">“{confirmState.name}”</span>?
            </p>

            <div className="flex gap-2 pt-5">
              <button
                onClick={() => setConfirmState(null)}
                disabled={updateCaseType.isPending}
                className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleActive}
                disabled={updateCaseType.isPending}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {updateCaseType.isPending
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : (confirmState.nextIsActive ? "Activate" : "Deactivate")
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array(16).fill(0).map((_, i) => (
          <div key={i} className="h-44 bg-card rounded-xl border border-border animate-pulse" />
        )) : caseTypes.map((ct: any, idx: number) => {
          const Icon = ICON_LIST[idx % ICON_LIST.length] || FileText;
          const isActive = ct.isActive !== false; // default true if not set
          const displayN = getDisplayNumber(ct.id) ?? (idx + 1);
          return (
            <div
              key={ct._id || ct.id}
              className={`bg-card rounded-xl border p-5 transition-all group cursor-pointer
                ${isActive
                  ? "border-border hover:border-primary/30"
                  : "border-border/50 opacity-60"
                }`}
            >
              {/* Top row — icon, id, active badge, toggle */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                    ${isActive ? "bg-primary/15 group-hover:bg-primary/25" : "bg-secondary"}`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    #{String(displayN).padStart(2, "0")}
                  </span>
                </div>

                {/* Active/Inactive badge + toggle */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                    ${isActive
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>

                  {/* Toggle button — super_admin only */}
                  {isSuperAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(ct); }}
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title={isActive ? "Deactivate" : "Activate"}
                    >
                      {isActive
                        ? <ToggleRight className="w-5 h-5 text-success" />
                        : <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      }
                    </button>
                  )}
                </div>
              </div>

              {/* Name + Description */}
              <h3 className="font-semibold text-foreground text-sm">{ct.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{ct.description || ct.desc}</p>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                <div>
                  <p className="text-lg font-bold text-foreground">{ct.totalCases}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-warning">{ct.pendingCases}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-success">{ct.resolvedCases}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});