import { memo, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Map as MapIcon,
  Building,
  Building2,
  Users,
  Plus,
  ChevronRight,
  ChevronDown,
  X,
  UserPlus,
  Search,
  ArrowUpDown,
  Filter,
  Layers,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/stores/rbac";
import { HIERARCHY_LABEL } from "@/lib/officerHierarchy";
import {
  useStates,
  useHQs,
  useStations,
  useCreateState,
  useCreateHQ,
  useCreateStation,
} from "@/hooks/useApi";

const STEPS = [
  { n: 1, label: "Area", icon: MapIcon, color: "text-primary", bg: "bg-primary/10" },
  { n: 2, label: "Headquarters", icon: Building, color: "text-info", bg: "bg-info/10" },
  { n: 3, label: "Station HQ", icon: Building2, color: "text-warning", bg: "bg-warning/10" },
  { n: 4, label: "Officers", icon: Users, color: "text-success", bg: "bg-success/10" },
] as const;

type SortDir = "asc" | "desc";

function sortByName<T extends { name?: string }>(items: T[], dir: SortDir): T[] {
  return [...items].sort((a, b) => {
    const cmp = (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
    return dir === "asc" ? cmp : -cmp;
  });
}

function Toolbar({
  search,
  onSearch,
  searchPlaceholder,
  sort,
  onSort,
  filterLabel,
  filterValue,
  onFilter,
  filterOptions,
}: {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  sort: SortDir;
  onSort: (v: SortDir) => void;
  filterLabel?: string;
  filterValue?: string;
  onFilter?: (v: string) => void;
  filterOptions?: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex items-center gap-2 bg-secondary/50 border border-border/60 rounded-lg px-3 py-2 flex-1 min-w-0">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full min-w-0"
        />
      </div>
      {filterOptions && onFilter && (
        <div className="relative shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <select
            value={filterValue || ""}
            onChange={(e) => onFilter(e.target.value)}
            className="appearance-none bg-secondary/50 border border-border/60 rounded-lg pl-9 pr-9 py-2 text-sm outline-none cursor-pointer text-foreground hover:bg-secondary/80 min-w-[140px]"
            aria-label={filterLabel}
          >
            <option value="">{filterLabel || "All"}</option>
            {filterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      )}
      <div className="relative shrink-0">
        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortDir)}
          className="appearance-none bg-secondary/50 border border-border/60 rounded-lg pl-9 pr-9 py-2 text-sm outline-none cursor-pointer text-foreground hover:bg-secondary/80"
          aria-label="Sort"
        >
          <option value="asc">Name A → Z</option>
          <option value="desc">Name Z → A</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

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
  const { data: stationsRes } = useStations({ limit: 200 });
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
    name: "",
    city: "",
    stateId: "",
    stateName: "",
    hqId: "",
    hqName: "",
    address: "",
  });

  const [areaSearch, setAreaSearch] = useState("");
  const [areaSort, setAreaSort] = useState<SortDir>("asc");
  const [hqSearch, setHqSearch] = useState("");
  const [hqSort, setHqSort] = useState<SortDir>("asc");
  const [hqAreaFilter, setHqAreaFilter] = useState("");
  const [stationSearch, setStationSearch] = useState("");
  const [stationSort, setStationSort] = useState<SortDir>("asc");
  const [stationAreaFilter, setStationAreaFilter] = useState("");
  const [stationHqFilter, setStationHqFilter] = useState("");

  const [expanded, setExpanded] = useState({
    areas: true,
    hqs: true,
    stations: true,
    officers: true,
  });

  const filteredHqsForStation = useMemo(() => {
    if (!stationForm.stateId) return hqs;
    return hqs.filter((h: any) => String(h.stateId) === String(stationForm.stateId));
  }, [hqs, stationForm.stateId]);

  const filteredStates = useMemo(() => {
    let list = states as any[];
    const q = areaSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.code?.toLowerCase().includes(q)
      );
    }
    return sortByName(list, areaSort);
  }, [states, areaSearch, areaSort]);

  const filteredHqs = useMemo(() => {
    let list = hqs as any[];
    if (hqAreaFilter) {
      list = list.filter(
        (h) =>
          String(h.stateId) === hqAreaFilter ||
          h.stateName === states.find((s: any) => s._id === hqAreaFilter)?.name
      );
    }
    const q = hqSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (h) =>
          h.name?.toLowerCase().includes(q) ||
          h.city?.toLowerCase().includes(q) ||
          h.stateName?.toLowerCase().includes(q)
      );
    }
    return sortByName(list, hqSort);
  }, [hqs, hqSearch, hqSort, hqAreaFilter, states]);

  const filteredStations = useMemo(() => {
    let list = stations as any[];
    if (stationAreaFilter) {
      const areaName = states.find((s: any) => s._id === stationAreaFilter)?.name;
      list = list.filter(
        (s) =>
          s.stateName === areaName ||
          s.state === areaName
      );
    }
    if (stationHqFilter) {
      const hq = hqs.find((h: any) => String(h._id) === String(stationHqFilter));
      const hqName = hq?.name;
      list = list.filter((s: any) => {
        const stationHqId = typeof s.hqId === "object" && s.hqId ? s.hqId._id : s.hqId;
        return (
          String(stationHqId || "") === String(stationHqFilter) ||
          (hqName && String(s.hqName || "") === String(hqName))
        );
      });
    }
    const q = stationSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q) ||
          s.hqName?.toLowerCase().includes(q) ||
          s.stateName?.toLowerCase().includes(q)
      );
    }
    return sortByName(list, stationSort);
  }, [stations, stationSearch, stationSort, stationAreaFilter, stationHqFilter, states, hqs]);

  const hqCountByArea = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of hqs as any[]) {
      const key = h.stateName || h.state || "—";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [hqs]);

  const stationCountByHq = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stations as any[]) {
      const key = s.hqName || "—";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [stations]);

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
    if (!stationForm.name.trim() || !stationForm.city.trim() || !stationForm.stateName || !stationForm.hqId) return;
    await createStation.mutateAsync({
      name: stationForm.name.trim(),
      city: stationForm.city.trim(),
      state: stationForm.stateName,
      hqId: stationForm.hqId,
      hqName: stationForm.hqName,
      address: stationForm.address,
    });
    setStationForm({ name: "", city: "", stateId: "", stateName: "", hqId: "", hqName: "", address: "" });
    setStationOpen(false);
  }, [stationForm, createStation]);

  const toggleSection = (key: keyof typeof expanded) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/8 via-card to-card p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Layers className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Org hierarchy</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Organization Setup</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">{HIERARCHY_LABEL}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Create structure top-down, then assign officers at each level in{" "}
            <Link to="/users" className="text-primary font-medium hover:underline">
              Officers
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/15 to-primary/5 p-4">
          <div className="flex items-center justify-between">
            <MapIcon className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold text-foreground tabular-nums">{states.length}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Areas</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-br from-info/15 to-info/5 p-4">
          <div className="flex items-center justify-between">
            <Building className="w-5 h-5 text-info" />
            <span className="text-2xl font-bold text-foreground tabular-nums">{hqs.length}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Headquarters</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-br from-warning/15 to-warning/5 p-4">
          <div className="flex items-center justify-between">
            <Building2 className="w-5 h-5 text-warning" />
            <span className="text-2xl font-bold text-foreground tabular-nums">{stations.length}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Station HQs</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-br from-success/15 to-success/5 p-4">
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-success" />
            <span className="text-2xl font-bold text-foreground tabular-nums">4</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Setup step · Officers</p>
        </div>
      </div>

      {/* Step pipeline */}
      <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-secondary/30 border border-border/60">
        {STEPS.map((s, i) => (
          <span key={s.n} className="flex items-center gap-1">
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border/50 ${s.bg} ${s.color}`}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.n}. {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground/60 hidden sm:block" />
            )}
          </span>
        ))}
      </div>

      {/* ── Step 1: Areas ─────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border/60">
          <button
            type="button"
            onClick={() => toggleSection("areas")}
            className="flex items-start gap-3 text-left flex-1 min-w-0 group"
          >
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <MapIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                1. Areas
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${expanded.areas ? "rotate-180" : ""}`}
                />
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vitric Super Admin creates areas (e.g. Maharashtra, Gujarat). Multiple areas allowed.
              </p>
            </div>
          </button>
          {canCreateArea && (
            <button
              onClick={() => setAreaOpen(true)}
              className="px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg flex items-center gap-1.5 shrink-0 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Area
            </button>
          )}
        </div>
        {expanded.areas && (
          <div className="p-5 space-y-4">
            <Toolbar
              search={areaSearch}
              onSearch={setAreaSearch}
              searchPlaceholder="Search areas…"
              sort={areaSort}
              onSort={setAreaSort}
            />
            {filteredStates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center rounded-lg bg-secondary/30 border border-dashed border-border">
                {states.length === 0
                  ? "No areas yet. Super Admin can add one above."
                  : "No areas match your search."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredStates.map((s: any) => (
                  <div
                    key={s._id}
                    className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg bg-secondary/40 border border-border/60 hover:border-primary/30 hover:bg-secondary/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">Code: {s.code}</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {hqCountByArea.get(s.name) || 0} HQ
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Showing {filteredStates.length} of {states.length} area{states.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </section>

      {/* ── Step 2: Headquarters ────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border/60">
          <button
            type="button"
            onClick={() => toggleSection("hqs")}
            className="flex items-start gap-3 text-left flex-1 min-w-0"
          >
            <div className="p-2 rounded-lg bg-info/10 shrink-0">
              <Building className="w-5 h-5 text-info" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                2. Headquarters
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${expanded.hqs ? "rotate-180" : ""}`}
                />
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Under each area, add one or more HQs. Area Officer can create HQs in their area.
              </p>
            </div>
          </button>
          {canCreateHQ && (
            <button
              onClick={() => {
                setHqForm((f) => ({
                  ...f,
                  stateId: isArea ? user?.stateId || "" : f.stateId,
                }));
                setHqOpen(true);
              }}
              className="px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg flex items-center gap-1.5 shrink-0 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add HQ
            </button>
          )}
        </div>
        {expanded.hqs && (
          <div className="p-5 space-y-4">
            <Toolbar
              search={hqSearch}
              onSearch={setHqSearch}
              searchPlaceholder="Search headquarters…"
              sort={hqSort}
              onSort={setHqSort}
              filterLabel="All areas"
              filterValue={hqAreaFilter}
              onFilter={setHqAreaFilter}
              filterOptions={states.map((s: any) => ({ value: s._id, label: s.name }))}
            />
            {filteredHqs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center rounded-lg bg-secondary/30 border border-dashed border-border">
                {hqs.length === 0
                  ? "No headquarters yet. Create an area first, then add HQs."
                  : "No headquarters match your filters."}
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredHqs.map((h: any) => (
                  <div
                    key={h._id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-4 py-3 rounded-lg bg-secondary/40 border border-border/60 hover:border-info/30 transition-colors"
                  >
                    <span className="font-medium text-sm text-foreground">{h.name}</span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-md bg-background border border-border">{h.city}</span>
                      <span>Area: {h.stateName || h.state || "—"}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-info/10 text-info">
                        {stationCountByHq.get(h.name) || 0} stations
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Showing {filteredHqs.length} of {hqs.length} headquarter{hqs.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </section>

      {/* ── Step 3: Station HQs ───────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border/60">
          <button
            type="button"
            onClick={() => toggleSection("stations")}
            className="flex items-start gap-3 text-left flex-1 min-w-0"
          >
            <div className="p-2 rounded-lg bg-warning/10 shrink-0">
              <Building2 className="w-5 h-5 text-warning" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                3. Station HQs
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${expanded.stations ? "rotate-180" : ""}`}
                />
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Under each HQ, add station headquarters. HQ Officer can add stations for their HQ only.
              </p>
            </div>
          </button>
          {canCreateStation && (
            <button
              onClick={() => {
                if (isHQ && user?.hqId) {
                  setStationForm({
                    name: "",
                    city: "",
                    address: "",
                    stateId: user.stateId || "",
                    stateName: user.stateName || "",
                    hqId: user.hqId,
                    hqName: user.hqName || "",
                  });
                }
                setStationOpen(true);
              }}
              className="px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg flex items-center gap-1.5 shrink-0 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Station HQ
            </button>
          )}
        </div>
        {expanded.stations && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Toolbar
                search={stationSearch}
                onSearch={setStationSearch}
                searchPlaceholder="Search station HQs…"
                sort={stationSort}
                onSort={setStationSort}
                filterLabel="All areas"
                filterValue={stationAreaFilter}
                onFilter={(v) => {
                  setStationAreaFilter(v);
                  setStationHqFilter("");
                }}
                filterOptions={states.map((s: any) => ({ value: s._id, label: s.name }))}
              />
              <div className="relative shrink-0 sm:min-w-[180px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={stationHqFilter}
                  onChange={(e) => setStationHqFilter(e.target.value)}
                  className="appearance-none w-full bg-secondary/50 border border-border/60 rounded-lg pl-9 pr-9 py-2 text-sm outline-none cursor-pointer text-foreground hover:bg-secondary/80"
                >
                  <option value="">All headquarters</option>
                  {(stationAreaFilter
                    ? hqs.filter((h: any) => String(h.stateId) === stationAreaFilter)
                    : hqs
                  ).map((h: any) => (
                    <option key={h._id} value={h._id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            {filteredStations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center rounded-lg bg-secondary/30 border border-dashed border-border">
                {stations.length === 0
                  ? "No station HQs yet. Create HQ first, then add stations."
                  : "No station HQs match your filters."}
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredStations.map((s: any) => (
                  <div
                    key={s._id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-4 py-3 rounded-lg bg-secondary/40 border border-border/60 hover:border-warning/30 transition-colors"
                  >
                    <span className="font-medium text-sm text-foreground">{s.name}</span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-md bg-background border border-border">
                        HQ: {s.hqName || "—"}
                      </span>
                      <span>{s.stateName || s.state || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[11px] text-muted-foreground">
                Showing {filteredStations.length} of {stations.length} station HQ
                {stations.length !== 1 ? "s" : ""}
              </p>
              {stations.length > 0 && (
                <Link to="/stations" className="text-xs text-primary font-medium hover:underline">
                  Manage all stations →
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Step 4: Officers ──────────────────────────────────────────── */}
      <section className="bg-card border border-primary/25 rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => toggleSection("officers")}
          className="w-full flex items-start gap-3 p-5 text-left border-b border-border/60 hover:bg-secondary/20 transition-colors"
        >
          <div className="p-2 rounded-lg bg-success/10 shrink-0">
            <Users className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              4. Assign Officers
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${expanded.officers ? "rotate-180" : ""}`}
              />
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              After structure exists, assign officers (L1/L2/L3) and map each to their area, HQ, or station.
            </p>
          </div>
        </button>
        {expanded.officers && (
          <div className="p-5">
            <p className="text-xs text-muted-foreground mb-4">
              Permissions come from Settings → RBAC by role.
            </p>
            <ul className="text-xs text-muted-foreground space-y-2 mb-5">
              {[
                { role: "Super Admin", desc: "create Area, HQ, Station HQ officers" },
                { role: "Area Officer", desc: "create HQ & Station HQ officers in their area" },
                { role: "HQ Officer", desc: "create Station HQ officers under their HQ" },
              ].map((item) => (
                <li
                  key={item.role}
                  className="flex gap-2 items-start px-3 py-2 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <span className="font-semibold text-foreground shrink-0">{item.role}</span>
                  <span className="text-muted-foreground">→ {item.desc}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/users"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Go to Officers
            </Link>
          </div>
        )}
      </section>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {areaOpen && (
        <Modal title="Add Area" onClose={() => setAreaOpen(false)}>
          <Field
            label="Area name *"
            value={areaForm.name}
            onChange={(v) => setAreaForm({ ...areaForm, name: v })}
            placeholder="Maharashtra"
          />
          <Field
            label="Code *"
            value={areaForm.code}
            onChange={(v) => setAreaForm({ ...areaForm, code: v })}
            placeholder="MH"
          />
          <Submit
            onClick={handleCreateArea}
            loading={createState.isPending}
            disabled={!areaForm.name || !areaForm.code}
            label="Create Area"
          />
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
            <p className="text-xs text-muted-foreground mb-2">
              Area: <span className="text-foreground">{user.stateName}</span>
            </p>
          )}
          <Field
            label="HQ name *"
            value={hqForm.name}
            onChange={(v) => setHqForm({ ...hqForm, name: v })}
            placeholder="Kamptee Sub-Area HQ"
          />
          <Field
            label="City *"
            value={hqForm.city}
            onChange={(v) => setHqForm({ ...hqForm, city: v })}
            placeholder="Kamptee"
          />
          <Field
            label="Address"
            value={hqForm.address}
            onChange={(v) => setHqForm({ ...hqForm, address: v })}
            placeholder="Optional"
          />
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
              {user.stateName && (
                <>
                  {" "}
                  · Area: <span className="text-foreground">{user.stateName}</span>
                </>
              )}
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
          <Field
            label="Station HQ Name *"
            value={stationForm.name}
            onChange={(v) => setStationForm({ ...stationForm, name: v })}
            placeholder="e.g. Nagpur Station HQ"
          />
          <Field
            label="City *"
            value={stationForm.city}
            onChange={(v) => setStationForm({ ...stationForm, city: v })}
            placeholder="Nagpur"
          />
          <Submit
            onClick={handleCreateStation}
            loading={createStation.isPending}
            disabled={!stationForm.name.trim() || !stationForm.city || !stationForm.hqId || !stationForm.stateName}
            label="Create Station HQ"
          />
        </Modal>
      )}
    </div>
  );
});

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
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
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Submit({
  onClick,
  loading,
  disabled,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full mt-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <Plus className="w-4 h-4" />
      )}
      {label}
    </button>
  );
}
