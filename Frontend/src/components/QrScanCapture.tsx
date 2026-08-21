import { memo, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { captureQrScanFromSearch } from "@/lib/qrScan";

/** Saves station/code from a scanned QR on any page so it survives login. */
export const QrScanCapture = memo(function QrScanCapture() {
  const { search } = useLocation();
  useEffect(() => {
    captureQrScanFromSearch(search);
  }, [search]);
  return null;
});

/** Public landing for printed QR URLs: /grievance?station=...&code=... */
export const QrScanEntry = memo(function QrScanEntry() {
  const { isAuthenticated, isUser } = useAuth();
  const hasUserToken = !!localStorage.getItem("vitric_user_token");
  if (hasUserToken || (isAuthenticated && isUser)) {
    return <Navigate to="/user" replace />;
  }
  return <Navigate to="/user/login" replace />;
});
