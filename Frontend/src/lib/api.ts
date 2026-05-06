import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("vitric_token");
    // console.log(token)
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem("vitric_user");
      // Only redirect if not already on a login page
      const path = window.location.pathname;
      if (!path.includes("/login") && !path.includes("/verify-otp")) {
        if (path.startsWith("/user")) {
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
export interface ApiResponse<T = any> {
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
export const setAuthToken = (token: string) => {
  localStorage.setItem("vitric_token", token);
};

export const clearAuthToken = () => {
  localStorage.removeItem("vitric_token");
  localStorage.removeItem("vitric_user");
};

export const getStoredUser = () => {
  try {
    const u = localStorage.getItem("vitric_user");
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: object) => {
  localStorage.setItem("vitric_user", JSON.stringify(user));
};
