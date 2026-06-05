import { memo, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Map, Building, Building2, Users, Plus, ChevronRight, X, UserPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/stores/rbac";
import { HIERARCHY_LABEL } from "@/lib/officerHierarchy";
import {
  useStates, useHQs, useStations,
  useCreateState, useCreateHQ, useCreateStation,
} from "@/hooks/useApi";

const STEPS = [
  { n: 1, label: "Area", icon: Map },
  { n: 2, label: "Headquarters", icon: Building },
  { n: 3, label: "Station HQ", icon: Building2 },
  { n: 4, label: "Officers", icon: Users },
] as const;

export default memo(function Organization() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const isSuperAdmin = user?.role === "super_admin";
  const isArea = user?.role === "area";
  const isHQ = user?.role === "headquarter";

  const canManageOrg = permissions.manageStations || isSuperAdmin;
  const canCreateArea = isSuperAdmin;
  const canCreateHQ = canManageOrg && (isSuperAdmin || isArea);
  const canCreateStation = canManageOrg && (isSuperAdmin || isArea || isHQ);

  const { data: states = [] } = useStates();
  const { data: hqs = [] } = useHQs();
  const { data: stationsRes } = useStations({ limit: 100 });
  const stations = stationsRes?.data || [];

  const createState = useCreateState();
  const createHQ = useCreateHQ();
  const createStation = useCreateStation();

  const [areaOpen, setAreaOpen] = useState(false);
  const [hqOpen, setHqOpen] = useState(false);
  const [stationOpen, setStationOpen] = useState(false);

  const [areaForm, setAreaForm] = useState({ name: "", code: "" });
  const [hqForm, setHqForm] = useState({ name: "", city: "", stateId: "", address: "" });
  const [stationForm, setStationForm] = useState({
    city: "", stateId: "", stateName: "", hqId: "", hqName: "", address: "",
  });

  const filteredHqsForStation = useMemo(() => {
    if (!stationForm.stateId) return hqs;
    return hqs.filter((h: any) => String(h.stateId) === String(stationForm.stateId));
  }, [hqs, stationForm.stateId]);

  const handleCreateArea = useCallback(async () => {
    if (!areaForm.name.trim() || !areaForm.code.trim()) return;
    await createState.mutateAsync({
      name: areaForm.name.trim(),
      code: areaForm.code.trim().toUpperCase(),
    });
    setAreaForm({ name: "", code: "" });
    setAreaOpen(false);
  }, [areaForm, createState]);

  const handleCreateHQ = useCallback(async () => {
    if (!hqForm.name.trim() || !hqForm.city.trim()) return;
    await createHQ.mutateAsync({
      name: hqForm.name.trim(),
      city: hqForm.city.trim(),
      stateId: isArea ? user?.stateId : hqForm.stateId || undefined,
      address: hqForm.address || undefined,
    });
    setHqForm({ name: "", city: "", stateId: "", address: "" });
    setHqOpen(false);
  }, [hqForm, createHQ, isArea, user?.stateId]);

  const handleCreateStation = useCallback(async () => {
    if (!stationForm.city.trim() || !stationForm.stateName || !stationForm.hqId) return;
    const name = `${stationForm.city.trim()} Station HQ`;
    await createStation.mutateAsync({
      name,
      city: stationForm.city.trim(),
      state: stationForm.stateName,
      hqId: stationForm.hqId,
      hqName: stationForm.hqName,
      address: stationForm.address,
    });
    setStationForm({ city: "", stateId: "", stateName: "", hqId: "", hqName: "", address: "" });
    setStationOpen(false);
  }, [stationForm, createStation]);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organization Setup</h1>
        <p className="text-muted-foreground text-sm mt-1">{HIERARCHY_LABEL}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Create structure top-down, then assign officers at each level in{" "}
          <Link to="/users" className="text-primary underline">Officers</Link>.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-1 text-xs">
        {STEPS.map((s, i) => (
          <span key={s.n} className="flex items-center gap-1">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
              <s.icon className="w-3.5 h-3.5" /> {s.n}. {s.label}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </span>
        ))}
      </div>

      {/* ── Step 1: Areas ─────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Map className="w-5 h-5 text-primary" /> 1. Areas
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Vitric Super Admin creates areas (e.g. Maharashtra, Gujarat). Multiple areas allowed.
            </p>
          </div>
          {canCreateArea && (
            <button
              onClick={() => setAreaOpen(true)}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Area
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {states.length === 0 ? (
            <p className="text-sm text-muted-foreground">No areas yet. Super Admin can add one above.</p>
          ) : states.map((s: any) => (
            <span key={s._id} className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground border border-border">
              {s.name} <span className="text-muted-foreground">({s.code})</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── Step 2: Headquarters ────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Building className="w-5 h-5 text-info" /> 2. Headquarters
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Under each area, add one or more HQs. Area Officer can create HQs in their area.
            </p>
          </div>
          {canCreateHQ && (
            <button
              onClick={() => {
                setHqForm((f) => ({
                  ...f,
                  stateId: isArea ? (user?.stateId || "") : f.stateId,
                }));
                setHqOpen(true);
              }}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add HQ
            </button>
          )}
        </div>
        <div className="space-y-2">
          {hqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No headquarters yet. Create an area first, then add HQs.</p>
          ) : hqs.map((h: any) => (
            <div key={h._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 text-sm">
              <span className="font-medium text-foreground">{h.name}</span>
              <span className="text-xs text-muted-foreground">
                {h.city} · Area: {h.stateName || h.state || "—"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Step 3: Station HQs ───────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-warning" /> 3. Station HQs
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Under each HQ, add station headquarters. HQ Officer can add stations for their HQ only.
            </p>
          </div>
          {canCreateStation && (
            <button
              onClick={() => {
                if (isHQ && user?.hqId) {
                  setStationForm({
                    city: "", address: "",
                    stateId: user.stateId || "",
                    stateName: user.stateName || "",
                    hqId: user.hqId,
                    hqName: user.hqName || "",
                  });
                }
                setStationOpen(true);
              }}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Station HQ
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {stations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No station HQs yet. Create HQ first, then add stations.</p>
          ) : stations.slice(0, 12).map((s: any) => (
            <div key={s._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 text-sm">
              <span className="font-medium text-foreground">{s.name}</span>
              <span className="text-xs text-muted-foreground">
                HQ: {s.hqName || "—"} · {s.stateName || "—"}
              </span>
            </div>
          ))}
          {stations.length > 12 && (
            <Link to="/stations" className="text-xs text-primary underline block pt-1">
              View all {stations.length} stations →
            </Link>
          )}
        </div>
      </section>

      {/* ── Step 4: Officers ──────────────────────────────────────────── */}
      <section className="bg-card border border-primary/30 rounded-xl p-5">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> 4. Assign Officers
        </h2>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          After structure exists, assign officers (L1/L2/L3) and map each to their area, HQ, or station.
          Permissions come from Settings → RBAC by role.
        </p>
        <ul className="text-xs text-muted-foreground space-y-1 mb-4 list-disc list-inside">
          <li><strong className="text-foreground">Super Admin</strong> → create Area, HQ, Station HQ officers</li>
          <li><strong className="text-foreground">Area Officer</strong> → create HQ & Station HQ officers in their area</li>
          <li><strong className="text-foreground">HQ Officer</strong> → create Station HQ officers under their HQ</li>
        </ul>
        <Link
          to="/users"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <UserPlus className="w-4 h-4" /> Go to Officers
        </Link>
      </section>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {areaOpen && (
        <Modal title="Add Area" onClose={() => setAreaOpen(false)}>
          <Field label="Area name *" value={areaForm.name} onChange={(v) => setAreaForm({ ...areaForm, name: v })} placeholder="Maharashtra" />
          <Field label="Code *" value={areaForm.code} onChange={(v) => setAreaForm({ ...areaForm, code: v })} placeholder="MH" />
          <Submit onClick={handleCreateArea} loading={createState.isPending} disabled={!areaForm.name || !areaForm.code} label="Create Area" />
        </Modal>
      )}

      {hqOpen && (
        <Modal title="Add Headquarters" onClose={() => setHqOpen(false)}>
          {isSuperAdmin && (
            <SelectField
              label="Area *"
              value={hqForm.stateId}
              onChange={(v) => setHqForm({ ...hqForm, stateId: v })}
              options={states.map((s: any) => ({ value: s._id, label: s.name }))}
            />
          )}
          {isArea && user?.stateName && (
            <p className="text-xs text-muted-foreground mb-2">Area: <span className="text-foreground">{user.stateName}</span></p>
          )}
          <Field label="HQ name *" value={hqForm.name} onChange={(v) => setHqForm({ ...hqForm, name: v })} placeholder="Kamptee Sub-Area HQ" />
          <Field label="City *" value={hqForm.city} onChange={(v) => setHqForm({ ...hqForm, city: v })} placeholder="Kamptee" />
          <Field label="Address" value={hqForm.address} onChange={(v) => setHqForm({ ...hqForm, address: v })} placeholder="Optional" />
          <Submit
            onClick={handleCreateHQ}
            loading={createHQ.isPending}
            disabled={!hqForm.name || !hqForm.city || (isSuperAdmin && !hqForm.stateId)}
            label="Create HQ"
          />
        </Modal>
      )}

      {stationOpen && (
        <Modal title="Add Station HQ" onClose={() => setStationOpen(false)}>
          {isHQ && user?.hqName ? (
            <p className="text-xs text-muted-foreground">
              HQ: <span className="text-foreground">{user.hqName}</span>
              {user.stateName && <> · Area: <span className="text-foreground">{user.stateName}</span></>}
            </p>
          ) : (
            <>
              <SelectField
                label="Area *"
                value={stationForm.stateId}
                onChange={(v) => {
                  const st = states.find((s: any) => s._id === v);
                  setStationForm({
                    ...stationForm,
                    stateId: v,
                    stateName: st?.name || "",
                    hqId: "",
                    hqName: "",
                  });
                }}
                options={states.map((s: any) => ({ value: s._id, label: s.name }))}
              />
              <SelectField
                label="Headquarters *"
                value={stationForm.hqId}
                onChange={(v) => {
                  const h = hqs.find((x: any) => x._id === v);
                  setStationForm({ ...stationForm, hqId: v, hqName: h?.name || "" });
                }}
                options={filteredHqsForStation.map((h: any) => ({ value: h._id, label: h.name }))}
                disabled={!stationForm.stateId && isSuperAdmin}
              />
            </>
          )}
          <Field label="City *" value={stationForm.city} onChange={(v) => setStationForm({ ...stationForm, city: v })} placeholder="Nagpur" />
          {stationForm.city && (
            <p className="text-xs text-muted-foreground -mt-2">Name: {stationForm.city} Station HQ</p>
          )}
          <Submit
            onClick={handleCreateStation}
            loading={createStation.isPending}
            disabled={!stationForm.city || !stationForm.hqId || !stationForm.stateName}
            label="Create Station HQ"
          />
        </Modal>
      )}
    </div>
  );
});

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary disabled:opacity-50"
      >
        <option value="">Select…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Submit({ onClick, loading, disabled, label }: {
  onClick: () => void; loading: boolean; disabled: boolean; label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full mt-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
      {label}
    </button>
  );
}
