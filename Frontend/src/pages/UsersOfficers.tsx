import { useState, memo, useCallback, useMemo } from "react";
import { usePermissions } from "@/stores/rbac";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Shield, UserPlus, Search, MoreVertical, X, ChevronDown, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useOfficers, useCreateOfficer, useUpdateOfficer, useToggleOfficerStatus, useDeleteOfficer } from "@/hooks/useApi";

const ROLES = ["ESM Officer", "Station HQ Officer", "Record Office"] as const;
const STATIONS = ["Nagpur Station HQ","Pune Station HQ","Ahmedabad Station HQ","Nashik Station HQ","Aurangabad Station HQ","Kolhapur Station HQ","Solapur Station HQ","Baroda Station HQ","Rajkot Station HQ","Surat Station HQ"];
const RANKS = ["Lt.","Capt.","Maj.","Lt. Col.","Col.","Brig.","Sub.","Hav.","Nk.","Sep."];

const roleBadge: Record<string, string> = {
  "ESM Officer": "bg-primary/15 text-primary",
  "Station HQ Officer": "bg-info/15 text-info",
  "Record Office": "bg-warning/15 text-warning",
};

function ActionsMenu({ officer, onEdit, onToggle, onDelete, canManage }: { officer: any; onEdit: () => void; onToggle: () => void; onDelete: () => void; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-xl shadow-xl py-1 w-44">
            {canManage && <button onClick={() => { onEdit(); setOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors">
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" /> Edit Officer
            </button>}
            {canManage && <button onClick={() => { onToggle(); setOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors">
              {officer.status === "active"
                ? <><ToggleLeft className="w-3.5 h-3.5 text-muted-foreground" /> Deactivate</>
                : <><ToggleRight className="w-3.5 h-3.5 text-success" /> Activate</>}
            </button>}
            {canManage && <button onClick={() => { onDelete(); setOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>}
            {!canManage && <p className="px-3 py-2 text-xs text-muted-foreground italic">View only</p>}
          </div>
        </>
      )}
    </div>
  );
}
  const OfficerModal = ({ isEdit = false, onClose, form, setForm, handleAdd, handleUpdate, createOfficer, updateOfficer }: {
    isEdit?: boolean;
    onClose: () => void;
    form: any;
    setForm: any;
    handleAdd: () => void;
    handleUpdate: () => void;
    createOfficer: any;
    updateOfficer: any;}) => (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">{isEdit ? "Edit Officer" : "Add Officer"}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <div className="flex gap-2 mt-1">
              {!isEdit && (
                <select value={form.rank} onChange={(e) => setForm(prev => ({ ...prev, rank: e.target.value }))} className="w-24 px-2 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary">
                  {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
              <input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Full name" className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary placeholder:text-muted-foreground" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Role *</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {ROLES.map((r) => (
                <button key={r} onClick={() => setForm(prev =>({...prev , role :r}))} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.role === r ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"}`}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Station *</label>
            <div className="relative mt-1">
              <select value={form.stationName} onChange={(e) => setForm(prev => ({...prev, stationName: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary appearance-none">
                {STATIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="officer@army.in" className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm">Cancel</button>
            <button onClick={isEdit ? handleUpdate : handleAdd} disabled={createOfficer.isPending || updateOfficer.isPending} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {(createOfficer.isPending || updateOfficer.isPending) ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {isEdit ? "Save Changes" : "Add Officer"}
            </button>
          </div>
        </div>
      </div>
    </div>
);

export default memo(function UsersOfficers() {
  const permissions = usePermissions();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOfficer, setEditOfficer] = useState<any>(null);
  const [form, setForm] = useState({ rank: "Maj.", name: "", role: "Station HQ Officer", stationName: STATIONS[0], email: "" });

  const { data, isLoading } = useOfficers({ search, role: roleFilter || undefined });
  const createOfficer = useCreateOfficer();
  const updateOfficer = useUpdateOfficer();
  const toggleStatus = useToggleOfficerStatus();
  const deleteOfficer = useDeleteOfficer();

  const officers = useMemo(() => data?.data || [], [data]);
  const { data: summaryData , isLoading: summaryLoading } = useOfficers({});
  const summary = useMemo(() => summaryData?.summary || { esmOfficers: 0, stationOfficers: 0, recordOffice: 0 }, [summaryData]);
  // const summary = useMemo(() => data?.summary || { esmOfficers: 0, stationOfficers: 0, recordOffice: 0 }, [data]);

  const resetForm = useCallback(() => {
    setForm({ rank: "Maj.", name: "", role: "Station HQ Officer", stationName: STATIONS[0], email: "" });
  }, []);

  const openEdit = useCallback((o: any) => {
    setForm({ rank: "", name: o.name, role: o.role, stationName: o.stationName, email: o.email });
    setEditOfficer(o);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    await createOfficer.mutateAsync({ ...form, name: `${form.rank} ${form.name}`.trim() });
    resetForm(); setAddOpen(false);
  }, [form, createOfficer, resetForm]);

  const handleUpdate = useCallback(async () => {
    if (!editOfficer?._id) return;
    await updateOfficer.mutateAsync({ id: editOfficer._id, ...form });
    setEditOfficer(null); resetForm();
  }, [editOfficer, form, updateOfficer, resetForm]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Officers & Veteran Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">Officers added here can also login as veterans via the ESM portal using their registered phone number.</p>
        </div>
        <button onClick={() => { resetForm(); setAddOpen(true); }} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 self-start sm:self-auto">
          <UserPlus className="w-4 h-4" /> Add Officer
        </button>
      </div>

    {addOpen && <OfficerModal  form={form} 
    setForm={setForm}
    handleAdd={handleAdd}
    handleUpdate={handleUpdate}
    createOfficer={createOfficer}
    updateOfficer={updateOfficer}
    onClose={() => setAddOpen(false)} />}

    {editOfficer && <OfficerModal isEdit
    form={form}
    setForm={setForm}
    handleAdd={handleAdd}
    handleUpdate={handleUpdate}
    createOfficer={createOfficer}
    updateOfficer={updateOfficer}
    onClose={() => {
      setEditOfficer(null);
      resetForm(); }} />}


      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "ESM Officers", count: summary.esmOfficers, icon: Shield },
          { label: "Station HQ Officers", count: summary.stationOfficers, icon: Users },
          { label: "Record Office", count: summary.recordOffice, icon: Users },
        ].map((r) => (
          <div key={r.label} className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <r.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{summaryLoading ? "—" : r.count}</p>
              <p className="text-sm text-muted-foreground">{r.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-foreground">All Officers</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search officers..." className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-36" />
            </div>
          <div className="relative">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-secondary/50 hover:bg-secondary/80 border border-border rounded-lg px-3 py-1.5 pr-9 text-sm text-foreground appearance-none outline-none cursor-pointer  ">       
          <option value="">All Roles</option>
          {ROLES.map((r) => (<option key={r} value={r}>{r}
          </option>))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
          </div>  
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Officer","Role","Station","Active Cases","Status","Actions"].map((h, i) => (
                  <th key={h} className={`text-xs font-medium text-muted-foreground py-3 px-3  ${i === 5 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array(5).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={6} className="py-3 px-3"><div className="h-8 bg-secondary/50 rounded animate-pulse" /></td>
                </tr>
              )) : officers.map((o: any) => (
                <tr key={o._id || o.email} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-primary text-xs font-semibold">{o.name?.split(" ").filter(Boolean).pop()?.[0] ?? "O"}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{o.name}</p>
                        <p className="text-xs text-muted-foreground">{o.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadge[o.role] || ""}`}>{o.role}</span></td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">{o.stationName}</td>
                  <td className="py-3 px-3 text-sm text-foreground font-medium">{o.activeCases ?? o.cases ?? 0}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{o.status}</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <ActionsMenu
                      officer={o}
                      canManage={permissions.manageOfficers}
                      onEdit={() => openEdit(o)}
                      onToggle={() => o._id && toggleStatus.mutate(o._id)}
                      onDelete={() => o._id && deleteOfficer.mutate(o._id)}
                      
                    />
                  </td>
                </tr>
              ))}
              {!isLoading && officers.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No officers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
