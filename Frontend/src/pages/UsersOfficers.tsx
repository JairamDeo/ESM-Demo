import { useState, memo, useRef, useCallback, useMemo } from "react";
import { usePermissions } from "@/stores/rbac";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCreatableRoles,
  HIERARCHY_LABEL,
  type OfficerJobRole,
} from "@/lib/officerHierarchy";
import { Link } from "react-router-dom";
import { Users, Shield, UserPlus, Search, MoreVertical, X, ChevronDown, Edit2, Trash2, ToggleLeft, ToggleRight, Network } from "lucide-react";
import { useOfficers, useCreateOfficer, useUpdateOfficer, useToggleOfficerStatus, useDeleteOfficer, useStations, useHQs, useStates } from "@/hooks/useApi";

const ALL_ROLES: OfficerJobRole[] = [
  "Super Admin", "Area Officer", "Headquarter Officer", "Station HQ Officer",
];
const OFFICER_LEVELS = ["L1", "L2", "L3"] as const;
const RANKS = ["Lt.","Capt.","Maj.","Lt. Col.","Col.","Brig.","Sub.","Hav.","Nk.","Sep."];

const levelBadge: Record<string, string> = {
  L1: "bg-violet-500/15 text-violet-400",
  L2: "bg-sky-500/15 text-sky-400",
  L3: "bg-amber-500/15 text-amber-500",
};

const roleBadge: Record<string, string> = {
  "Super Admin":         "bg-destructive/15 text-destructive",
  "Area Officer":        "bg-primary/15 text-primary",
  "Headquarter Officer": "bg-info/15 text-info",
  "Station HQ Officer":  "bg-warning/15 text-warning",
};

function assignmentLabel(o: any): string {
  if (o.assignmentLabel) return o.assignmentLabel;
  if (o.role === "Area Officer") return o.stateName || "—";
  if (o.role === "Headquarter Officer") return o.hqName || "—";
  if (o.role === "Station HQ Officer") {
    return [o.stationName, o.hqName].filter(Boolean).join(" · ") || "—";
  }
  if (o.role === "Super Admin") return "All areas";
  return o.stationName || "—";
}

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

const OfficerModal = ({
  isEdit = false, onClose, form, setForm,
  handleAdd, handleUpdate, createOfficer, updateOfficer,
  statesData, hqData, stations, creatableRoles, isSuperAdmin,
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
  creatableRoles: OfficerJobRole[];
  isSuperAdmin: boolean;
}) => {
  const isPending = createOfficer.isPending || updateOfficer.isPending;
  const roleOptions = isEdit ? ALL_ROLES : creatableRoles;

  const filteredHqs = useMemo(() => {
    if (form.filterStateId) {
      return hqData.filter((h: any) => String(h.stateId) === String(form.filterStateId));
    }
    return hqData;
  }, [hqData, form.filterStateId]);

  const { dropdownOptions, dropdownLabel, assignField, needsAssignment } = useMemo(() => {
    if (form.role === "Super Admin") {
      return { dropdownOptions: [], dropdownLabel: "", assignField: "" as const, needsAssignment: false };
    }
    if (form.role === "Area Officer") {
      return {
        dropdownOptions: statesData.map((s: any) => ({ _id: s._id, name: s.name })),
        dropdownLabel: "Area *",
        assignField: "stateId" as const,
        needsAssignment: true,
      };
    }
    if (form.role === "Headquarter Officer") {
      return {
        dropdownOptions: filteredHqs.map((h: any) => ({ _id: h._id, name: h.name, sub: h.stateName })),
        dropdownLabel: "Headquarters *",
        assignField: "hqId" as const,
        needsAssignment: true,
      };
    }
    return {
      dropdownOptions: stations.map((s: any) => ({ _id: s._id, name: s.name, sub: s.hqName })),
      dropdownLabel: "Station HQ *",
      assignField: "stationId" as const,
      needsAssignment: true,
    };
  }, [form.role, statesData, filteredHqs, stations]);

  const assignValue = form[assignField] || "";
  const assignName = form.assignName || "";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit Officer" : "Add Officer"}
          </h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
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

          {form.role !== "Super Admin" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Level *</label>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-1.5">
              Escalation tier (L1 / L2 / L3). Multiple officers per level allowed.
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
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Role *</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {roleOptions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((p: any) => ({
                    ...p,
                    role: r,
                    stateId: "",
                    hqId: "",
                    stationId: "",
                    assignName: "",
                    filterStateId: "",
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

          {isSuperAdmin && form.role === "Headquarter Officer" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Filter by Area (optional)</label>
              <select
                value={form.filterStateId || ""}
                onChange={(e) => {
                  const st = statesData.find((s: any) => s._id === e.target.value);
                  setForm((p: any) => ({
                    ...p,
                    filterStateId: e.target.value,
                    hqId: "",
                    assignName: "",
                  }));
                }}
                className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
              >
                <option value="">All areas</option>
                {statesData.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {needsAssignment && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">{dropdownLabel}</label>
            <div className="relative mt-1">
              <select
                value={assignName}
                onChange={(e) => {
                  const selected = dropdownOptions.find((o: any) => o.name === e.target.value);
                  setForm((p: any) => ({
                    ...p,
                    assignName: e.target.value,
                    stateId: assignField === "stateId" ? (selected?._id || "") : p.stateId,
                    hqId: assignField === "hqId" ? (selected?._id || "") : p.hqId,
                    stationId: assignField === "stationId" ? (selected?._id || "") : p.stationId,
                  }));
                }}
                className="w-full px-3 py-2 pr-10 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary appearance-none"
              >
                <option value="">
                  {dropdownOptions.length === 0 ? "No options available" : "Select…"}
                </option>
                {dropdownOptions.map((opt: any) => (
                  <option key={opt._id} value={opt.name}>
                    {opt.sub ? `${opt.name} (${opt.sub})` : opt.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
            </div>
          </div>
          )}

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

          {!isEdit && (
            <div className="border border-border rounded-lg p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.canLogin}
                  onChange={(e) => setForm((p: any) => ({ ...p, canLogin: e.target.checked }))}
                  className="rounded border-border"
                />
                Allow admin portal login
              </label>
              {form.canLogin && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Username *</label>
                    <input
                      value={form.username}
                      onChange={(e) => setForm((p: any) => ({ ...p, username: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Password *</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((p: any) => ({ ...p, password: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm">
              Cancel
            </button>
            <button
              onClick={isEdit ? handleUpdate : handleAdd}
              disabled={
                isPending || !form.name.trim() || !form.email.trim()
                || (form.role !== "Super Admin" && !form.level)
                || (needsAssignment && !assignValue)
              }
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

export default memo(function UsersOfficers() {
  const permissions = usePermissions();
  const { user } = useAuth();
  const creatableRoles = useMemo(() => getCreatableRoles(user?.role), [user?.role]);
  const isSuperAdmin = user?.role === "super_admin";
  const canAddOfficer = creatableRoles.length > 0 && (permissions.manageOfficers || isSuperAdmin);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOfficer, setEditOfficer] = useState<any>(null);

  const [form, setForm] = useState({
    rank: "Maj.",
    name: "",
    role: "Station HQ Officer" as OfficerJobRole,
    filterStateId: "",
    level: "" as "" | (typeof OFFICER_LEVELS)[number],
    stateId: "",
    hqId: "",
    stationId: "",
    assignName: "",
    email: "",
    canLogin: false,
    username: "",
    password: "",
  });

  const { data, isLoading } = useOfficers({ search, role: roleFilter || undefined });
  const { data: summaryData, isLoading: summaryLoading } = useOfficers({});
  const { data: statesData = [] } = useStates();
  const { data: hqData = [] } = useHQs();
  const { data: stationsRes } = useStations({ limit: 100 });

  const createOfficer = useCreateOfficer();
  const updateOfficer = useUpdateOfficer();
  const toggleStatus = useToggleOfficerStatus();
  const deleteOfficer = useDeleteOfficer();

  const officers = useMemo(() => data?.data || [], [data]);
  const stationsList = useMemo(() => stationsRes?.data || [], [stationsRes]);
  const summary = useMemo(() => summaryData?.summary || {
    esmOfficers: 0, stationOfficers: 0, recordOffice: 0,
  }, [summaryData]);

  const defaultRole = creatableRoles[creatableRoles.length - 1] || "Station HQ Officer";

  const resetForm = useCallback(() => {
    setForm({
      rank: "Maj.", name: "", role: defaultRole, level: "",
      stateId: "", hqId: "", stationId: "", assignName: "", filterStateId: "",
      email: "", canLogin: false, username: "", password: "",
    });
  }, [defaultRole]);

  const openEdit = useCallback((o: any) => {
    let assignName = o.stationName || "";
    if (o.role === "Area Officer") assignName = o.stateName || "";
    if (o.role === "Headquarter Officer") assignName = o.hqName || "";
    setForm({
      rank: "",
      name: o.name,
      role: o.role,
      level: o.level || "",
      stateId: o.stateId || "",
      hqId: o.hqId || "",
      stationId: o.station?._id || o.station || "",
      assignName,
      email: o.email,
      canLogin: false,
      username: "",
      password: "",
    });
    setEditOfficer(o);
  }, []);

  const buildPayload = useCallback(() => ({
    name: form.name.includes(form.rank) ? form.name.trim() : `${form.rank} ${form.name}`.trim(),
    role: form.role,
    level: form.level,
    email: form.email,
    stateId: form.stateId || undefined,
    hqId: form.hqId || undefined,
    stationId: form.stationId || undefined,
    canLogin: form.canLogin,
    username: form.canLogin ? form.username : undefined,
    password: form.canLogin ? form.password : undefined,
  }), [form]);

  const handleAdd = useCallback(async () => {
    if (!form.name.trim() || !form.email.trim() || !form.level) return;
    const label = form.assignName || "assignment";
    const confirmed = window.confirm(`Add officer "${form.rank} ${form.name}" (${form.role}) — ${label}?`);
    if (!confirmed) return;
    await createOfficer.mutateAsync(buildPayload());
    resetForm();
    setAddOpen(false);
  }, [form, createOfficer, resetForm, buildPayload]);

  const handleUpdate = useCallback(async () => {
    if (!editOfficer?._id || !form.level) return;
    const confirmed = window.confirm(`Save changes to "${form.name}"?`);
    if (!confirmed) return;
    await updateOfficer.mutateAsync({
      id: editOfficer._id,
      name: form.name,
      role: form.role,
      level: form.level,
      email: form.email,
      stateId: form.stateId || undefined,
      hqId: form.hqId || undefined,
      stationId: form.stationId || undefined,
    });
    setEditOfficer(null);
    resetForm();
  }, [editOfficer, form, updateOfficer, resetForm]);

  const handleToggle = useCallback((o: any) => {
    const action = o.status === "active" ? "deactivate" : "activate";
    if (window.confirm(`Are you sure you want to ${action} "${o.name}"?`)) {
      toggleStatus.mutate(o._id);
    }
  }, [toggleStatus]);

  const handleDelete = useCallback((o: any) => {
    if (window.confirm(`Delete "${o.name}"? This cannot be undone.`)) {
      deleteOfficer.mutate(o._id);
    }
  }, [deleteOfficer]);

  const modalProps = {
    form, setForm, handleAdd, handleUpdate,
    createOfficer, updateOfficer,
    statesData, hqData, stations: stationsList,
    creatableRoles, isSuperAdmin,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Officers & Veteran Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">{HIERARCHY_LABEL}</p>
          <Link
            to="/organization"
            className="inline-flex items-center gap-1.5 text-xs text-primary mt-2 hover:underline"
          >
            <Network className="w-3.5 h-3.5" />
            Setup areas, HQs & stations first → Organization
          </Link>
        </div>
        {canAddOfficer && (
        <button
          onClick={() => { resetForm(); setAddOpen(true); }}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Add Officer
        </button>
        )}
      </div>

      {addOpen && <OfficerModal {...modalProps} onClose={() => { setAddOpen(false); resetForm(); }} />}
      {editOfficer && <OfficerModal isEdit {...modalProps} onClose={() => { setEditOfficer(null); resetForm(); }} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Area Officers", count: summary.esmOfficers, icon: Shield },
          { label: "Headquarter Officers", count: summary.stationOfficers, icon: Users },
          { label: "Station HQ Officers", count: summary.recordOffice, icon: Users },
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

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-foreground">All Officers</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search officers..."
                className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-36"
              />
            </div>
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-secondary/50 hover:bg-secondary/80 border border-border rounded-lg px-3 py-1.5 pr-9 text-sm text-foreground appearance-none outline-none cursor-pointer"
              >
                <option value="">All Roles</option>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-visible">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Officer","Role","Level","Assignment","Created By","Active Cases","Status","Actions"].map((h, i) => (
                  <th key={h} className={`text-xs font-medium text-muted-foreground py-3 px-3 ${i === 7 ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={8} className="py-3 px-3">
                      <div className="h-8 bg-secondary/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : officers.length === 0 ? (
                <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No officers found.
                  </td>
                </tr>
              ) : officers.map((o: any) => (
                <tr key={o._id || o.email} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-primary text-xs font-semibold">
                          {o.name?.split(" ").filter(Boolean).pop()?.[0] ?? "O"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {o.name}
                          {o.canLogin && (
                            <span className="ml-1.5 text-[10px] text-primary font-normal">(portal)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{o.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadge[o.role] || ""}`}>
                      {o.role}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    {o.level ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${levelBadge[o.level] || ""}`}>
                        {o.level}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">{assignmentLabel(o)}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">
                    {o.createdBy?.name ? (
                      <span title={o.createdBy.role}>{o.createdBy.name}</span>
                    ) : "—"}
                  </td>
                  <td className="py-3 px-7 text-sm text-foreground font-medium">{o.activeCases ?? 0}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${o.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {o.status}
                    </span>
                  </td>
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
