import { useState, useCallback, memo, Fragment } from "react";
import { Settings, Bell, Shield, Globe, Clock, Users, ChevronDown, ChevronUp, RotateCcw, Check } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useRBACStore, type UserRole, type Permission, DEFAULT_PERMISSIONS } from "@/stores/rbac";
import { toast } from "sonner";

// ─── Permission display labels ────────────────────────────────────────────────
const PERMISSION_GROUPS: { label: string; perms: Array<{ key: keyof Permission; label: string; danger?: boolean }> }[] = [
  {
    label: "Dashboard",
    perms: [
      { key: "viewDashboard", label: "View dashboard" },
    ],
  },
  {
    label: "Grievances",
    perms: [
      { key: "viewGrievances",        label: "View grievances"                  },
      { key: "createGrievance",       label: "Submit new grievances"            },
      { key: "updateGrievanceStatus", label: "Update status / progress cases"   },
      { key: "escalateGrievance",     label: "Escalate cases"                   },
      { key: "reassignOfficer",       label: "Reassign officer on a case"       },
      { key: "deleteGrievance",       label: "Delete grievances", danger: true  },
    ],
  },
  {
    label: "Case Types",
    perms: [
      { key: "viewCaseTypes",   label: "View case types"         },
      { key: "manageCaseTypes", label: "Add / edit case types"   },
    ],
  },
  {
    label: "Station HQs",
    perms: [
      { key: "viewStations",   label: "View station HQs"                          },
      { key: "manageStations", label: "Add / edit / delete stations", danger: true },
    ],
  },
  {
    label: "QR Codes",
    perms: [
      { key: "viewQRCodes",   label: "View QR codes"                         },
      { key: "manageQRCodes", label: "Generate / toggle / delete QR codes"   },
    ],
  },
  {
    label: "Officers",
    perms: [
      { key: "viewOfficers",   label: "View officer list"                    },
      { key: "manageOfficers", label: "Add / edit / delete officers"         },
    ],
  },
  {
    label: "Escalations",
    perms: [
      { key: "viewEscalations",    label: "View escalations"    },
      { key: "resolveEscalations", label: "Resolve escalations" },
    ],
  },
  {
    label: "Reports",
    perms: [
      { key: "viewReports",   label: "View reports & analytics"    },
      { key: "exportReports", label: "Export reports (CSV / JSON)" },
    ],
  },
  {
    label: "Settings & System",
    perms: [
      { key: "viewSettings",   label: "View settings page"                              },
      { key: "manageSettings", label: "Change system settings",    danger: true         },
      { key: "manageRoles",    label: "Manage role permissions",   danger: true         },
      { key: "loginAsVeteran", label: "Use veteran portal (officer dual login)"         },
    ],
  },
];

// const ROLES: Array<{ key: UserRole; label: string; color: string }> = [
//   { key: "super_admin",    label: "Super Admin",      color: "bg-destructive/15 text-destructive" },
//   { key: "esm_officer",    label: "ESM Officer",      color: "bg-primary/15 text-primary" },
//   { key: "station_officer",label: "Station Officer",  color: "bg-info/15 text-info" },
//   { key: "record_office",  label: "Record Office",    color: "bg-warning/15 text-warning" },
// ];

const ROLES: Array<{ key: UserRole; label: string; color: string }> = [
  { key: "super_admin", label: "Super Admin", color: "bg-destructive/15 text-destructive" },
  { key: "area",        label: "Area",        color: "bg-primary/15 text-primary"         },
  { key: "headquarter", label: "Headquarter", color: "bg-info/15 text-info"               },
  { key: "station_hq",  label: "Station HQ",  color: "bg-warning/15 text-warning"         },
];

// ─── Toggle component ─────────────────────────────────────────────────────────
const Toggle = memo(({ value, onChange, disabled }: { value: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${value ? "bg-primary" : "bg-secondary border border-border"}`}
  >
    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${value ? "right-0.5" : "left-0.5"}`} />
  </button>
));

// ─── Role Permission Matrix ───────────────────────────────────────────────────
const RoleMatrix = memo(({ canEdit }: { canEdit: boolean }) => {
  const { permissions, updateRolePermission, resetRole } = useRBACStore();
  const [expandedGroup, setExpandedGroup] = useState<string | null>("Grievances");

  return (
    <div className="space-y-4">
      {/* Role headers */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground w-48">Permission</th>
              {ROLES.map((role) => (
                <th key={role.key} className="text-center py-2 px-3 min-w-[110px]">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${role.color}`}>{role.label}</span>
                    {canEdit && role.key !== "super_admin" && (
                      <button
                        onClick={() => { resetRole(role.key); toast.success(`${role.label} permissions reset`); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Reset
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <Fragment key={group.label}>
                {/* Group header row */}
                <tr
                  key={`group-${group.label}`}
                  className="cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedGroup(expandedGroup === group.label ? null : group.label)}
                >
                  <td colSpan={ROLES.length + 1} className="py-2.5 px-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {expandedGroup === group.label ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {group.label}
                    </div>
                  </td>
                </tr>
                {/* Permission rows */}
                {expandedGroup === group.label && group.perms.map((perm) => (
                  <tr key={`${group.label}-${perm.key}`} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                    <td className="py-2.5 pr-4 text-sm text-foreground pl-6">
                      {perm.label}
                      {perm.danger && <span className="ml-1.5 text-[10px] text-destructive font-medium">[sensitive]</span>}
                    </td>
                    {ROLES.map((role) => (
                      <td key={role.key} className="py-2.5 px-3 text-center">
                        <div className="flex justify-center">
                          <Toggle
                            value={permissions[role.key][perm.key]}
                            onChange={() => {
                              if (!canEdit) return;
                              if (role.key === "super_admin") return; // super_admin always all true
                              updateRolePermission(role.key, perm.key, !permissions[role.key][perm.key]);
                            }}
                            disabled={!canEdit || role.key === "super_admin"}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ─── Notification toggle row ──────────────────────────────────────────────────
const NotifRow = memo(({ label, defaultOn }: { label: string; defaultOn?: boolean }) => {
  const [on, setOn] = useState(defaultOn ?? true);
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <p className="text-sm text-foreground">{label}</p>
      <Toggle value={on} onChange={() => setOn(!on)} />
    </div>
  );
});

// ─── Escalation day editor ────────────────────────────────────────────────────
const EscalationRule = memo(({ label, defaultDays }: { label: string; defaultDays: number }) => {
  const [days, setDays] = useState(defaultDays);
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => setDays((d) => Math.max(1, d - 1))} className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 text-sm">−</button>
        <span className="text-sm font-bold text-primary w-16 text-center">{days} {days === 1 ? "day" : "days"}</span>
        <button onClick={() => setDays((d) => d + 1)} className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 text-sm">+</button>
      </div>
    </div>
  );
});

// ─── Main settings page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { resetAll } = useRBACStore();

  const isSuperAdmin = user?.role === "super_admin";
  const canManageRoles = user?.role === "super_admin";

  const handleResetAll = useCallback(() => {
    if (!canManageRoles) return;
    resetAll();
    toast.success("All role permissions reset to defaults");
  }, [canManageRoles, resetAll]);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">System configuration, notifications, and role-based access control</p>
      </div>

      {/* Current user badge */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <span className="text-primary font-bold">{(user?.name || "A")[0].toUpperCase()}</span>
        </div>
        <div>
          <p className="font-medium text-foreground">{user?.name || "Admin"}</p>
          <p className="text-xs text-muted-foreground">Logged in as <span className="text-primary font-medium">{user?.role?.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</span> · {user?.station || "HQ"}</p>
        </div>
        {isSuperAdmin && (
          <div className="ml-auto flex items-center gap-2 bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full font-medium">
            <Shield className="w-3.5 h-3.5" /> Super Admin
          </div>
        )}
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Appearance</h3>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Theme</p>
            <p className="text-xs text-muted-foreground">Toggle between dark and light mode</p>
          </div>
          <Toggle value={theme === "dark"} onChange={toggleTheme} />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Notifications</h3>
        </div>
        <NotifRow label="Email notifications for new grievances" defaultOn />
        <NotifRow label="SMS alerts for escalated cases" defaultOn />
        <NotifRow label="Daily digest report" defaultOn />
        <NotifRow label="Weekly summary to Sub-Area Commander" defaultOn />
        <NotifRow label="Auto-notify veteran on status change" defaultOn />
      </div>

      {/* Auto-Escalation */}
      {/* <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Auto-Escalation Rules</h3>
        </div>
        <div className="space-y-3">
          <EscalationRule label="Escalate to ESM Officer after" defaultDays={15} />
          <EscalationRule label="Escalate to Sub-Area Commander after" defaultDays={30} />
          <EscalationRule label="Send reminder to station officer after" defaultDays={7} />
        </div>
      </div> */}

      {/* Role-Based Access Control */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Role-Based Access Control</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {canManageRoles
                  ? "Configure what each officer role can do. Changes take effect immediately."
                  : "View current role permissions. Only Super Admin can modify these."}
              </p>
            </div>
          </div>
          {canManageRoles && (
            <button
              onClick={handleResetAll}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All
            </button>
          )}
        </div>

        {!canManageRoles && (
          <div className="mb-4 flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2.5 text-xs text-warning">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            Only the Super Admin can modify role permissions. You can view them here.
          </div>
        )}

        <RoleMatrix canEdit={canManageRoles} />

        {/* Note about veteran login */}
        <div className="mt-4 bg-info/10 border border-info/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">Veteran Login — No Separate Registration</p>
              <p className="text-xs text-muted-foreground mt-1">
                Officers added in the <strong>Officers</strong> tab can also login as veterans using their registered phone number via the ESM Portal. 
                Enable <em>"Use veteran portal"</em> permission above for the relevant roles. Veterans don't register separately — 
                the Super Admin adds them as officers with station assignment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">System Information</h3>
        </div>
        <div className="space-y-2 text-sm">
          {[
            ["Version", "1.0.0"],
            ["Region", "Nagpur Sub-Area"],
            ["Covering", "10 Station HQs (Maharashtra & Gujarat)"],
            ["SPARSH Integration", "Independent Module"],
            ["Case Types", "16 enabled"],
            ["Auto-escalation", "Enabled"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 border-b border-border last:border-0">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
