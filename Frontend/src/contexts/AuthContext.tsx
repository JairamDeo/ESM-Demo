import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import api, { setAuthToken, clearAuthToken, setStoredUser, getStoredUser } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { resolveRbacRole, type UserRole } from "@/lib/rbacRole";
import { registerPushDeviceOnLogin } from "@/lib/pushNotifications";
import { clearQrScan } from "@/lib/qrScan";

export type { UserRole };

export interface SendOtpResponse {
  expiresIn: number;
  resendAfter: number;
  smsSent?: boolean;
  devOtp?: string;
  devNote?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  jobRole?: string;
  station?: string;
  phone?: string;
  rank?: string;
  armyNumber?: string;
  stateId?: string;
  stateName?: string;
  hqId?: string;
  hqName?: string;
  stationId?: string;
  stationName?: string;
  level?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  adminLogin: (username: string, password: string) => Promise<void>;
  sendOtp: (phone: string) => Promise<SendOtpResponse>;
  verifyOtp: (phone: string, otp: string) => Promise<{ isNewUser: boolean }>;
  updateUser: (updates: Partial<AuthUser>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function schedulePushSync() {
  setTimeout(() => {
    registerPushDeviceOnLogin().catch(() => undefined);
  }, 800);
}

function normalizeAdminFromApi(admin: Record<string, unknown>): AuthUser {
  const rawRole = (admin.role ?? admin.rbacRole) as string | undefined;
  return {
    id: String(admin.id ?? admin._id ?? ""),
    name: String(admin.name ?? admin.username ?? "Admin"),
    email: admin.email as string | undefined,
    role: resolveRbacRole(rawRole) as UserRole,
    jobRole: admin.jobRole as string | undefined,
    station: admin.station as string | undefined,
    stateId: admin.stateId ? String(admin.stateId) : undefined,
    stateName: admin.stateName as string | undefined,
    hqId: admin.hqId ? String(admin.hqId) : undefined,
    hqName: admin.hqName as string | undefined,
    stationId: admin.stationId ? String(admin.stationId) : undefined,
    stationName: admin.stationName as string | undefined,
    level: admin.level as string | undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const path = window.location.pathname;
    const stored = path.startsWith("/user/") ? getStoredUser("user") : getStoredUser("admin");
    if (!stored) return null;
    if (stored.role === "user") return stored as AuthUser;
    return normalizeAdminFromApi(stored);
  });

  const adminLogin = useCallback(async (username: string, password: string) => {
    const res = await api.post("/auth/admin/login", { username, password });
    const { token, admin } = res.data;
    setAuthToken(token, "admin");         // ← pass "admin"
    const authUser = normalizeAdminFromApi(admin);
    setStoredUser(authUser, "admin");     // ← pass "admin"
    setUser(authUser);
    queryClient.clear();
    schedulePushSync();
  }, []);

  const sendOtp = useCallback(async (phone: string): Promise<SendOtpResponse> => {
    const { data } = await api.post("/auth/user/send-otp", { phone });
    return {
      expiresIn: data.expiresIn ?? 120,
      resendAfter: data.resendAfter ?? 30,
      smsSent: data.smsSent,
      devOtp: data.devOtp,
      devNote: data.devNote,
    };
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string): Promise<{ isNewUser: boolean }> => {
    const res = await api.post("/auth/user/verify-otp", { phone, otp });
    const { token, user: userInfo, isNewUser } = res.data;
    setAuthToken(token, "user");
    const authUser: AuthUser = {
      id: userInfo.id,
      name: userInfo.name || "",
      phone: userInfo.phone,
      role: "user",
      station: userInfo.stationHQ,
      rank: userInfo.rank || "",
      armyNumber: userInfo.armyNumber || userInfo.serviceNumber || "",
    };
    setStoredUser(authUser, "user");
    setUser(authUser);
    queryClient.clear();
    schedulePushSync();
    return { isNewUser: !!isNewUser };
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      // Persist the updated user to localStorage so it survives refresh
      const role = prev.role === "user" ? "user" : "admin";
      setStoredUser(merged, role);
      return merged;
    });
  }, []);

  const logout = useCallback(() => {
    const path = window.location.pathname;
    const role = path.startsWith("/user/") ? "user" : "admin";
    clearAuthToken(role);                 // ← pass correct role
    if (role === "user") clearQrScan();
    setUser(null);
    queryClient.clear();
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isAdmin: !!user && user.role !== "user",
    isUser: user?.role === "user",
    adminLogin,
    sendOtp,
    verifyOtp,
    updateUser,
    logout,
  }), [user, adminLogin, sendOtp, verifyOtp, updateUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}