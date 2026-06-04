import { useState, memo, useRef, useCallback, useMemo } from "react";
import { usePermissions, getTemplateForOfficerRole, type Permission } from "@/stores/rbac";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Shield, UserPlus, Search, MoreVertical, X, ChevronDown, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useOfficers, useCreateOfficer, useUpdateOfficer, useToggleOfficerStatus, useDeleteOfficer, useStations, useHQs, useStates } from "@/hooks/useApi";

// const ROLES = ["ESM Officer", "Station HQ Officer", "Record Office"] as const;
const ROLES = ["Area Officer", "Headquarter Officer", "Station HQ Officer"] as const;
const OFFICER_LEVELS = ["L1", "L2", "L3"] as const;
const RANKS = ["Lt.","Capt.","Maj.","Lt. Col.","Col.","Brig.","Sub.","Hav.","Nk.","Sep."];

const levelBadge: Record<string, string> = {
  L1: "bg-violet-500/15 text-violet-400",
  L2: "bg-sky-500/15 text-sky-400",
  L3: "bg-amber-500/15 text-amber-500",
};

const PERM_LABELS: Array<{ key: keyof Permission; label: string }> = [
  { key: "viewDashboard", label: "View dashboard" },
  { key: "viewGrievances", label: "View grievances" },
  { key: "createGrievance", label: "Create grievances" },
  { key: "updateGrievanceStatus", label: "Update status" },
  { key: "deleteGrievance", label: "Delete grievances" },
  { key: "escalateGrievance", label: "Escalate cases" },
  { key: "reassignOfficer", label: "Reassign officer" },
  { key: "viewCategories", label: "View categories" },
  { key: "manageCategories", label: "Manage categories" },
  { key: "viewCaseTypes", label: "View case types" },
  { key: "manageCaseTypes", label: "Manage case types" },
  { key: "viewStations", label: "View stations" },
  { key: "manageStations", label: "Manage stations" },
  { key: "viewQRCodes", label: "View QR codes" },
  { key: "manageQRCodes", label: "Manage QR codes" },
  { key: "viewOfficers", label: "View officers" },
  { key: "manageOfficers", label: "Manage officers" },
  { key: "viewEscalations", label: "View escalations" },
  { key: "resolveEscalations", label: "Resolve escalations" },
  { key: "viewReports", label: "View reports" },
  { key: "exportReports", label: "Export reports" },
  { key: "viewSettings", label: "View settings" },
  { key: "manageSettings", label: "Manage settings" },
  { key: "manageRoles", label: "Manage roles" },
  { key: "loginAsVeteran", label: "Veteran portal login" },
];

// const roleBadge: Record<string, string> = {
//   "ESM Officer":       "bg-primary/15 text-primary",
//   "Station HQ Officer":"bg-info/15 text-info",
//   "Record Office":     "bg-warning/15 text-warning",
// };

const roleBadge: Record<string, string> = {
  "Area Officer":        "bg-primary/15 text-primary",
  "Headquarter Officer": "bg-info/15 text-info",
  "Station HQ Officer":  "bg-warning/15 text-warning",
};

// ─── Actions Menu ─────────────────────────────────────────────────────────────
function ActionsMenu({ officer, onEdit, onToggle, onDelete, canManage }: {
  officer: any; onEdit: () => void; onToggle: () => void;
  onDelete: () => void; canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setOpenUpward(window.innerHeight - rect.bottom < 300);
    }
    setOpen((o) => !o);
  };

  return (
    <div className="relative">
      <button ref={buttonRef} onClick={handleToggle} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 z-20 bg-card border border-border rounded-xl shadow-xl py-1 w-44 ${openUpward ?  "bottom-full mb-1" : "top-full mt-1"}`}>
            {canManage ? (
              <>
                <button onClick={() => { onEdit(); setOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors">
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" /> Edit Officer
                </button>
                <button onClick={() => { onToggle(); setOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors">
                  {officer.status === "active"
                    ? <><ToggleLeft  className="w-3.5 h-3.5 text-muted-foreground" /> Deactivate</>
                    : <><ToggleRight className="w-3.5 h-3.5 text-success" />          Activate</>
                  }
                </button>
                <button onClick={() => { onDelete(); setOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            ) : (
              <p className="px-3 py-2 text-xs text-muted-foreground italic">View only</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Officer Modal ────────────────────────────────────────────────────────────
const OfficerModal = ({
  isEdit = false, onClose, form, setForm,
  handleAdd, handleUpdate, createOfficer, updateOfficer,
  statesData, hqData, stations,
}: {
  isEdit?: boolean;
  onClose: () => void;
  form: any;
  setForm: any;
  handleAdd: () => void;
  handleUpdate: () => void;
  createOfficer: any;
  updateOfficer: any;
  statesData: any[];
  hqData: any[];
  stations: any[];
}) => {
  const isPending = createOfficer.isPending || updateOfficer.isPending;

  // ── Dropdown options + label based on selected ROLE ──────────────────
  const { dropdownOptions, dropdownLabel } = useMemo(() => {
    if (form.role === "Area Officer") {
      return {
        dropdownOptions: statesData.map((s: any) => ({ _id: s._id, name: s.name })),
        dropdownLabel:   "Area / State *",
      };
    }
    if (form.role === "Headquarter Officer") {
      return {
        dropdownOptions: hqData.map((h: any) => ({ _id: h._id, name: h.name })),
        dropdownLabel:   "Headquarters *",
      };
    }
    // Station HQ Officer (default)
    return {
      dropdownOptions: stations.map((s: any) => ({ _id: s._id, name: s.name })),
      dropdownLabel:   "Station HQ *",
    };
  }, [form.role, statesData, hqData, stations]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit Officer" : "Add Officer"}
          </h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">

          {/* Name + Rank */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <div className="flex gap-2 mt-1">
              {!isEdit && (
                <select
                  value={form.rank}
                  onChange={(e) => setForm((p: any) => ({ ...p, rank: e.target.value }))}
                  className="w-24 px-2 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
                >
                  {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
              <input
                value={form.name}
                onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
                className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Level — L1 / L2 / L3 (Area, HQ, Station HQ officers) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Level *</label>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-1.5">
              Escalation tier for Area, Headquarter, or Station HQ officers
            </p>
            <div className="flex gap-2 flex-wrap">
              {OFFICER_LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setForm((p: any) => ({ ...p, level: lv }))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${form.level === lv
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>

          {/* Role — select first so dropdown changes accordingly */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Role *</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setForm((p: any) => ({
                    ...p,
                    role:        r,
                    stationName: "",
                    stationId:   "",
                    permissions: { ...getTemplateForOfficerRole(r) },
                  }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${form.role === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic dropdown — changes based on role */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {dropdownLabel}
            </label>
            <div className="relative mt-1">
              <select
                value={form.stationName}
                onChange={(e) => {
                  const selected = dropdownOptions.find((o: any) => o.name === e.target.value);
                  setForm((p: any) => ({
                    ...p,
                    stationName: e.target.value,
                    stationId:   selected?._id || "",
                  }));
                }}
                className="w-full px-3 py-2 pr-10 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary appearance-none"
              >
                <option value="">
                  {dropdownOptions.length === 0
                    ? "No options available"
                    : `Select ${form.role === "Area Officer" ? "Area" : form.role === "Headquarter Officer" ? "HQ" : "Station"}`
                  }
                </option>
                {dropdownOptions.map((opt: any) => (
                  <option key={opt._id} value={opt.name}>{opt.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p: any) => ({ ...p, email: e.target.value }))}
              placeholder="officer@army.in"
              className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          {/* Permissions */}
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Officer Permissions
            </p>
            <p className="text-[11px] text-muted-foreground mb-3">
              Defaults from role template. Toggle per officer as needed.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {PERM_LABELS.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between gap-2 text-xs py-1">
                  <span className="text-foreground">{label}</span>
                  <button
                    type="button"
                    onClick={() => setForm((p: any) => ({
                      ...p,
                      permissions: { ...p.permissions, [key]: !p.permissions?.[key] },
                    }))}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.permissions?.[key] ? "bg-primary" : "bg-secondary border border-border"}`}
                  >
                    <span className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-all ${form.permissions?.[key] ? "right-0.5" : "left-0.5"}`} />
                  </button>
                </label>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm">
              Cancel
            </button>
            <button
              onClick={isEdit ? handleUpdate : handleAdd}
              disabled={isPending || !form.name.trim() || !form.email.trim() || !form.stationName || !form.level}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isPending
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <UserPlus className="w-4 h-4" />
              }
              {isEdit ? "Save Changes" : "Add Officer"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default memo(function UsersOfficers() {
  const permissions  = usePermissions();
  const { user: currentUser } = useAuth();

  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState("");
  const [addOpen,     setAddOpen]     = useState(false);
  const [editOfficer, setEditOfficer] = useState<any>(null);

  const [form, setForm] = useState({
    rank:        "Maj.",
    name:        "",
    assignType:  "station",
    role:        "Station HQ Officer",
    level:       "" as "" | (typeof OFFICER_LEVELS)[number],
    stationName: "",
    stationId:   "",
    email:       "",
    permissions: getTemplateForOfficerRole("Station HQ Officer") as Permission,
  });

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data,  isLoading }      = useOfficers({ search, role: roleFilter || undefined });
  const { data: summaryData, isLoading: summaryLoading } = useOfficers({});
  const { data: statesData  = [] }      = useStates();
  const { data: hqData      = [] }      = useHQs();
  const { data: stationsRes }           = useStations({ limit: 100 });

  const createOfficer = useCreateOfficer();
  const updateOfficer = useUpdateOfficer();
  const toggleStatus  = useToggleOfficerStatus();
  const deleteOfficer = useDeleteOfficer();

  const officers     = useMemo(() => data?.data        || [], [data]);
  const stationsList = useMemo(() => stationsRes?.data || [], [stationsRes]);
  const summary      = useMemo(() => summaryData?.summary || {
    esmOfficers: 0, stationOfficers: 0, recordOffice: 0,
  }, [summaryData]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setForm({
      rank: "Maj.", name: "", assignType: "station",
      role: "Station HQ Officer", level: "", stationName: "", stationId: "", email: "",
      permissions: getTemplateForOfficerRole("Station HQ Officer"),
    });
  }, []);

  const openEdit = useCallback((o: any) => {
    const template = getTemplateForOfficerRole(o.role);
    setForm({
      rank: "", name: o.name, assignType: "station",
      role: o.role, level: o.level || "",
      stationName: o.stationName,
      stationId: "", email: o.email,
      permissions: { ...template, ...(o.permissions ?? {}) },
    });
    setEditOfficer(o);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!form.name.trim() || !form.email.trim() || !form.level) return;
    const confirmed = window.confirm(`Add officer "${form.rank} ${form.name}" to ${form.stationName}?`);
    if (!confirmed) return;
    await createOfficer.mutateAsync({
      ...form,
      name: `${form.rank} ${form.name}`.trim(),
      permissions: form.permissions,
    });
    resetForm();
    setAddOpen(false);
  }, [form, createOfficer, resetForm]);

  const handleUpdate = useCallback(async () => {
    if (!editOfficer?._id || !form.level) return;
    const confirmed = window.confirm(`Save changes to "${form.name}"?`);
    if (!confirmed) return;
    await updateOfficer.mutateAsync({
      id: editOfficer._id,
      name: form.name,
      role: form.role,
      level: form.level || undefined,
      stationName: form.stationName,
      email: form.email,
      permissions: form.permissions,
    });
    setEditOfficer(null);
    resetForm();
  }, [editOfficer, form, updateOfficer, resetForm]);

  const handleToggle = useCallback((o: any) => {
    const action = o.status === "active" ? "deactivate" : "activate";
    const confirmed = window.confirm(`Are you sure you want to ${action} "${o.name}"?`);
    if (confirmed) toggleStatus.mutate(o._id);
  }, [toggleStatus]);

  const handleDelete = useCallback((o: any) => {
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete "${o.name}"?\n\nThis action cannot be undone.`
    );
    if (confirmed) deleteOfficer.mutate(o._id);
  }, [deleteOfficer]);

  // Shared modal props
  const modalProps = {
    form, setForm, handleAdd, handleUpdate,
    createOfficer, updateOfficer,
    statesData, hqData, stations: stationsList,
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Officers & Veteran Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage officers across all station headquarters.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setAddOpen(true); }}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Add Officer
        </button>
      </div>

      {/* Modals */}
      {addOpen && (
        <OfficerModal
          {...modalProps}
          onClose={() => { setAddOpen(false); resetForm(); }}
        />
      )}
      {editOfficer && (
        <OfficerModal
          isEdit
          {...modalProps}
          onClose={() => { setEditOfficer(null); resetForm(); }}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          // { label: "ESM Officers",        count: summary.esmOfficers,    icon: Shield },
          // { label: "Station HQ Officers", count: summary.stationOfficers, icon: Users  },
          // { label: "Record Office",       count: summary.recordOffice,   icon: Users  },
          { label: "Area Officers",        count: summary.esmOfficers,    icon: Shield },
          { label: "Headquarter Officers", count: summary.stationOfficers, icon: Users  },
          { label: "Station HQ Officers",  count: summary.recordOffice,   icon: Users  },
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
          <h3 className="font-bold text-foreground">All Officers</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">

            {/* Search */}
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search officers..."
                className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-36"
              />
            </div>

            {/* Role filter */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-secondary/50 hover:bg-secondary/80 border border-border rounded-lg px-3 py-1.5 pr-9 text-sm text-foreground appearance-none outline-none cursor-pointer"
              >
                <option value="">All Roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
            </div>

          </div>
        </div>

        <div className="overflow-visible ">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Officer","Role","Level","Station","Active Cases","Status","Actions"].map((h, i) => (
                  <th key={h} className={`text-xs font-medium text-muted-foreground py-3 px-3 ${i === 6 ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={7} className="py-3 px-3">
                      <div className="h-8 bg-secondary/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : officers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No officers found.
                  </td>
                </tr>
              ) : officers.map((o: any) => (
                <tr key={o._id || o.email} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">

                  {/* Officer info */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-primary text-xs font-semibold">
                          {o.name?.split(" ").filter(Boolean).pop()?.[0] ?? "O"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{o.name}</p>
                        <p className="text-xs text-muted-foreground">{o.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3 px-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadge[o.role] || ""}`}>
                      {o.role}
                    </span>
                  </td>

                  {/* Level */}
                  <td className="py-3 px-2">
                    {o.level ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${levelBadge[o.level] || "bg-secondary text-muted-foreground"}`}>
                        {o.level}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Station */}
                  <td className="py-3 px-3 text-sm text-muted-foreground">{o.stationName}</td>

                  {/* Active cases */}
                  <td className="py-3 px-7 text-sm text-foreground font-medium">
                    {o.activeCases ?? 0}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${o.status === "active"
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <ActionsMenu
                      officer={o}
                      canManage={permissions.manageOfficers}
                      onEdit={() => openEdit(o)}
                      onToggle={() => handleToggle(o)}
                      onDelete={() => handleDelete(o)}
                    />
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
});