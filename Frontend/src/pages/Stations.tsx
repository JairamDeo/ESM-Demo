import { usePermissions } from "@/stores/rbac";
import { useState, memo, useCallback, useMemo } from "react";
import { Building2, MapPin, Users, FileText, QrCode, CheckCircle2, X, Search, Plus, ChevronDown, Trash2 } from "lucide-react";
import { useStations, useCreateStation, useDeleteStation, useHQs, useStates } from "@/hooks/useApi";
import ConfirmDialog from "@/components/ConfirmDialog";

export default memo(function Stations() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("");
  const [form, setForm] = useState({ name: "", city: "", state: "Maharashtra", officers: "4", address: "", hqId: "", hqName: ""   });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useStations({ search, state: filterState || undefined });
  const createStation = useCreateStation();
  const deleteStation = useDeleteStation();
  const permissions = usePermissions();
  const canManageStations = permissions.manageStations;
  const stations = useMemo(() => data?.data || [], [data]);
  const { data: hqList = [] } = useHQs();
  const { data: statesList = [] } = useStates();

  const handleSubmit = useCallback(async () => {
    if (!form.city.trim() || !form.state) return;
    const name = form.name.trim() || `${form.city.trim()} Station HQ`;
    await createStation.mutateAsync({
      name,
      city: form.city.trim(),
      state: form.state,
      hqId: form.hqId,
      hqName: form.hqName,
      officerCount: Number(form.officers) || 0,
      address: form.address,
    });
    setForm({ name: "", city: "", state: "Maharashtra", officers: "4", address: "", hqId: "", hqName: ""   });
    setOpen(false);
  }, [form, createStation]);

  const handleDelete = useCallback((station: any) => {
    setDeleteTarget(station);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteStation.mutateAsync(deleteTarget._id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteStation]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Station Headquarters</h1>
          <p className="text-muted-foreground text-sm mt-1">{stations.length} Station HQs across Maharashtra & Gujarat</p>
        </div>
        {canManageStations && (
          <button onClick={() => setOpen(true)} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 self-start sm:self-auto">
            <Building2 className="w-4 h-4" /> Add Station
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stations..." className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full" />
        </div>
        <div className="relative">
          <select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="appearance-none bg-secondary/50 border border-border rounded-lg px-4 py-2 pr-10 text-sm outline-none cursor-pointer text-secondary-foreground hover:bg-secondary/80">
            <option value="">All States</option>
            {statesList.map((s: any) => (<option key={s._id} value={s.name}>{s.name}</option>))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground pointer-events-none" />
        </div>
      </div>

      {/* Add Station Modal */}
      {/* {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Add Station HQ</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">City / Location *</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Amravati" className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary" />
                {form.city && <p className="text-xs text-muted-foreground mt-1">Name: <span className="text-foreground">{form.city} Station HQ</span></p>}
              </div>
              <div> */}
                {/* <label className="text-xs font-medium text-muted-foreground">State *</label>
                <div className="relative mt-1">
                  <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full appearance-none px-3 py-2 pr-10 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary">
                    {STATES.map((s) => (<option key={s}>{s}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Number of Officers</label>
                <input type="number" min="0" value={form.officers} onChange={(e) => setForm({ ...form, officers: e.target.value })} className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Address (optional)</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary resize-none placeholder:text-muted-foreground" placeholder="Full postal address..." />
              </div>
              <button onClick={handleSubmit} disabled={createStation.isPending || !form.city} className="w-full mt-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                {createStation.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Station
              </button>
            </div>
          </div>
        </div>
      )} */}

  {open && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">Add Station HQ</h2>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">

        {/* HQ dropdown — first */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Headquarters *</label>
      <div className="relative mt-1">
      <select
      value={form.hqId}
      onChange={(e) => {
        const selected = hqList.find((h) => h._id === e.target.value);
        setForm({ ...form, hqId: e.target.value, hqName: selected?.name || "" });
      }}
      className="w-full appearance-none px-3 py-2 pr-10 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
    >
      <option value="">Select Headquarters</option>
      {hqList.map((h) => (
        <option key={h._id} value={h._id}>{h.name}</option>
      ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
      </div>
    </div>


        {/* State dropdown first */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">State *</label>
          <div className="relative mt-1">
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full appearance-none px-3 py-2 pr-10 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
            >
              <option value="">Select State</option>
              {statesList.map((s: any) => <option key={s._id} value={s.name}>{s.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
          </div>
        </div>

        {/* City */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">City / Location *</label>
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="e.g. Amravati"
            className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
          />
          {form.city && (
            <p className="text-xs text-muted-foreground mt-1">
              Name: <span className="text-foreground">{form.city} Station HQ</span>
            </p>
          )}
        </div>

        {/* Number of officers */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Number of Officers</label>
          <input
            type="number" min="0" value={form.officers}
            onChange={(e) => setForm({ ...form, officers: e.target.value })}
            className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Address */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Address (optional)</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
            className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary resize-none placeholder:text-muted-foreground"
            placeholder="Full postal address..."
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={createStation.isPending || !form.city || !form.state || !form.hqId}
          className="w-full mt-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {createStation.isPending
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Plus className="w-4 h-4" />
          }
          Add Station
        </button>
      </div>
    </div>
  </div>
)}



      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="h-48 bg-card rounded-xl border border-border animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stations.map((s: any) => {
            const resRate = s.totalCases > 0 ? Math.round((s.resolvedCases / s.totalCases) * 100) : 0;
            const isDeleting = deleteTarget?._id === s._id && deleteStation.isPending;
            return (
              <div key={s._id || s.name} className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all">

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{s.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {s.hqName || s.hqId?.name || "—"} · {s.stateName || s.state?.name || s.state}
                      </div>
                    </div>
                  </div>

                  {/* Right side — QR status + Delete */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${s.qrActive ? "bg-success" : "bg-muted-foreground"}`} />
                      <span className="text-xs text-muted-foreground">{s.qrActive ? "QR Active" : "QR Inactive"}</span>
                    </div>

                    {canManageStations && (
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={isDeleting}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete Station"
                      >
                        {isDeleting
                          ? <span className="w-3.5 h-3.5 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin block" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: Users,        val: s.officerCount,  label: "Officers", color: "text-primary"  },
                    { icon: FileText,     val: s.totalCases,    label: "Cases",    color: "text-info"     },
                    { icon: CheckCircle2, val: s.resolvedCases, label: "Resolved", color: "text-success"  },
                    { icon: QrCode,       val: `${resRate}%`,   label: "Rate",     color: "text-warning"  },
                  ].map(({ icon: Icon, val, label, color }) => (
                    <div key={label} className="text-center p-2 rounded-lg bg-secondary/50">
                      <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                      <p className="text-sm font-bold text-foreground">{val}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

              </div>
            );
          })}
          {stations.length === 0 && (
            <div className="col-span-2 py-16 text-center text-muted-foreground">No stations found.</div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Station HQ"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?\n\nThis action cannot be undone. All associated data will be removed.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteStation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
});