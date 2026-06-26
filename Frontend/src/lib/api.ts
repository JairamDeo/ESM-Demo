import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "./apiBase";

const BASE_URL = getApiBaseUrl();

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ─── Helper to check if on user portal ───────────────────────────────────────
const isUserPortal = () => {
  const path = window.location.pathname;
  return path.startsWith("/user/") || path === "/user";
};

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = isUserPortal()
      ? localStorage.getItem("vitric_user_token")
      : localStorage.getItem("vitric_admin_token");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 globally ──────────────────────────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("vitric_token");
      if (isUserPortal()) {
        localStorage.removeItem("vitric_user_token");
        localStorage.removeItem("vitric_user");
      } else {
        localStorage.removeItem("vitric_admin_token");
        localStorage.removeItem("vitric_admin");
      }
      const path = window.location.pathname;
      if (!path.includes("/login") && !path.includes("/verify-otp")) {
        if (isUserPortal()) {
          window.location.href = "/user/login";
        } else {
          window.location.href = "/admin/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Typed response wrapper ───────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Token helpers ────────────────────────────────────────────────────────────
export const setAuthToken = (token: string, role?: string) => {
  const key = role === "user" ? "vitric_user_token" : "vitric_admin_token";
  localStorage.setItem(key, token);
};

export const clearAuthToken = (role?: string) => {
  if (role === "user") {
    localStorage.removeItem("vitric_user_token");
    localStorage.removeItem("vitric_user");
  } else {
    localStorage.removeItem("vitric_admin_token");
    localStorage.removeItem("vitric_admin");
  }
};

export const getStoredUser = (role?: string) => {
  try {
    const key = role === "user" ? "vitric_user" : "vitric_admin";
    const u = localStorage.getItem(key);
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: object, role?: string) => {
  const key = role === "user" ? "vitric_user" : "vitric_admin";
  localStorage.setItem(key, JSON.stringify(user));
};