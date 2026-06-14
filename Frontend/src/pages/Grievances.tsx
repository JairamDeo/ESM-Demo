import { useState, useRef, memo, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FileText, Filter, Download, Search, Eye, MoreVertical,
  ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle2,
  UserCheck, Printer, ChevronDown, Building2,
  User, Tag, Clock, MessageSquare, Send, ArrowUpRight,Trash2,Paperclip, Image as ImageIcon,
} from "lucide-react";
import { useGrievances, useGrievance, useUpdateGrievanceStatus, useAssignOfficer, useAddComment, useResolveConcern, useCreateGrievance, useDeleteGrievance, useCaseTypes, useStations, useOfficers, useSlaSettings, useUpdateSlaSettings, useRequestEscalationTakeover, useApproveEscalationRequest, useRejectEscalationRequest, useEscalationPreview, useManualEscalateGrievance, useRequestEscalateToUpperTier, type GrievanceParams } from "@/hooks/useApi";
import { usePermissions } from "@/stores/rbac";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBaseUrl } from "@/lib/apiBase";
import { toast } from "sonner";
import { getConcernDocuments, timelineConcernLabel, veteranResponseLabel, getEffectiveConcernStatus, isConcernBlockingStatus } from "@/lib/concernUtils";

type Status = "pending" | "in-progress" | "escalated" | "resolved";
type Priority = "low" | "medium" | "high" | "critical";

const statusBadge: Record<string, string> = { pending:"bg-warning/15 text-warning","in-progress":"bg-info/15 text-info",escalated:"bg-destructive/15 text-destructive",resolved:"bg-success/15 text-success" };
const priorityBadge: Record<string, string> = { low:"bg-muted text-muted-foreground",medium:"bg-info/15 text-info",high:"bg-warning/15 text-warning",critical:"bg-destructive/15 text-destructive" };

// Returns the veteran name only if it looks like a real name (not a raw phone number).
// Existing records may have stored the phone as veteranName — suppress those.
const getVeteranDisplay = (name?: string): string => {
  if (!name) return "";
  if (/^[+\s\d]{10,}$/.test(name.trim())) return "";
  return name;
};

const ORG_TIER_LABELS: Record<string, string> = {
  station: "Station HQ",
  hq: "Headquarter",
  area: "Area",
};

function canActOnGrievance(user: { id?: string; role?: string } | null, grievance: { officerId?: string }): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (!grievance.officerId || !user.id) return false;
  return String(grievance.officerId) === String(user.id);
}

function orgTierLabel(tier?: string): string {
  return ORG_TIER_LABELS[tier || "station"] || tier || "Station HQ";
}

function isConcernBlocking(status?: string): boolean {
  return isConcernBlockingStatus(status);
}

function concernStatusBadge(status?: string): string {
  if (status === "awaiting_veteran") return "bg-warning/15 text-warning";
  if (status === "awaiting_officer") return "bg-info/15 text-info";
  return "bg-secondary text-muted-foreground";
}

function concernStatusText(status?: string): string {
  if (status === "awaiting_veteran") return "Concern · Awaiting veteran";
  if (status === "awaiting_officer") return "Concern · Review veteran response";
  return "";
}

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

function CollapsiblePanel({
  title,
  icon: Icon,
  open,
  onToggle,
  count,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-secondary/10">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {title}
          {count !== undefined && count > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({count})</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

function getStatusConfirmCopy(status: string, grievanceId: string) {
  if (status === "in-progress") {
    return {
      title: "Start Processing",
      description: `Move ${grievanceId} from Pending to In Progress? The veteran will see that their case is being handled.`,
      confirmLabel: "Start Processing",
    };
  }
  if (status === "resolved") {
    return {
      title: "Mark Resolved",
      description: `Mark ${grievanceId} as Resolved? Use this when the grievance is fully complete.`,
      confirmLabel: "Mark Resolved",
    };
  }
  return {
    title: "Update Status",
    description: `Update status for ${grievanceId}?`,
    confirmLabel: "Confirm",
  };
}

function StatusConfirmModal({
  grievanceId,
  grievanceType,
  nextStatus,
  onClose,
  onConfirm,
  isPending,
}: {
  grievanceId: string;
  grievanceType?: string;
  nextStatus: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  const copy = getStatusConfirmCopy(nextStatus, grievanceId);
  const isResolve = nextStatus === "resolved";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isPending ? undefined : onClose} />
      <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isResolve ? "bg-success/15" : "bg-info/15"}`}>
              {isResolve
                ? <CheckCircle2 className="w-5 h-5 text-success" />
                : <ArrowUpRight className="w-5 h-5 text-info" />
              }
            </div>
            <h2 className="text-base font-semibold text-foreground">{copy.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{copy.description}</p>
        {grievanceType && (
          <p className="text-xs text-foreground/80 mt-2">
            Case: <span className="font-medium">{grievanceType}</span>
          </p>
        )}
        <div className="flex gap-2 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-medium disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 ${
              isResolve ? "bg-success text-white hover:bg-success/90" : "bg-info text-white hover:bg-info/90"
            }`}
          >
            {isPending
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : copy.confirmLabel
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function formatSlaDeadline(date?: string | Date): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function SlaSettingsModal({ open, onClose, canEdit }: { open: boolean; onClose: () => void; canEdit: boolean }) {
  const { data, isLoading } = useSlaSettings(open);
  const updateSla = useUpdateSlaSettings();
  const [mode, setMode] = useState<"common" | "separate">("common");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [l1Hours, setL1Hours] = useState("");
  const [l1Minutes, setL1Minutes] = useState("");
  const [l2Hours, setL2Hours] = useState("");
  const [l2Minutes, setL2Minutes] = useState("");
  const [l3Hours, setL3Hours] = useState("");
  const [l3Minutes, setL3Minutes] = useState("");

  const config = data?.config;
  const lastEditedBy = data?.lastEditedBy;
  const changeHistory = data?.changeHistory || [];

  const toDisplay = (v?: number | null) => (v != null && v > 0 ? String(v) : "");

  useEffect(() => {
    if (config) {
      setMode(config.mode === "separate" ? "separate" : "common");
      setHours(toDisplay(config.hours));
      setMinutes(toDisplay(config.minutes));
      setL1Hours(toDisplay(config.l1Hours));
      setL1Minutes(toDisplay(config.l1Minutes));
      setL2Hours(toDisplay(config.l2Hours));
      setL2Minutes(toDisplay(config.l2Minutes));
      setL3Hours(toDisplay(config.l3Hours));
      setL3Minutes(toDisplay(config.l3Minutes));
    }
  }, [config]);

  const parseField = (v: string) => (v.trim() === "" ? null : Number(v));

  const validateTier = (label: string, h: number | null, m: number | null) => {
    if (h == null && m == null) return `Enter hours or minutes for ${label}.`;
    if ((h != null && (Number.isNaN(h) || h < 0)) || (m != null && (Number.isNaN(m) || m < 0))) {
      return "Enter valid numbers for hours and minutes.";
    }
    if ((h || 0) * 60 + (m || 0) <= 0) return `${label} SLA must be greater than zero.`;
    return null;
  };

  const handleSave = () => {
    if (mode === "common") {
      const h = parseField(hours);
      const m = parseField(minutes);
      const err = validateTier("Common", h, m);
      if (err) { toast.error(err); return; }
      updateSla.mutate(
        { mode: "common", hours: h ?? 0, minutes: m ?? 0 },
        { onSuccess: onClose }
      );
      return;
    }

    const tiers = [
      { label: "L1", h: parseField(l1Hours), m: parseField(l1Minutes) },
      { label: "L2", h: parseField(l2Hours), m: parseField(l2Minutes) },
      { label: "L3", h: parseField(l3Hours), m: parseField(l3Minutes) },
    ];
    for (const t of tiers) {
      const err = validateTier(t.label, t.h, t.m);
      if (err) { toast.error(err); return; }
    }
    updateSla.mutate(
      {
        mode: "separate",
        l1Hours: parseField(l1Hours) ?? 0,
        l1Minutes: parseField(l1Minutes) ?? 0,
        l2Hours: parseField(l2Hours) ?? 0,
        l2Minutes: parseField(l2Minutes) ?? 0,
        l3Hours: parseField(l3Hours) ?? 0,
        l3Minutes: parseField(l3Minutes) ?? 0,
      },
      { onSuccess: onClose }
    );
  };

  const timeFields = (
    hVal: string,
    setH: (v: string) => void,
    mVal: string,
    setM: (v: string) => void
  ) => (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="text-xs text-muted-foreground">Hours</label>
        <input
          type="number"
          min={0}
          disabled={!canEdit}
          value={hVal}
          placeholder="Enter hours"
          onChange={(e) => setH(e.target.value)}
          className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary disabled:opacity-60 placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="flex-1">
        <label className="text-xs text-muted-foreground">Minutes</label>
        <input
          type="number"
          min={0}
          max={59}
          disabled={!canEdit}
          value={mVal}
          placeholder="Enter minutes"
          onChange={(e) => setM(e.target.value)}
          className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary disabled:opacity-60 placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="SLA Time Settings">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          New grievances start at Station HQ L1. If not resolved within the SLA, cases auto-escalate Station HQ → Headquarter → Area (L1 at each tier).
        </p>

        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">SLA mode</p>
          <div className="flex flex-col sm:flex-row gap-2">
            {([
              { id: "common" as const, label: "Common", desc: "Same time at every level" },
              { id: "separate" as const, label: "Separate", desc: "Different time per L1 / L2 / L3" },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={!canEdit}
                onClick={() => setMode(opt.id)}
                className={`flex-1 text-left rounded-lg border px-3 py-2.5 transition-colors disabled:opacity-60 ${
                  mode === opt.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-sm font-medium block">{opt.label}</span>
                <span className="text-xs opacity-80">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="h-24 bg-secondary/50 rounded-lg animate-pulse" />
        ) : mode === "common" ? (
          <div className="rounded-lg border border-border p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Common escalation SLA</p>
            <p className="text-xs text-muted-foreground">
              This duration applies at Station HQ, Headquarter, and Area phases before each escalation step.
            </p>
            {timeFields(hours, setHours, minutes, setMinutes)}
          </div>
        ) : (
          <div className="space-y-3">
            {([
              { label: "Station HQ SLA", h: l1Hours, setH: setL1Hours, m: l1Minutes, setM: setL1Minutes, note: "Before auto-escalate to Headquarter L1" },
              { label: "Headquarter SLA", h: l2Hours, setH: setL2Hours, m: l2Minutes, setM: setL2Minutes, note: "Before auto-escalate to Area L1" },
              { label: "Area SLA", h: l3Hours, setH: setL3Hours, m: l3Minutes, setM: setL3Minutes, note: "Final tier deadline" },
            ] as const).map((tier) => (
              <div key={tier.label} className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">{tier.label}</p>
                <p className="text-xs text-muted-foreground">{tier.note}</p>
                {timeFields(tier.h, tier.setH, tier.m, tier.setM)}
              </div>
            ))}
          </div>
        )}

        {lastEditedBy && (
          <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2.5 text-xs text-muted-foreground">
            Last edited by{" "}
            <span className="text-foreground font-medium">{lastEditedBy.name}</span>
            {lastEditedBy.role ? ` (${lastEditedBy.role})` : ""}
            {" · "}
            {new Date(lastEditedBy.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </div>
        )}

        {changeHistory.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary/30 transition-colors"
            >
              <span>Change history ({changeHistory.length})</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
            </button>
            {historyOpen && (
              <div className="border-t border-border max-h-48 overflow-y-auto divide-y divide-border">
                {changeHistory.map((entry, i) => (
                  <div key={`${entry.at}-${i}`} className="px-4 py-3 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{entry.changedBy.name}</span>
                      <span className="text-muted-foreground shrink-0">
                        {new Date(entry.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{entry.note}</p>
                    <p className="text-muted-foreground/80">
                      {entry.changedBy.role}
                      {entry.changedBy.rbacRole ? ` · ${entry.changedBy.rbacRole.replace("_", " ")}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg">Close</button>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={updateSla.isPending}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-60"
            >
              {updateSla.isPending ? "Saving…" : "Save SLA Settings"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function EscalateGrievanceModal({ grievance, onClose }: { grievance: any; onClose: () => void }) {
  const [escalationType, setEscalationType] = useState<"no_response" | "concern_pending">("no_response");
  const [note, setNote] = useState("");
  const grievanceId = grievance._id || grievance.id;
  const { data: preview, isLoading } = useEscalationPreview(grievanceId, Boolean(grievanceId));
  const manualEscalate = useManualEscalateGrievance();

  const handleEscalate = () => {
    if (!grievanceId || !preview?.canEscalate) return;
    manualEscalate.mutate(
      { id: grievanceId, escalationReasonType: escalationType, note: note.trim() || undefined },
      { onSuccess: onClose }
    );
  };

  return (
    <Modal open onClose={onClose} title={`Escalate — ${grievance.grievanceId || grievance.id}`}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="h-24 bg-secondary/50 rounded-lg animate-pulse" />
        ) : !preview?.canEscalate ? (
          <p className="text-sm text-muted-foreground">
            {preview?.fromLevel !== "L1"
              ? "Manual org-tier escalation is only available when the case is at L1 at the current tier."
              : "This case is already at Area tier and cannot be escalated further."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-secondary/20 p-3">
                <p className="text-xs text-muted-foreground mb-1">From (will no longer take action)</p>
                <p className="text-sm font-medium text-foreground">
                  {orgTierLabel(preview.fromOrgTier)} {preview.fromLevel} — {preview.fromOfficerName}
                </p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground mb-1">To (will take action)</p>
                <p className="text-sm font-medium text-foreground">
                  {orgTierLabel(preview.toOrgTier || undefined)} {preview.toLevel} — {preview.toOfficerName}
                </p>
              </div>
            </div>

            <FormField label="Escalation type">
              <SelectField
                value={escalationType}
                onChange={(v) => setEscalationType(v as "no_response" | "concern_pending")}
              >
                {(preview.escalationTypes || []).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="Additional note (optional)">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Optional note for the escalation record..."
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none"
              />
            </FormField>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg">Cancel</button>
          {preview?.canEscalate && (
            <button
              onClick={handleEscalate}
              disabled={manualEscalate.isPending}
              className="px-4 py-2 text-sm bg-destructive text-white rounded-lg flex items-center gap-2 disabled:opacity-60"
            >
              {manualEscalate.isPending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              Escalate to {orgTierLabel(preview.toOrgTier || undefined)} {preview.toLevel}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ViewDetailsModal({ grievance: initialGrievance, onClose }: { grievance:any; onClose:()=>void }) {
  const [note, setNote] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [includeGeneral, setIncludeGeneral] = useState(true);
  const [selectedUploadIds, setSelectedUploadIds] = useState<string[]>([]);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [concernOpen, setConcernOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ status: string; label: string } | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const updateStatus = useUpdateGrievanceStatus();
  const addComment = useAddComment();
  const resolveConcern = useResolveConcern();
  const requestEscalation = useRequestEscalationTakeover();
  const requestUpperTier = useRequestEscalateToUpperTier();
  const approveEscalation = useApproveEscalationRequest();
  const rejectEscalation = useRejectEscalationRequest();
  const { user } = useAuth();
  const permissions = usePermissions();

  const { data: liveGrievance, isLoading: detailLoading } = useGrievance(initialGrievance._id || "");
  const grievance = liveGrievance || initialGrievance;
  const submittedDocs: any[] = grievance.submittedDocuments || [];
  const concernStatus: string = getEffectiveConcernStatus(grievance);
  const concernBlocking = isConcernBlocking(concernStatus);
  const awaitingVeteran = concernStatus === "awaiting_veteran";
  const awaitingOfficer = concernStatus === "awaiting_officer";
  const isResolvedCase = grievance.status === "resolved" || grievance.status === "closed";
  const userLevel = user?.level;
  const assignedLevel = grievance.assignedLevel || "L1";
  const assignedOrgTier = grievance.assignedOrgTier || "station";
  const canAct = canActOnGrievance(user, grievance);
  const pendingRequest = grievance.pendingEscalationRequest;
  const sameStation =
    user?.stationId && grievance.stationId && String(user.stationId) === String(grievance.stationId);
  const sameHq =
    user?.hqId && grievance.hqId && String(user.hqId) === String(grievance.hqId);
  const nextUpperTier = assignedOrgTier === "station" ? "hq" : assignedOrgTier === "hq" ? "area" : null;
  const canRequestUpperTier =
    !isResolvedCase &&
    nextUpperTier &&
    pendingRequest?.status !== "pending" &&
    ((assignedOrgTier === "station" && user?.role === "station_hq" && sameStation) ||
      (assignedOrgTier === "hq" && userLevel === "L1" && user?.role === "headquarter" && sameHq));
  const canRequestTakeover =
    assignedOrgTier === "station" &&
    sameStation &&
    user?.role === "station_hq" &&
    (userLevel === "L2" || userLevel === "L3") &&
    assignedLevel === "L1" &&
    !isResolvedCase &&
    pendingRequest?.status !== "pending";
  const canApproveRequest =
    pendingRequest?.status === "pending" &&
    (user?.role === "super_admin" ||
      (assignedOrgTier === "station" &&
        userLevel === "L1" &&
        grievance.officerId &&
        String(grievance.officerId) === String(user?.id)));

  const selectedDocs = useMemo(
    () => submittedDocs.filter((d: any) => selectedUploadIds.includes(d.uploadId)),
    [submittedDocs, selectedUploadIds]
  );

  const toggleDocSelection = (uploadId: string) => {
    setSelectedUploadIds((prev) =>
      prev.includes(uploadId) ? prev.filter((id) => id !== uploadId) : [...prev, uploadId]
    );
  };

  const addNote = useCallback(async () => {
    if (!note.trim() || !grievance._id) return;
    if (isResolvedCase) {
      toast.error("This grievance is resolved. Concerns cannot be raised.");
      return;
    }
    if (!includeGeneral && selectedUploadIds.length === 0) {
      toast.error("Select general details and/or at least one document.");
      return;
    }

    const concernScope =
      includeGeneral && selectedUploadIds.length > 0
        ? "both"
        : includeGeneral
          ? "general"
          : "document";

    const payload: Record<string, unknown> = {
      id: grievance._id,
      message: note,
      authorName: user?.name || "Admin",
      authorRole: user?.role || "admin",
      concernScope,
      includeGeneral,
      documentUploadIds: selectedUploadIds,
    };

    try {
      if (noteFiles.length > 0) {
        const formData = new FormData();
        formData.append("id", payload.id as string);
        formData.append("message", payload.message as string);
        formData.append("authorName", payload.authorName as string);
        formData.append("authorRole", payload.authorRole as string);
        formData.append("concernScope", payload.concernScope as string);
        formData.append("includeGeneral", String(includeGeneral));
        formData.append("documentUploadIds", JSON.stringify(selectedUploadIds));
        noteFiles.forEach((file) => formData.append("attachments", file));
        await addComment.mutateAsync(formData as any);
      } else {
        await addComment.mutateAsync(payload);
      }
      setNote("");
      setNoteFiles([]);
      setIncludeGeneral(true);
      setSelectedUploadIds([]);
      toast.success(
        concernScope === "both"
          ? "Concern raised on details and documents"
          : concernScope === "document"
            ? `Concern raised on ${selectedUploadIds.length} document(s)`
            : "General concern raised"
      );
    } catch {
      /* toast handled in hook */
    }
  }, [note, noteFiles, includeGeneral, selectedUploadIds, grievance._id, isResolvedCase, addComment, user]);

  const sortedTimeline = useMemo(
    () =>
      [...(grievance.timeline || [])].sort(
        (a: any, b: any) =>
          new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()
      ),
    [grievance.timeline]
  );

  const resolveFileUrl = (url: string) => {
    const baseUrl = getApiBaseUrl().replace("/api", "");
    return url.startsWith("http") ? url : `${baseUrl}${url}`;
  };

  const timelineEventLabel = (t: any) => {
    const docs = getConcernDocuments(t);
    if (t.eventType === "concern") {
      return timelineConcernLabel(t.concernScope, docs);
    }
    if (t.eventType === "concern_resolved") return "Concern Resolved";
    if (t.eventType === "veteran_response") {
      return veteranResponseLabel(t.concernScope, docs);
    }
    if (t.eventType === "escalation") return "Auto Escalation";
    if (t.eventType === "escalation_request") return "Escalation Request";
    return t.status?.replace("-", " ") || "Update";
  };

  const timelineEventBadge = (t: any) => {
    if (t.eventType === "concern") return "bg-warning/15 text-warning";
    if (t.eventType === "concern_resolved") return "bg-success/15 text-success";
    if (t.eventType === "veteran_response") return "bg-success/15 text-success";
    return statusBadge[t.status] || "bg-secondary text-foreground";
  };

  const nextStatus: Record<string, {label:string;status:string;cls:string}|null> = {
    pending: { label:"Start Processing", status:"in-progress", cls:"bg-info/15 text-info hover:bg-info/25" },
    "in-progress": { label:"Mark Resolved", status:"resolved", cls:"bg-success/15 text-success hover:bg-success/25" },
    escalated: { label:"Mark Resolved", status:"resolved", cls:"bg-success/15 text-success hover:bg-success/25" },
    resolved: null,
  };
  const action = nextStatus[grievance.status];

  const confirmStatusUpdate = () => {
    if (!statusConfirm) return;
    updateStatus.mutate(
      {
        id: grievance._id || grievance.id,
        status: statusConfirm.status,
        officerName: user?.name,
      },
      {
        onSuccess: () => {
          setStatusConfirm(null);
          onClose();
        },
      }
    );
  };

  return (
    <>
    <Modal open onClose={onClose} title={`${grievance.grievanceId || grievance.id} — ${grievance.type}`} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusBadge[grievance.status]}`}>{grievance.status}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${priorityBadge[grievance.priority]}`}>{grievance.priority} priority</span>
          {concernBlocking && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${concernStatusBadge(concernStatus)}`}>
              {concernStatusText(concernStatus)}
            </span>
          )}
          {awaitingOfficer && concernBlocking && !isResolvedCase && canAct && (
            <button
              type="button"
              onClick={() => resolveConcern.mutate({ id: grievance._id, officerName: user?.name })}
              disabled={resolveConcern.isPending}
              className="text-xs px-3 py-1 rounded-full font-medium transition-colors ml-auto bg-success/15 text-success hover:bg-success/25 border border-success/30 flex items-center gap-1.5 disabled:opacity-60"
            >
              {resolveConcern.isPending
                ? <span className="w-3 h-3 border-2 border-success/30 border-t-success rounded-full animate-spin" />
                : <><CheckCircle2 className="w-3.5 h-3.5" /> Resolve Concern</>
              }
            </button>
          )}
          {action && permissions.updateGrievanceStatus && canAct && !concernBlocking && (
            <button
              type="button"
              onClick={() => setStatusConfirm({ status: action.status, label: action.label })}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ml-auto ${action.cls}`}
            >
              {action.label}
            </button>
          )}
        </div>
        {!canAct && user?.role !== "super_admin" && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-xs text-muted-foreground">
            <Eye className="w-4 h-4 shrink-0 mt-0.5" />
            <p>View-only access. Only the assigned officer ({grievance.officerName || "—"}) can take action on this case.</p>
          </div>
        )}
        {awaitingVeteran && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-foreground">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p>
              An open concern is waiting for the veteran. Status changes are blocked until the concern is resolved.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon:User, label:"Veteran", value: getVeteranDisplay(grievance.veteranName || grievance.veteran) || "—" },
            { icon:Tag, label:"Army No.", value:grievance.veteranArmyNo || grievance.armyNo || "—" },
            { icon:Building2, label:"Station", value:grievance.stationName || grievance.station },
            { icon:UserCheck, label:"Assigned Officer", value:`${grievance.officerName || grievance.officer}${assignedLevel ? ` (${orgTierLabel(assignedOrgTier)} ${assignedLevel})` : ""}` },
            { icon:Clock, label:"SLA Deadline", value: formatSlaDeadline(grievance.slaTierDeadline || grievance.slaDeadline) },
            { icon:Clock, label:"Filed On", value:grievance.createdAt ? new Date(grievance.createdAt).toLocaleDateString("en-IN") : grievance.date },
            { icon:User, label:"Contact", value:grievance.veteranPhone || grievance.contact || "—" },
          ].map(({ icon:Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5 bg-secondary/30 rounded-lg p-3">
              <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium text-foreground mt-0.5">{value}</p></div>
            </div>
          ))}
        </div>
        {pendingRequest?.status === "pending" && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">
              Escalation request from {pendingRequest.requestedByOfficerName} ({pendingRequest.requestedByLevel})
            </p>
            {pendingRequest.reason && (
              <p className="text-xs text-muted-foreground">{pendingRequest.reason}</p>
            )}
            {canApproveRequest && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => approveEscalation.mutate(grievance._id)}
                  disabled={approveEscalation.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg bg-success/15 text-success hover:bg-success/25 disabled:opacity-60"
                >
                  Approve — assign to {pendingRequest.requestedByOfficerName} ({pendingRequest.requestedByLevel})
                </button>
                <button
                  type="button"
                  onClick={() => rejectEscalation.mutate(grievance._id)}
                  disabled={rejectEscalation.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
        {canRequestUpperTier && (
          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Request escalation to {orgTierLabel(nextUpperTier!)} L1</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Case will move immediately to {orgTierLabel(nextUpperTier!)} L1 officer (no approval needed).
              </p>
            </div>
            <textarea
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              rows={2}
              placeholder="Reason for escalation (optional)..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs outline-none focus:border-primary placeholder:text-muted-foreground resize-none"
            />
            <button
              type="button"
              onClick={() =>
                requestUpperTier.mutate(
                  {
                    id: grievance._id,
                    reason: requestReason.trim() || `${user?.name} requested escalation to ${orgTierLabel(nextUpperTier!)} L1`,
                  },
                  { onSuccess: () => setRequestReason("") }
                )
              }
              disabled={requestUpperTier.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 disabled:opacity-60 flex items-center gap-1.5 w-fit"
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Escalate to {orgTierLabel(nextUpperTier!)} L1
            </button>
          </div>
        )}
        {canRequestTakeover && (
          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Request case escalation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send request to L1. If approved, case is assigned to you ({userLevel}) immediately.
              </p>
            </div>
            <textarea
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              rows={2}
              placeholder="Reason for requesting this case (optional)..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs outline-none focus:border-primary placeholder:text-muted-foreground resize-none"
            />
            <button
              type="button"
              onClick={() =>
                requestEscalation.mutate(
                  {
                    id: grievance._id,
                    reason: requestReason.trim() || `${user?.name} (${userLevel}) requested takeover`,
                  },
                  { onSuccess: () => setRequestReason("") }
                )
              }
              disabled={requestEscalation.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-60 flex items-center gap-1.5 w-fit"
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Request L1 approval
            </button>
          </div>
        )}
        {grievance.description && (
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm text-foreground break-words overflow-hidden">{grievance.description}</p>
          </div>
        )}
        {submittedDocs.length > 0 ? (
          <CollapsiblePanel
            title={`Submitted Documents (${grievance.type})`}
            icon={Paperclip}
            open={documentsOpen}
            onToggle={() => setDocumentsOpen((v) => !v)}
            count={submittedDocs.length}
          >
            <div className="space-y-2">
              {submittedDocs.map((doc: any) => {
                const fullUrl = resolveFileUrl(doc.fileUrl);
                const isPdf = doc.mimeType === "application/pdf" || doc.fileUrl.toLowerCase().includes(".pdf");
                return (
                  <div key={doc.uploadId} className="flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3">
                    <div className="flex-shrink-0">
                      {isPdf ? (
                        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-16 h-16 bg-secondary rounded-lg border border-border">
                          <img src="/icons/pdf2.svg" className="w-8 h-8" alt="" />
                        </a>
                      ) : (
                        <img src={fullUrl} alt="" onClick={() => setPreviewImage(fullUrl)} className="w-16 h-16 object-cover rounded-lg border border-border cursor-pointer hover:border-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-primary">{doc.documentLabel}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{doc.documentText}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">{doc.originalFileName}</p>
                    </div>
                    <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">View</a>
                  </div>
                );
              })}
            </div>
          </CollapsiblePanel>
        ) : grievance.attachments && grievance.attachments.length > 0 ? (
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Complaint Attachments</p>
            <div className="flex flex-wrap gap-3">
              {grievance.attachments.map((url: string, idx: number) => {
                const isPdf = url.toLowerCase().endsWith(".pdf");
                const fullUrl = resolveFileUrl(url);
                return isPdf ? (
                  <a key={idx} href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-24 h-24 bg-secondary rounded-lg border border-border hover:border-primary transition-colors text-primary flex-col gap-2">
                    <img src="/icons/pdf2.svg" className="w-12 h-12" />
                    <span className="text-xs font-medium text-[#ffff] invert dark:invert-0">PDF Document</span>
                  </a>
                ) : (
                  <img key={idx} src={fullUrl} alt={`Attachment ${idx + 1}`} onClick={() => setPreviewImage(fullUrl)} className="w-24 h-24 object-cover rounded-lg border border-border cursor-pointer hover:border-primary transition-all hover:scale-105 shadow-sm" />
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <CollapsiblePanel
            title="Timeline"
            icon={Clock}
            open={timelineOpen}
            onToggle={() => setTimelineOpen((v) => !v)}
            count={sortedTimeline.length}
          >
            {detailLoading && (
              <p className="text-xs text-muted-foreground italic mb-2">Refreshing...</p>
            )}
            {sortedTimeline.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No activity yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {sortedTimeline.map((t: any, i: number) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-2.5 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${timelineEventBadge(t)}`}>
                        {timelineEventLabel(t)}
                      </span>
                    </div>
                    {t.documentLabel && !t.concernDocuments?.length && t.concernScope !== "general" && (
                      <p className="text-[11px] text-primary font-medium mb-1">Document: {t.documentLabel}</p>
                    )}
                    {t.concernDocuments?.length > 0 && (
                      <div className="text-[11px] text-primary font-medium mb-1 space-y-0.5">
                        {t.concernDocuments.map((d: any, di: number) => (
                          <p key={di}>Document: {d.documentLabel}</p>
                        ))}
                      </div>
                    )}
                    {t.note && <p className="text-sm text-foreground whitespace-pre-wrap">{t.note}</p>}
                    {t.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {t.attachments.map((url: string, idx: number) => {
                          const fullUrl = resolveFileUrl(url);
                          const isPdf = url.toLowerCase().includes(".pdf");
                          return isPdf ? (
                            <a key={idx} href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1.5 bg-secondary rounded-lg border border-border text-xs text-primary">
                              <FileText className="w-3.5 h-3.5" /> PDF
                            </a>
                          ) : (
                            <img key={idx} src={fullUrl} alt="" onClick={() => setPreviewImage(fullUrl)} className="w-16 h-16 object-cover rounded-lg border border-border cursor-pointer hover:border-primary" />
                          );
                        })}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{t.updatedBy} · {t.updatedAt ? new Date(t.updatedAt).toLocaleString("en-IN") : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </CollapsiblePanel>

          <CollapsiblePanel
            title="Raise a Concern"
            icon={MessageSquare}
            open={concernOpen}
            onToggle={() => setConcernOpen((v) => !v)}
          >
            {isResolvedCase ? (
              <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm text-foreground">
                <p className="font-semibold text-success mb-1">Grievance resolved</p>
                <p className="text-xs text-muted-foreground">
                  This case is closed. Officers cannot raise new concerns after resolution.
                </p>
              </div>
            ) : !canAct ? (
              <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                View-only — only the assigned officer can raise concerns on this case.
              </div>
            ) : awaitingVeteran ? (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-foreground">
                <p className="font-semibold text-warning mb-1">Waiting for veteran</p>
                <p className="text-xs text-muted-foreground">
                  A concern is open and sent to the veteran. You cannot raise another concern or change case status until they respond.
                </p>
              </div>
            ) : (
            <div className="space-y-3">

            <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/20 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeGeneral}
                onChange={(e) => setIncludeGeneral(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <div>
                <p className="text-sm font-medium text-foreground">General details need correction</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Veteran will re-enter station, rank, army no., description (Step 1).
                </p>
              </div>
            </label>

            {submittedDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Documents with issues {selectedUploadIds.length > 0 && `(${selectedUploadIds.length} selected)`}
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2 bg-secondary/10">
                  {submittedDocs.map((doc: any) => {
                    const checked = selectedUploadIds.includes(doc.uploadId);
                    return (
                      <label
                        key={doc.uploadId}
                        className={`flex items-start gap-2.5 rounded-lg p-2.5 cursor-pointer transition-colors ${
                          checked ? "bg-warning/10 border border-warning/30" : "hover:bg-secondary/40 border border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDocSelection(doc.uploadId)}
                          className="mt-0.5 rounded border-border shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{doc.documentLabel}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{doc.originalFileName}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Select all documents the veteran must re-upload. You can combine with general details above.
                </p>
              </div>
            )}

            {selectedDocs.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-foreground">
                <p className="font-semibold text-warning mb-1">
                  {selectedDocs.length} document{selectedDocs.length > 1 ? "s" : ""} flagged
                </p>
                <p className="text-muted-foreground">
                  {selectedDocs.map((d: any) => d.documentLabel).join(" · ")}
                </p>
              </div>
            )}

            <FormField label="Concern note">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Explain what is wrong — e.g. wrong DOB on certificate, incorrect army number, multiple documents unclear..."
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground resize-none"
              />
            </FormField>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Reference attachment (optional)</p>
              {noteFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {noteFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-secondary/50 rounded px-2 py-1">
                      {file.type === "application/pdf"
                        ? <FileText className="w-3 h-3 text-primary" />
                        : <ImageIcon className="w-3 h-3 text-primary" />
                      }
                      <span className="text-xs text-foreground truncate max-w-[120px]">{file.name}</span>
                      <button onClick={() => setNoteFiles((f) => f.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <label className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground cursor-pointer shrink-0" title="Attach reference file">
                  <Paperclip className="w-4 h-4" />
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).slice(0, 3);
                      setNoteFiles((prev) => [...prev, ...files].slice(0, 3));
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={addNote}
                  disabled={
                    addComment.isPending ||
                    !note.trim() ||
                    (!includeGeneral && selectedUploadIds.length === 0)
                  }
                  className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 text-sm font-medium"
                >
                  {addComment.isPending
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Send className="w-4 h-4" /> Send Concern</>
                  }
                </button>
              </div>
            </div>
            </div>
            )}
          </CollapsiblePanel>
        </div>
      </div>
      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </Modal>
    {statusConfirm && (
      <StatusConfirmModal
        grievanceId={grievance.grievanceId || grievance.id}
        grievanceType={grievance.type}
        nextStatus={statusConfirm.status}
        onClose={() => setStatusConfirm(null)}
        onConfirm={confirmStatusUpdate}
        isPending={updateStatus.isPending}
      />
    )}
    </>
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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const perms = usePermissions();
  const { user } = useAuth();
  const canAct = canActOnGrievance(user, grievance);
  const openConcern = isConcernBlocking(getEffectiveConcernStatus(grievance));

  const actions = [
    { label:"View Details", icon:Eye, onClick:()=>{onView();setOpen(false);} },
    ...(perms.updateGrievanceStatus && canAct && !openConcern && grievance.status==="pending"? [{label:"Start Processing", icon:ArrowUpRight, onClick:()=>{onStatusChange("in-progress");setOpen(false);}}]: []),
    ...(perms.escalateGrievance && canAct && !openConcern && grievance.status!=="resolved" && grievance.status!=="escalated"? [{label:"Escalate", icon:AlertTriangle, onClick:()=>{onEscalate();setOpen(false);}}]: []),
    ...(perms.updateGrievanceStatus && canAct && !openConcern && (grievance.status==="in-progress" || grievance.status==="escalated")? [{label:"Mark Resolved", icon:CheckCircle2, onClick:()=>{onStatusChange("resolved");setOpen(false);} }]: []),
    ...(perms.reassignOfficer && grievance.status !== "resolved"? [{
      label: grievance.officerName === "Unassigned" || !grievance.officerName ? "Assign Officer" : "Reassign Officer",
      icon: UserCheck,
      onClick: () => { onAssign(); setOpen(false); },
    }] : []),
    { label:"Print Case", icon:Printer, onClick:()=>{window.print();setOpen(false);} },
  ];

  const MENU_WIDTH = 176;
  const ITEM_HEIGHT = 36;
  const MENU_PADDING = 8;

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const menuHeight =
      menuRef.current?.offsetHeight ?? actions.length * ITEM_HEIGHT + MENU_PADDING;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < menuHeight + gap && spaceAbove > spaceBelow;

    let top = openUpward ? rect.top - menuHeight - gap : rect.bottom + gap;
    let left = rect.right - MENU_WIDTH;

    top = Math.max(gap, Math.min(top, window.innerHeight - menuHeight - gap));
    left = Math.max(gap, Math.min(left, window.innerWidth - MENU_WIDTH - gap));

    setMenuPos({ top, left });
  }, [actions.length]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const raf = requestAnimationFrame(updateMenuPosition);
    const onReposition = () => updateMenuPosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, updateMenuPosition]);

  const handleToggle = () => {
    if (!open) {
      const btn = buttonRef.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const menuHeight = actions.length * ITEM_HEIGHT + MENU_PADDING;
        const gap = 6;
        const openUpward =
          window.innerHeight - rect.bottom < menuHeight + gap && rect.top > window.innerHeight - rect.bottom;
        const top = openUpward ? rect.top - menuHeight - gap : rect.bottom + gap;
        const left = Math.max(gap, rect.right - MENU_WIDTH);
        setMenuPos({ top, left });
      }
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && menuPos && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} aria-hidden />
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
            className="z-[101] bg-card border border-border rounded-xl shadow-xl py-1"
          >
            {actions.map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                role="menuitem"
                onClick={onClick}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors text-left"
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
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
  const [statusConfirm, setStatusConfirm] = useState<{ grievance: any; status: string } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [showSlaSettings, setShowSlaSettings] = useState(false);

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
    setStatusConfirm({ grievance: g, status });
  }, []);

  const confirmListStatusChange = useCallback(() => {
    if (!statusConfirm?.grievance._id) return;
    updateStatus.mutate(
      {
        id: statusConfirm.grievance._id,
        status: statusConfirm.status,
        officerName: user?.name,
      },
      { onSuccess: () => setStatusConfirm(null) }
    );
  }, [statusConfirm, updateStatus, user]);

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
          {permissions.viewSlaSettings && (
            <button
              onClick={() => setShowSlaSettings(true)}
              className="px-4 py-2 text-sm bg-secondary/50 text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2"
            >
              <Clock className="w-4 h-4" /> SLA Time
            </button>
          )}
          {permissions.exportReports && (
            <div className="relative">
              <button onClick={()=>setExportOpen((o)=>!o)} className="px-4 py-2 text-sm bg-secondary/50 text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" /> Export <ChevronDown className="w-4 h-4 " />
              </button>
              {exportOpen && (<><div className="fixed inset-0 z-10" onClick={()=>setExportOpen(false)}/><div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-xl shadow-xl py-1 w-40">
                <button onClick={()=>{const c=toCSV(grievances);const b=new Blob([c],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`grievances-${Date.now()}.csv`;a.click();setExportOpen(false);}} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60"><FileText className="w-3.5 h-3.5 text-muted-foreground"/>Export CSV</button>
                <button onClick={()=>{const b=new Blob([JSON.stringify(grievances,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`grievances-${Date.now()}.json`;a.click();setExportOpen(false);}} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60"><FileText className="w-3.5 h-3.5 text-muted-foreground"/>Export JSON</button>
              </div></>)}
            </div>
          )}
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
                  <td className="py-3 px-3 text-sm text-foreground">{getVeteranDisplay(g.veteranName || g.veteran) || "—"}</td>
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
      {statusConfirm && (
        <StatusConfirmModal
          grievanceId={statusConfirm.grievance.grievanceId || statusConfirm.grievance.id}
          grievanceType={statusConfirm.grievance.type}
          nextStatus={statusConfirm.status}
          onClose={() => setStatusConfirm(null)}
          onConfirm={confirmListStatusChange}
          isPending={updateStatus.isPending}
        />
      )}
      {showNewGrievance && <NewGrievanceModal onClose={()=>setShowNewGrievance(false)}/>}
      {showFilter && <FilterModal/>}
      <SlaSettingsModal
        open={showSlaSettings}
        onClose={() => setShowSlaSettings(false)}
        canEdit={permissions.manageSlaSettings}
      />
      {escalateGrievance && (
        <EscalateGrievanceModal grievance={escalateGrievance} onClose={() => setEscalateGrievance(null)} />
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
