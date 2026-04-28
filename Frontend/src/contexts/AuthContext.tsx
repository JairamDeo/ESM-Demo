import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import api, { setAuthToken, clearAuthToken, setStoredUser, getStoredUser } from "@/lib/api";

export type UserRole = "super_admin" | "esm_officer" | "station_officer" | "record_office" | "user" | null;

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
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  const adminLogin = useCallback(async (username: string, password: string) => {
    const res = await api.post("/auth/admin/login", { username, password });
    const { token, admin } = res.data;
    setAuthToken(token);
    const authUser: AuthUser = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      station: admin.station,
    };
    setStoredUser(authUser);
    setUser(authUser);
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    await api.post("/auth/user/send-otp", { phone });
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    const res = await api.post("/auth/user/verify-otp", { phone, otp });
    const { token, user: userInfo } = res.data;
    setAuthToken(token);
    const authUser: AuthUser = {
      id: userInfo.id,
      name: userInfo.name || `+91 ${phone}`,
      phone: userInfo.phone,
      role: "user",
      station: userInfo.stationHQ,
    };
    setStoredUser(authUser);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
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
