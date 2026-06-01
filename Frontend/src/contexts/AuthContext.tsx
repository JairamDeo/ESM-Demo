import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import api, { setAuthToken, clearAuthToken, setStoredUser, getStoredUser } from "@/lib/api";
import { queryClient } from "@/App";

export type UserRole = "super_admin" | "area" | "headquarter" | "station_hq" | "user" | null;

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  station?: string;
  phone?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  adminLogin: (username: string, password: string) => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // ← getStoredUser checks path to get correct user
  const [user, setUser] = useState<AuthUser | null>(() => {
    const path = window.location.pathname;
    return path.startsWith("/user/")
      ? getStoredUser("user")
      : getStoredUser("admin");
  });

  const adminLogin = useCallback(async (username: string, password: string) => {
    const res = await api.post("/auth/admin/login", { username, password });
    const { token, admin } = res.data;
    setAuthToken(token, "admin");         // ← pass "admin"
    const authUser: AuthUser = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      station: admin.station,
    };
    setStoredUser(authUser, "admin");     // ← pass "admin"
    setUser(authUser);
    queryClient.clear();
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    await api.post("/auth/user/send-otp", { phone });
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    const res = await api.post("/auth/user/verify-otp", { phone, otp });
    const { token, user: userInfo } = res.data;
    setAuthToken(token, "user");          // ← pass "user"
    const authUser: AuthUser = {
      id: userInfo.id,
      name: userInfo.name || `+91 ${phone}`,
      phone: userInfo.phone,
      role: "user",
      station: userInfo.stationHQ,
    };
    setStoredUser(authUser, "user");      // ← pass "user"
    setUser(authUser);
     queryClient.clear();
  }, []);

  const logout = useCallback(() => {
    const path = window.location.pathname;
    const role = path.startsWith("/user/") ? "user" : "admin";
    clearAuthToken(role);                 // ← pass correct role
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
    logout,
  }), [user, adminLogin, sendOtp, verifyOtp, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}