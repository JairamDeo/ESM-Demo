import { memo, useState, useCallback } from "react";
import { FileText, Users, CreditCard, Heart, Phone, MapPin, Shield, UserPlus, Receipt, FileCheck, Calendar, UserCog, Home, TrendingUp, Locate, Bell, Plus, X, ToggleLeft, ToggleRight } from "lucide-react";
import { useCaseTypes, useCreateCaseType, useUpdateCaseType } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";

const ICONS: Record<number, any> = {
  1:FileText, 2:Heart, 3:CreditCard, 4:Shield, 5:Phone,
  6:MapPin, 7:Shield, 8:UserPlus, 9:Receipt, 10:FileCheck,
  11:Calendar, 12:UserCog, 13:Home, 14:TrendingUp, 15:Locate, 16:Bell
};

export default memo(function CaseTypes() {
  const { data: caseTypes = [], isLoading } = useCaseTypes();
  const createCaseType = useCreateCaseType();
  const updateCaseType = useUpdateCaseType();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const handleAdd = useCallback(async () => {
    if (!form.name.trim()) return;
    await createCaseType.mutateAsync({ name: form.name.trim(), description: form.description.trim() });
    setForm({ name: "", description: "" });
    setAddOpen(false);
  }, [form, createCaseType]);

  const handleToggleActive = useCallback(async (ct: any) => {
    const confirmed = window.confirm(
      `Are you sure you want to ${ct.isActive ? "deactivate" : "activate"} "${ct.name}"?`
    );
    if (!confirmed) return;
    await updateCaseType.mutateAsync({ id: ct._id, isActive: !ct.isActive });
  }, [updateCaseType]);

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
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
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
              <button onClick={() => setAddOpen(false)} className="text-muted-foreground hover:text-foreground">
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
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setAddOpen(false)}
                  className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={createCaseType.isPending || !form.name.trim()}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60"
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

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array(16).fill(0).map((_, i) => (
          <div key={i} className="h-44 bg-card rounded-xl border border-border animate-pulse" />
        )) : caseTypes.map((ct: any) => {
          const Icon = ICONS[ct.id] || FileText;
          const isActive = ct.isActive !== false; // default true if not set
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
                  <span className="text-xs font-mono text-muted-foreground">#{String(ct.id).padStart(2, "0")}</span>
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
                      className="text-muted-foreground hover:text-foreground transition-colors"
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