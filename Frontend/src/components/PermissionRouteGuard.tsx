import { Navigate, useLocation } from "react-router-dom";
import { usePermissions, type Permission } from "@/stores/rbac";

const ADMIN_ROUTE_PERMS: Array<{ path: string; perm: keyof Permission }> = [
  { path: "/", perm: "viewDashboard" },
  { path: "/grievances", perm: "viewGrievances" },
  { path: "/categories", perm: "viewCategories" },
  { path: "/case-types", perm: "viewCaseTypes" },
  { path: "/stations", perm: "viewStations" },
  { path: "/qr-codes", perm: "viewQRCodes" },
  { path: "/users", perm: "viewOfficers" },
  { path: "/escalations", perm: "viewEscalations" },
  { path: "/reports", perm: "viewReports" },
  { path: "/announcements", perm: "viewAnnouncements" },
  { path: "/settings", perm: "viewSettings" },
];

export function firstAllowedAdminPath(permissions: Permission): string | null {
  for (const { path, perm } of ADMIN_ROUTE_PERMS) {
    if (permissions[perm]) return path;
  }
  return null;
}

/** Blocks direct URL access when the user lacks the page view permission. */
export default function PermissionRouteGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const permissions = usePermissions();
  const rule = ADMIN_ROUTE_PERMS.find((r) => r.path === pathname);

  if (rule && !permissions[rule.perm]) {
    const fallback = firstAllowedAdminPath(permissions);
    // Never send logged-in admins to login (causes redirect loop with AdminLoginGuard)
    if (fallback && fallback !== pathname) {
      return <Navigate to={fallback} replace />;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <p className="text-lg font-semibold text-foreground">No access to this page</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Your role does not include permission to view this section. Ask a Super Admin to update role
          permissions in Settings, or try another menu item.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
