import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRBACStore, DEFAULT_PERMISSIONS } from "@/stores/rbac";

/** Loads role permission matrix from API when an admin session is active. */
export default function RBACHydrator() {
  const { isAdmin, user } = useAuth();
  const fetchPermissions = useRBACStore((s) => s.fetchPermissions);

  useEffect(() => {
    const hasToken = !!localStorage.getItem("vitric_admin_token");
    if (isAdmin && hasToken && user?.id) {
      fetchPermissions();
    } else {
      useRBACStore.setState({ loaded: false, permissions: DEFAULT_PERMISSIONS });
    }
  }, [isAdmin, user?.id, fetchPermissions]);

  // Re-load permissions when tab regains focus (e.g. after Super Admin changed toggles)
  useEffect(() => {
    if (!isAdmin) return;
    const onFocus = () => {
      if (localStorage.getItem("vitric_admin_token")) fetchPermissions();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAdmin, fetchPermissions]);

  return null;
}
