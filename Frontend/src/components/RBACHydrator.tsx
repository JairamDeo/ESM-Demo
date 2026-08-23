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
      if (!useRBACStore.getState().loaded) fetchPermissions();
    } else {
      useRBACStore.setState({ loaded: false, permissions: DEFAULT_PERMISSIONS });
    }
  }, [isAdmin, user?.id, fetchPermissions]);

  return null;
}
