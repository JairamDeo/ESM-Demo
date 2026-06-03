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
  { path: "/settings", perm: "viewSettings" },
];

export function firstAllowedAdminPath(permissions: Permission): string {
  for (const { path, perm } of ADMIN_ROUTE_PERMS) {
    if (permissions[perm]) return path;
  }
  return "/admin/login";
}

/** Blocks direct URL access when the user lacks the page view permission. */
export default function PermissionRouteGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const permissions = usePermissions();
  const rule = ADMIN_ROUTE_PERMS.find((r) => r.path === pathname);

  if (rule && !permissions[rule.perm]) {
    return <Navigate to={firstAllowedAdminPath(permissions)} replace />;
  }

  return <>{children}</>;
}
