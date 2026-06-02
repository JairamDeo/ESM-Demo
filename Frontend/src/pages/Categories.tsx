import { memo, useState, useCallback } from "react";
import { ListTree, Plus, X, ToggleLeft, ToggleRight } from "lucide-react";
import { useCategories, useCreateCategory, useUpdateCategory, useCaseTypes } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";

export default memo(function Categories() {
  const { data: categories = [], isLoading } = useCategories({ status: "all" });
  const { data: caseTypes = [] } = useCaseTypes({ status: "all" });

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const [confirmState, setConfirmState] = useState<null | { id: string; name: string; nextIsActive: boolean }>(null);

  const handleAdd = useCallback(async () => {
    if (!form.name.trim()) return;
    await createCategory.mutateAsync({
      name: form.name.trim(),
    });
    setForm({ name: "" });
    setAddOpen(false);
  }, [form, createCategory]);

  const handleToggleActive = useCallback((cat: any) => {
    setConfirmState({
      id: cat._id,
      name: cat.name,
      nextIsActive: !(cat.isActive !== false),
    });
  }, []);

  const confirmToggleActive = useCallback(async () => {
    if (!confirmState) return;
    await updateCategory.mutateAsync({ id: confirmState.id, isActive: confirmState.nextIsActive });
    setConfirmState(null);
  }, [confirmState, updateCategory]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories Master</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {categories.length} categories · {categories.filter((cat: any) => cat.isActive !== false).length} active
          </p>
        </div>

        {/* Add button — super_admin only */}
        {isSuperAdmin && (
          <button
            onClick={() => setAddOpen(true)}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>

      {/* Add Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Add Category</h2>
              <button onClick={() => setAddOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ name: e.target.value })}
                  placeholder="e.g. Welfare"
                  className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
                />
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
                  disabled={createCategory.isPending || !form.name.trim()}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  {createCategory.isPending
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
                {confirmState.nextIsActive ? "Activate Category" : "Deactivate Category"}
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
                disabled={updateCategory.isPending}
                className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleActive}
                disabled={updateCategory.isPending}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {updateCategory.isPending
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
        {isLoading ? Array(8).fill(0).map((_, i) => (
          <div key={i} className="h-32 bg-card rounded-xl border border-border animate-pulse" />
        )) : categories.map((cat: any) => {
          const isActive = cat.isActive !== false; // default true if not set
          const relatedCaseTypes = Array.isArray(caseTypes) ? caseTypes.filter((ct: any) => ct.categoryId === cat._id) : [];
          return (
            <div
              key={cat._id}
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
                    <ListTree className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
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
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(cat); }}
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

              {/* Name */}
              <h3 className="font-semibold text-foreground text-sm">{cat.name}</h3>

              {/* Stats & Case Types */}
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  {relatedCaseTypes.length} Case Type{relatedCaseTypes.length !== 1 ? 's' : ''}
                </p>
                {relatedCaseTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {relatedCaseTypes.slice(0, 3).map((ct: any) => (
                      <span key={ct._id || ct.id} className="text-[10px] px-2 py-0.5 bg-secondary text-muted-foreground rounded-md border border-border/50">
                        {ct.name}
                      </span>
                    ))}
                    {relatedCaseTypes.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 bg-secondary text-muted-foreground rounded-md border border-border/50">
                        +{relatedCaseTypes.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
