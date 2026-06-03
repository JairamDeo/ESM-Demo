import { memo, useState, useCallback } from "react";
import { ListTree, Plus, X, ToggleLeft, ToggleRight, Pencil, Eye, Trash2 } from "lucide-react";
import { useCategories, useCreateCategory, useUpdateCategory, useCaseTypes, useDeleteCaseType } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/stores/rbac";

export default memo(function Categories() {
  const { data: categories = [], isLoading } = useCategories({ status: "all" });
  const { data: caseTypes = [] } = useCaseTypes({ status: "all" });

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const permissions = usePermissions();
  const canManageCategories = permissions.manageCategories;
  const deleteCaseType = useDeleteCaseType();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "" });

  const [editOpen, setEditOpen] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "" });

  const [confirmState, setConfirmState] = useState<null | { id: string; name: string; nextIsActive: boolean }>(null);

  const [viewCategory, setViewCategory] = useState<any>(null);
  const [confirmRemoveCaseType, setConfirmRemoveCaseType] = useState<any>(null);

  const handleAdd = useCallback(async () => {
    if (!form.name.trim()) return;
    await createCategory.mutateAsync({
      name: form.name.trim(),
    });
    setForm({ name: "" });
    setAddOpen(false);
  }, [form, createCategory]);

  const handleEdit = useCallback(async () => {
    if (!editForm.name.trim() || !editOpen) return;
    await updateCategory.mutateAsync({ id: editOpen._id, name: editForm.name.trim() });
    setEditForm({ name: "" });
    setEditOpen(null);
  }, [editForm, editOpen, updateCategory]);

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

  const handleRemoveCaseType = useCallback(async () => {
    if (!confirmRemoveCaseType) return;
    await deleteCaseType.mutateAsync(confirmRemoveCaseType._id);
    setConfirmRemoveCaseType(null);
  }, [confirmRemoveCaseType, deleteCaseType]);

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

        {canManageCategories && (
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

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Edit Category Name</h2>
              <button onClick={() => setEditOpen(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ name: e.target.value })}
                  placeholder="e.g. Welfare"
                  className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditOpen(null)}
                  className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={updateCategory.isPending || !editForm.name.trim()}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  {updateCategory.isPending
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : "Save"
                  }
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

      {/* View Case Types Modal */}
      {viewCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl animate-fade-in max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Case Types for {viewCategory.name}</h2>
                <p className="text-sm text-muted-foreground">{Array.isArray(caseTypes) ? caseTypes.filter((ct: any) => ct.categoryId === viewCategory._id).length : 0} case types in this category</p>
              </div>
              <button onClick={() => setViewCategory(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {(() => {
                const related = Array.isArray(caseTypes) ? caseTypes.filter((ct: any) => ct.categoryId === viewCategory._id) : [];
                if (related.length === 0) {
                  return <p className="text-center text-sm text-muted-foreground py-8">No case types found in this category.</p>;
                }
                return related.map((ct: any) => (
                  <div key={ct._id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-secondary/30">
                    <div>
                      <p className="font-medium text-sm text-foreground">{ct.name}</p>
                      {ct.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ct.description}</p>}
                    </div>
                    {isSuperAdmin && (
                      <button
                        onClick={() => setConfirmRemoveCaseType(ct)}
                        className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors cursor-pointer"
                        title="Remove Case Type"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Case Type Modal */}
      {confirmRemoveCaseType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-destructive">Remove Case Type</h2>
              <button onClick={() => setConfirmRemoveCaseType(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Do you really want to remove the case type <span className="text-foreground font-medium">“{confirmRemoveCaseType.name}”</span> from this category?
              <br/><br/>
              <span className="text-xs text-destructive bg-destructive/10 p-2 rounded block">
                Warning: This will permanently delete the case type everywhere in the system.
              </span>
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmRemoveCaseType(null)}
                disabled={deleteCaseType.isPending}
                className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveCaseType}
                disabled={deleteCaseType.isPending}
                className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {deleteCaseType.isPending
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : "Remove"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array(8).fill(0).map((_, i) => (
          <div key={i} className="h-40 bg-card rounded-xl border border-border animate-pulse" />
        )) : categories.map((cat: any) => {
          const isActive = cat.isActive !== false; // default true if not set
          const relatedCaseTypes = Array.isArray(caseTypes) ? caseTypes.filter((ct: any) => ct.categoryId === cat._id) : [];
          return (
            <div
              key={cat._id}
              className={`bg-card rounded-xl border p-5 transition-all group flex flex-col
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

                  {canManageCategories && (
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

              {/* Name & Edit */}
              <div className="flex items-center justify-between flex-1">
                <h3 className="font-semibold text-foreground text-sm pr-2">{cat.name}</h3>
                {isSuperAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditForm({ name: cat.name });
                      setEditOpen(cat);
                    }}
                    className="text-muted-foreground hover:text-primary transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Edit Name"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* View Case Types Button */}
              <div className="mt-4 pt-3 border-t border-border">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewCategory(cat);
                  }}
                  className="w-full py-2 bg-secondary/50 hover:bg-secondary text-foreground text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Case Types ({relatedCaseTypes.length})
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
