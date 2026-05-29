import { useState, useRef, memo, useCallback, useMemo, useEffect } from "react";
import {
  FileText, Filter, Download, Search, Eye, MoreVertical,
  ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle2,
  UserCheck, Printer, ChevronDown, Building2,
  User, Tag, Clock, MessageSquare, Send, ArrowUpRight,Trash2,Paperclip, Image as ImageIcon,
} from "lucide-react";
import { useGrievances, useGrievance, useUpdateGrievanceStatus, useAssignOfficer, useAddComment, useCreateGrievance, useDeleteGrievance, useCaseTypes, useStations, useOfficers, type GrievanceParams } from "@/hooks/useApi";
import { usePermissions } from "@/stores/rbac";
import { useAuth } from "@/contexts/AuthContext";

type Status = "pending" | "in-progress" | "escalated" | "resolved";
type Priority = "low" | "medium" | "high" | "critical";

const statusBadge: Record<string, string> = { pending:"bg-warning/15 text-warning","in-progress":"bg-info/15 text-info",escalated:"bg-destructive/15 text-destructive",resolved:"bg-success/15 text-success" };
const priorityBadge: Record<string, string> = { low:"bg-muted text-muted-foreground",medium:"bg-info/15 text-info",high:"bg-warning/15 text-warning",critical:"bg-destructive/15 text-destructive" };

interface FilterState { priority:string; station:string; officer:string; caseType:string; dateFrom:string; dateTo:string; }

function Modal({ open, onClose, title, children, wide=false }: { open:boolean; onClose:()=>void; title:string; children:React.ReactNode; wide?:boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${wide ? "w-full max-w-3xl" : "w-full max-w-lg"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function SelectField({ value, onChange, children }: { value:string; onChange:(v:string)=>void; children:React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground appearance-none outline-none focus:ring-1 focus:ring-primary/50">{children}</select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function FormField({ label, children }: { label:string; children:React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{label}</label>{children}</div>;
}

function InputField({ value, onChange, placeholder, type="text" }: { value:string; onChange:(v:string)=>void; placeholder?:string; type?:string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground" />;
}

function ViewDetailsModal({ grievance: initialGrievance, onClose }: { grievance:any; onClose:()=>void }) {
  const [note, setNote] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const updateStatus = useUpdateGrievanceStatus();
  const addComment = useAddComment();
  const { user } = useAuth();
  const permissions = usePermissions();

  // ── LIVE DATA FIX: fetch fresh grievance from server so notes persist after refresh ──
  // This replaces the stale prop with a live React Query subscription
  const { data: liveGrievance, isLoading: detailLoading } = useGrievance(initialGrievance._id || "");
  // Merge: use live data when available, fall back to prop
  const grievance = liveGrievance || initialGrievance;

  // const addNote = useCallback(async () => {
  //   if (!note.trim() || !grievance._id) return;
  //   await addComment.mutateAsync({ id: grievance._id, message: note, authorName: user?.name || "Admin", authorRole: user?.role || "admin" });
  //   setNote("");
  // }, [note, grievance._id, addComment, user]);

  const addNote = useCallback(async () => {
  if (!note.trim() && noteFiles.length === 0) return;
  if (!grievance._id) return;
  await addComment.mutateAsync({
    id: grievance._id,
    message: note || "(attachment)",
    authorName: user?.name || "Admin",
    authorRole: user?.role || "admin",
  });
  setNote("");
  setNoteFiles([]);
}, [note, noteFiles, grievance._id, addComment, user]);

  const nextStatus: Record<string, {label:string;status:string;cls:string}|null> = {
    pending: { label:"Start Processing", status:"in-progress", cls:"bg-info/15 text-info hover:bg-info/25" },
    "in-progress": { label:"Mark Resolved", status:"resolved", cls:"bg-success/15 text-success hover:bg-success/25" },
    escalated: { label:"Mark Resolved", status:"resolved", cls:"bg-success/15 text-success hover:bg-success/25" },
    resolved: null,
  };
  const action = nextStatus[grievance.status];

  return (
    <Modal open onClose={onClose} title={`${grievance.grievanceId || grievance.id} — ${grievance.type}`} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusBadge[grievance.status]}`}>{grievance.status}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${priorityBadge[grievance.priority]}`}>{grievance.priority} priority</span>
          {action && permissions.updateGrievanceStatus && (
            <button onClick={() => { updateStatus.mutate({ id: grievance._id || grievance.id, status: action.status, officerName: user?.name }); onClose(); }} className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ml-auto ${action.cls}`}>{action.label}</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon:User, label:"Veteran", value:grievance.veteranName || grievance.veteran },
            { icon:Tag, label:"Army No.", value:grievance.veteranArmyNo || grievance.armyNo || "—" },
            { icon:Building2, label:"Station", value:grievance.stationName || grievance.station },
            { icon:UserCheck, label:"Assigned Officer", value:grievance.officerName || grievance.officer },
            { icon:Clock, label:"Filed On", value:grievance.createdAt ? new Date(grievance.createdAt).toLocaleDateString("en-IN") : grievance.date },
            { icon:User, label:"Contact", value:grievance.veteranPhone || grievance.contact || "—" },
          ].map(({ icon:Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5 bg-secondary/30 rounded-lg p-3">
              <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium text-foreground mt-0.5">{value}</p></div>
            </div>
          ))}
        </div>
        {grievance.description && (
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm text-foreground">{grievance.description}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Case Notes / Timeline
            {detailLoading && <span className="text-xs text-muted-foreground italic">(refreshing...)</span>}
          </p>
          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
            {(grievance.timeline || []).length === 0 && (grievance.comments || []).length === 0 && (
              <p className="text-xs text-muted-foreground italic">No notes yet. Add one below.</p>
            )}
            {(grievance.timeline || []).map((t: any, i: number) => (
              <div key={i} className="bg-secondary/30 rounded-lg p-2.5 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge[t.status] || "bg-secondary text-foreground"}`}>{t.status}</span>
                </div>
                <p className="text-sm text-foreground">{t.note}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.updatedBy} · {t.updatedAt ? new Date(t.updatedAt).toLocaleString("en-IN") : ""}</p>
              </div>
            ))}
            {(grievance.comments || []).map((c: any, i: number) => (
              <div key={`c-${i}`} className="bg-primary/5 rounded-lg p-2.5 border border-primary/10">
                <p className="text-sm text-foreground">{c.message}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{c.authorName} · {c.createdAt ? new Date(c.createdAt).toLocaleString("en-IN") : ""}</p>
              </div>
            ))}
          </div>
          {/* <div className="flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="Add a note..." className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground" />
            <button onClick={addNote} disabled={addComment.isPending || !note.trim()} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-1.5">
              {addComment.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div> */}
          {/* Note attachment files preview */}
{noteFiles.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mb-2">
    {noteFiles.map((file, i) => (
      <div key={i} className="flex items-center gap-1.5 bg-secondary/50 rounded px-2 py-1">
        {file.type === "application/pdf"
          ? <FileText className="w-3 h-3 text-primary" />
          : <ImageIcon className="w-3 h-3 text-primary" />
        }
        <span className="text-xs text-foreground truncate max-w-[100px]">{file.name}</span>
        <button onClick={() => setNoteFiles((f) => f.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">
          <X className="w-2.5 h-2.5" />
        </button>
      </div>
    ))}
  </div>
)}

<div className="flex gap-2">
  {/* Attachment button */}
  <label className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground cursor-pointer shrink-0" title="Attach file">
    <Paperclip className="w-4 h-4" />
    <input
      type="file" multiple accept=".jpg,.jpeg,.png,.pdf"
      className="hidden"
      onChange={(e) => {
        const files = Array.from(e.target.files || []).slice(0, 3);
        setNoteFiles((prev) => [...prev, ...files].slice(0, 3));
        e.target.value = "";
      }}
    />
  </label>

  <input
    value={note}
    onChange={(e) => setNote(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && addNote()}
    placeholder="Add a note..."
    className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
  />

  <button
    onClick={addNote}
    disabled={addComment.isPending || (!note.trim() && noteFiles.length === 0)}
    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-1.5"
  >
    {addComment.isPending
      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      : <Send className="w-4 h-4" />
    }
  </button>
</div>
        </div>
      </div>
    </Modal>
  );
}

function NewGrievanceModal({ onClose }: { onClose:()=>void }) {
  const createGrievance = useCreateGrievance();
  const { data: caseTypesList = [] } = useCaseTypes({ status: "active" });
  const { data: stationsData } = useStations({ limit: 100 });
  const stations = stationsData?.data || [];

  const [form, setForm] = useState({
    type: "", veteran: "", rank: "", armyNo: "", contact: "",
    station: "", officer: "", priority: "medium",
    description: "", attachments: [] as File[]
  });
  const [errors, setErrors] = useState<Record<string,string>>({});

  // ── Filter officers by selected station ──────────────────────────────────
  const { data: officersData } = useOfficers({
    limit: 100,
    station: form.station || undefined,
  });
  const officers = officersData?.data || [];

  // ── Auto-select first case type ──────────────────────────────────────────
  useEffect(() => {
    if (caseTypesList.length && !form.type) {
      setForm((f) => ({ ...f, type: caseTypesList[0].name }));
    }
  }, [caseTypesList]);

  // ── Auto-select first station ────────────────────────────────────────────
  useEffect(() => {
    if (stations.length && !form.station) {
      setForm((f) => ({ ...f, station: stations[0].name }));
    }
  }, [stations]);

  // ── When station changes → reset officer and auto-select first ───────────
  useEffect(() => {
    if (officers.length) {
      setForm((f) => ({ ...f, officer: officers[0].name }));
    } else {
      setForm((f) => ({ ...f, officer: "" }));
    }
  }, [form.station, officers.length]);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = {...e}; delete n[k]; return n; });
  };

  const submit = useCallback(async () => {
    const e: Record<string,string> = {};
    if (!form.veteran.trim()) e.veteran = "Required";
    if (!form.rank.trim())    e.rank    = "Required";
    if (!form.armyNo.trim())  e.armyNo  = "Required";
    if (Object.keys(e).length) { setErrors(e); return; }

    await createGrievance.mutateAsync({
      type:             form.type || (caseTypesList[0]?.name || ""),
      veteranName:      `${form.rank} ${form.veteran}`.trim(),
      veteranPhone:     form.contact,
      veteranArmyNo:    form.armyNo,
      veteranRank:      form.rank,
      stationName:      form.station || (stations[0]?.name || ""),
      officerName:      form.officer || "Unassigned",
      priority:         form.priority,
      description:      form.description,
      submissionSource: "manual",
    });
    onClose();
  }, [form, createGrievance, onClose, caseTypesList, stations]);

  return (
    <Modal open onClose={onClose} title="New Grievance" wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">

          <FormField label="Case Type *">
            <SelectField value={form.type} onChange={(v) => set("type", v)}>
              {caseTypesList.map((t: any) => (
                <option key={t._id || t.name} value={t.name}>{t.name}</option>
              ))}
            </SelectField>
          </FormField>

          <FormField label="Priority *">
            <SelectField value={form.priority} onChange={(v) => set("priority", v)}>
              {["low","medium","high","critical"].map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </SelectField>
          </FormField>

          <FormField label={`Veteran Name * ${errors.veteran || ""}`}>
            <InputField value={form.veteran} onChange={(v) => set("veteran", v)} placeholder="e.g. R.K. Sharma" />
          </FormField>

          <FormField label={`Rank * ${errors.rank || ""}`}>
            <InputField value={form.rank} onChange={(v) => set("rank", v)} placeholder="e.g. Col." />
          </FormField>

          <FormField label={`Army No. * ${errors.armyNo || ""}`}>
            <InputField value={form.armyNo} onChange={(v) => set("armyNo", v)} placeholder="e.g. IC-45678" />
          </FormField>

          <FormField label="Contact Number">
            <InputField value={form.contact} onChange={(v) => set("contact", v)} placeholder="+91 XXXXX XXXXX" />
          </FormField>

          {/* Station dropdown */}
          <FormField label="Station HQ *">
            <SelectField value={form.station} onChange={(v) => set("station", v)}>
              <option value="">Select Station</option>
              {stations.map((s: any) => (
                <option key={s._id || s.name} value={s.name}>{s.name}</option>
              ))}
            </SelectField>
          </FormField>

          {/* Officer dropdown — filters by selected station */}
          <FormField label="Assign Officer *">
            <SelectField value={form.officer} onChange={(v) => set("officer", v)}>
              <option value="">
                {!form.station
                  ? "Select station first"
                  : officers.length === 0
                  ? "No officers found"
                  : "Select Officer"}
              </option>
              {officers.map((o: any) => (
                <option key={o._id || o.name} value={o.name}>{o.name}</option>
              ))}
            </SelectField>
          </FormField>

        </div>

        <FormField label="Description">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Brief description..."
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground resize-none"
          />
        </FormField>

        {/* Attachments */}
        <FormField label="Attachments (optional · max 3 · JPG, PNG, PDF · 5MB each)">
          <label className={`flex items-center gap-2 w-full bg-secondary/50 border border-dashed border-border rounded-lg px-3 py-2.5 cursor-pointer hover:border-primary/50 transition-colors ${form.attachments.length >= 3 ? "opacity-50 cursor-not-allowed" : ""}`}>
            <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">
              {form.attachments.length > 0
                ? `${form.attachments.length} file(s) — tap to add more`
                : "Click to attach documents"}
            </span>
            <input
              type="file" multiple accept=".jpg,.jpeg,.png,.pdf"
              disabled={form.attachments.length >= 3}
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const valid = files.filter((f) => {
                  const okType = ["image/jpeg","image/png","image/jpg","application/pdf"].includes(f.type);
                  const okSize = f.size <= 5 * 1024 * 1024;
                  return okType && okSize;
                });
                set("attachments", [...form.attachments, ...valid].slice(0, 3) as any);
                e.target.value = "";
              }}
            />
          </label>
          {form.attachments.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {form.attachments.map((file: File, i: number) => (
                <div key={i} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {file.type === "application/pdf"
                      ? <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      : <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    }
                    <p className="text-xs text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)}KB</p>
                  </div>
                  <button
                    onClick={() => set("attachments", form.attachments.filter((_: any, idx: number) => idx !== i) as any)}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={createGrievance.isPending}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {createGrievance.isPending
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <FileText className="w-4 h-4" />
            }
            Submit Grievance
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ActionsMenu({ grievance, onView, onStatusChange, onEscalate, onAssign }: any) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const perms = usePermissions();
  // const deleteGrievance = useDeleteGrievance();

  const handleToggle = () => {
    if (buttonRef.current) { const rect = buttonRef.current.getBoundingClientRect();
      // if not enough space below → open upward
      setOpenUpward(window.innerHeight - rect.bottom < 220);
    }
    setOpen((o) => !o);
  };

  // const actions = [{ label:"View Details", icon:Eye, onClick:()=>{onView();setOpen(false);} },

  //   ...(perms.updateGrievanceStatus && grievance.status==="pending"? [{label:"Start Processing", icon:ArrowUpRight, onClick:()=>{onStatusChange("in-progress");setOpen(false);}}]: []),
  //   ...(perms.escalateGrievance && grievance.status!=="resolved" && grievance.status!=="escalated"? [{label:"Escalate", icon:AlertTriangle, onClick:()=>{onEscalate();setOpen(false);}}]: []),
  //   ...(perms.updateGrievanceStatus && (grievance.status==="in-progress" || grievance.status==="escalated")? [{label:"Mark Resolved", icon:CheckCircle2, onClick:()=>{onStatusChange("resolved");setOpen(false);} }]: []),
  //   ...(perms.reassignOfficer && grievance.status !== "resolved"? [{ label: grievance.officerName === "Unassigned" || !grievance.officerName? "Assign Officer": "Reassign Officer", icon:UserCheck, onClick:()=>{onAssign();setOpen(false);}}]: []),
  //   { label:"Print Case", icon:Printer, onClick:()=>{window.print();setOpen(false);}},
  //   ...(perms.deleteGrievance? [{label:"Delete Grievance", icon:Trash2, onClick:() => {
  //           if (window.confirm("Are you sure you want to delete this grievance?")) {
  //             deleteGrievance.mutate(grievance._id);
  //           }
  //           setOpen(false);
  //         }
  //       }]
  //     : []),
  // ];


  const actions = [
    { label:"View Details", icon:Eye, onClick:()=>{onView();setOpen(false);} },
    ...(perms.updateGrievanceStatus && grievance.status==="pending"? [{label:"Start Processing", icon:ArrowUpRight, onClick:()=>{onStatusChange("in-progress");setOpen(false);}}]: []),
    ...(perms.escalateGrievance && grievance.status!=="resolved" && grievance.status!=="escalated"? [{label:"Escalate", icon:AlertTriangle, onClick:()=>{onEscalate();setOpen(false);}}]: []),
    ...(perms.updateGrievanceStatus && (grievance.status==="in-progress" || grievance.status==="escalated")? [{label:"Mark Resolved", icon:CheckCircle2, onClick:()=>{onStatusChange("resolved");setOpen(false);} }]: []),
    { label:"Print Case", icon:Printer, onClick:()=>{window.print();setOpen(false);} },
  ];

  return (
    <div className="relative">
      <button ref={buttonRef} onClick={handleToggle} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)}/>
          <div className={`absolute right-0 z-20 bg-card border border-border rounded-xl shadow-xl py-1 w-44 min-w-max ${openUpward ? "bottom-8" : "top-8"}`}>
            {actions.map(({ label, icon: Icon, onClick }) => (
              <button key={label} onClick={onClick} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors text-left">
                <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
          </>
          )}
      </div>
    );
}

function FilterPills({ filters, onRemove }: { filters:FilterState; onRemove:(k:keyof FilterState)=>void }) {
  const active = Object.entries(filters).filter(([,v])=>v);
  if (!active.length) return null;
  const labels: Record<keyof FilterState,string> = { priority:"Priority",station:"Station",officer:"Officer",caseType:"Case Type",dateFrom:"From",dateTo:"To" };
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {active.map(([key,val])=>(
        <span key={key} className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
          <span className="text-primary/60">{labels[key as keyof FilterState]}:</span>{val}
          <button onClick={()=>onRemove(key as keyof FilterState)} className="hover:text-primary/60"><X className="w-3 h-3" /></button>
        </span>
      ))}
    </div>
  );
}

function toCSV(data: any[]) {
  const headers = ["ID","Type","Veteran","Station","Officer","Priority","Status","Date"];
  const rows = data.map((g)=>[g.grievanceId||g.id,g.type,g.veteranName||g.veteran,g.stationName||g.station,g.officerName||g.officer,g.priority,g.status,g.createdAt?new Date(g.createdAt).toLocaleDateString("en-IN"):g.date]);
  return [headers,...rows].map((r)=>r.map((c)=>`"${c||""}"`).join(",")).join("\n");
}

export default memo(function Grievances() {
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  const [filters, setFilters] = useState<FilterState>({ priority:"",station:"",officer:"",caseType:"",dateFrom:"",dateTo:"" });
  const [viewGrievance, setViewGrievance] = useState<any>(null);
  const [showNewGrievance, setShowNewGrievance] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [escalateGrievance, setEscalateGrievance] = useState<any>(null);
  const [reassignGrievance, setReassignGrievance] = useState<any>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const { data: caseTypesList = [] } = useCaseTypes();
  const { data: stationsData } = useStations({ limit: 100 });
  const { data: officersData } = useOfficers({ limit: 100 });

  const stations = stationsData?.data || [];
  const officers = officersData?.data || [];

  const queryParams = useMemo<GrievanceParams>(() => ({
    page, limit: PAGE_SIZE,
    search: search || undefined,
    status: activeTab !== "all" ? activeTab : undefined,
    priority: filters.priority || undefined,
    station: filters.station || undefined,
    officer: filters.officer || undefined,
    type: filters.caseType || undefined,
    startDate: filters.dateFrom || undefined,
    endDate: filters.dateTo || undefined,
  }), [page, search, activeTab, filters]);

  const { data, isLoading } = useGrievances(queryParams);
  const updateStatus = useUpdateGrievanceStatus();
  const assignOfficer = useAssignOfficer();
  const { user } = useAuth();

  const grievances = useMemo(() => data?.data || [], [data]);
  const pagination = useMemo(() => data?.pagination || { total:0, totalPages:1 }, [data]);

  const handleStatusChange = useCallback((g: any, status: string) => {
    if (!g._id) return;
    updateStatus.mutate({ id: g._id, status, officerName: user?.name });
  }, [updateStatus, user]);

  const handleReassign = useCallback((g: any, officerName: string) => {
    if (!g._id) return;
    const isNew = g._originalOfficer === "Unassigned" || !g._originalOfficer;
    assignOfficer.mutate({ id: g._id, officerName, isNew });
  }, [assignOfficer]);

  const removeFilter = (key: keyof FilterState) => setFilters((f)=>({...f,[key]:""}));
  const hasFilters = Object.values(filters).some(Boolean);

  const tabs = ["all","pending","in-progress","escalated","resolved"];

  // Filter modal
  const FilterModal = () => {
    const [local, setLocal] = useState({...filters});
    return (
      <Modal open  onClose={()=>setShowFilter(false)} title="Advanced Filters">
        <div className="space-y-4">
          <FormField label="Case Type"><SelectField value={local.caseType} onChange={(v)=>setLocal((f)=>({...f,caseType:v}))}><option value="">All Case Types</option>{caseTypesList.map((t: any)=><option key={t._id || t.name} value={t.name}>{t.name}</option>)}</SelectField></FormField>
          <FormField label="Priority"><SelectField value={local.priority} onChange={(v)=>setLocal((f)=>({...f,priority:v}))}><option value="">All Priorities</option>{["low","medium","high","critical"].map((p)=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}</SelectField></FormField>
          <FormField label="Station HQ"><SelectField value={local.station} onChange={(v)=>setLocal((f)=>({...f,station:v}))}><option value="">All Stations</option>{stations.map((s: any)=><option key={s._id || s.name} value={s.name}>{s.name}</option>)}</SelectField></FormField>
          <FormField label="Assigned Officer"><SelectField value={local.officer} onChange={(v)=>setLocal((f)=>({...f,officer:v}))}><option value="">All Officers</option>{officers.map((o: any)=><option key={o._id || o.name} value={o.name}>{o.name}</option>)}</SelectField></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date From"><InputField value={local.dateFrom} onChange={(v)=>setLocal((f)=>({...f,dateFrom:v}))} type="date" /></FormField>
            <FormField label="Date To"><InputField value={local.dateTo} onChange={(v)=>setLocal((f)=>({...f,dateTo:v}))} type="date" /></FormField>
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <button onClick={()=>setLocal({priority:"",station:"",officer:"",caseType:"",dateFrom:"",dateTo:""})} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Reset</button>
            <div className="flex gap-2">
              <button onClick={()=>setShowFilter(false)} className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg">Cancel</button>
              <button onClick={()=>{setFilters(local);setShowFilter(false);setPage(1);}} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg">Apply</button>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grievances</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and track all veteran grievance cases</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={()=>setExportOpen((o)=>!o)} className="px-4 py-2 text-sm bg-secondary/50 text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-4 h-4 " />
            </button>
            {exportOpen && (<><div className="fixed inset-0 z-10" onClick={()=>setExportOpen(false)}/><div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-xl shadow-xl py-1 w-40">
              <button onClick={()=>{const c=toCSV(grievances);const b=new Blob([c],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`grievances-${Date.now()}.csv`;a.click();setExportOpen(false);}} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60"><FileText className="w-3.5 h-3.5 text-muted-foreground"/>Export CSV</button>
              <button onClick={()=>{const b=new Blob([JSON.stringify(grievances,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`grievances-${Date.now()}.json`;a.click();setExportOpen(false);}} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60"><FileText className="w-3.5 h-3.5 text-muted-foreground"/>Export JSON</button>
            </div></>)}
          </div>
          {permissions.createGrievance && <button onClick={()=>setShowNewGrievance(true)} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"><FileText className="w-4 h-4"/> New Grievance</button>}
        </div>
      </div>

      {/* ── Case Type Quick-Filter Strip ──  */}
      {/* <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setFilters((f) => ({...f, caseType: ""})); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${!filters.caseType ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}
        >All Types</button>
        {CASE_TYPES.map((ct) => (
          <button
            key={ct}
            onClick={() => { setFilters((f) => ({...f, caseType: f.caseType === ct ? "" : ct})); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border whitespace-nowrap ${filters.caseType === ct ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}
          >{ct}</button>
        ))}
      </div> */}

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg overflow-x-auto">
            {tabs.map((tab)=>(
              <button key={tab} onClick={()=>{setActiveTab(tab);setPage(1);}} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap ${activeTab===tab?"bg-primary text-primary-foreground":"text-muted-foreground hover:text-foreground"}`}>
                {tab==="in-progress"?"In Progress":tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-muted-foreground"/>
              <input type="text" placeholder="Search..." value={search} onChange={(e)=>{setSearch(e.target.value);setPage(1);}} className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-32 sm:w-40"/>
              {search&&<button onClick={()=>setSearch("")} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5"/></button>}
            </div>
            <button onClick={()=>setShowFilter(true)} className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${hasFilters?"bg-primary/15 text-primary":"bg-secondary/50 text-muted-foreground hover:text-foreground"}`}>
              <Filter className="w-4 h-4"/>
              {hasFilters&&<span className="text-xs font-medium">{Object.values(filters).filter(Boolean).length}</span>}
            </button>
          </div>
        </div>

        <FilterPills filters={filters} onRemove={removeFilter}/>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["ID","Type","Veteran","Station","Assigned To","Priority","Status","Date","Actions"].map((h,i)=>(
                  <th key={h} className={`text-xs font-medium text-muted-foreground py-3 px-3 ${i===8?"text-right":"text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array(6).fill(0).map((_,i)=>(
                <tr key={i} className="border-b border-border/50"><td colSpan={9} className="py-3 px-3"><div className="h-8 bg-secondary/50 rounded animate-pulse"/></td></tr>
              )) : grievances.length===0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">No grievances found.</td></tr>
              ) : grievances.map((g: any)=>(
                <tr key={g._id||g.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-3 text-sm font-mono text-primary">{g.grievanceId||g.id}</td>
                  <td className="py-3 px-3 text-sm text-foreground max-w-[140px] truncate">{g.type}</td>
                  <td className="py-3 px-3 text-sm text-foreground">{g.veteranName||g.veteran}</td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">{g.stationName||g.station}</td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">{g.officerName||g.officer}</td>
                  <td className="py-3 px-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityBadge[g.priority]||""}`}>{g.priority}</span></td>
                  <td className="py-3 px-2"><span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusBadge[g.status]||""}`}>{g.status}</span></td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">{g.createdAt?new Date(g.createdAt).toLocaleDateString("en-IN"):g.date}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={()=>setViewGrievance(g)} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground"><Eye className="w-4 h-4"/></button>
                      <ActionsMenu grievance={g} onView={()=>setViewGrievance(g)} onStatusChange={(s: string)=>handleStatusChange(g,s)} onEscalate={()=>setEscalateGrievance(g)} onAssign={()=>setReassignGrievance({...g, _originalOfficer: g.officerName})}/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Loading..." : `${pagination.total} grievances total`}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={()=>setPage((p)=>Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground disabled:opacity-40"><ChevronLeft className="w-4 h-4"/></button>
            {Array.from({length:Math.min(pagination.totalPages||1,5)},(_,i)=>i+1).map((n)=>(
              <button key={n} onClick={()=>setPage(n)} className={`w-8 h-8 rounded-md text-xs font-medium ${n===page?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-secondary"}`}>{n}</button>
            ))}
            <button onClick={()=>setPage((p)=>Math.min(pagination.totalPages||1,p+1))} disabled={page===pagination.totalPages} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
          </div>
        </div>
      </div>

      {viewGrievance && <ViewDetailsModal grievance={viewGrievance} onClose={()=>setViewGrievance(null)}/>}
      {showNewGrievance && <NewGrievanceModal onClose={()=>setShowNewGrievance(false)}/>}
      {showFilter && <FilterModal/>}
      {escalateGrievance && (
        <Modal open onClose={()=>setEscalateGrievance(null)} title={`Escalate — ${escalateGrievance.grievanceId||escalateGrievance.id}`}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0"/>
              <p className="text-sm text-foreground">This will escalate the case to the ESM Sub-Area Officer for immediate attention.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={()=>setEscalateGrievance(null)} className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg">Cancel</button>
              <button onClick={()=>{handleStatusChange(escalateGrievance,"escalated");setEscalateGrievance(null);}} className="px-4 py-2 text-sm bg-destructive text-white rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4"/> Escalate Case
              </button>
            </div>
          </div>
        </Modal>
      )}
      {reassignGrievance && (() => {
  // Store original officer name — doesn't change when dropdown is selected
  const isUnassigned = reassignGrievance._originalOfficer === "Unassigned" || !reassignGrievance._originalOfficer;
  return (
    <Modal open onClose={()=>setReassignGrievance(null)} title={`${isUnassigned ? "Assign" : "Reassign"} — ${reassignGrievance.grievanceId||reassignGrievance.id}`}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Currently: <span className="text-foreground font-medium">{reassignGrievance._originalOfficer}</span></p>
        <FormField label={isUnassigned ? "Assign Officer" : "New Assigned Officer"}>
          <SelectField value={reassignGrievance.officerName === "Unassigned" ? "" : reassignGrievance.officerName||""} onChange={(v)=>setReassignGrievance((g: any)=>({...g,officerName:v}))}>
            <option value="">Select Officer</option>
            {officers.map((o: any)=><option key={o._id || o.name} value={o.name}>{o.name}</option>)}
          </SelectField>
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={()=>setReassignGrievance(null)} className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg">Cancel</button>
          <button onClick={()=>{handleReassign(reassignGrievance,reassignGrievance.officerName);setReassignGrievance(null);}} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg">
            {isUnassigned ? "Assign Officer" : "Reassign Officer"}
          </button>
        </div>
      </div>
    </Modal>
  );
})()}
    </div>
  );
});
