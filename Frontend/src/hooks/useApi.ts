import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const useDashboard = (period = "all") =>
  useQuery({
    queryKey: queryKeys.dashboard(period),
    queryFn: async () => {
      const { data } = await api.get("/grievances/dashboard", {
        params: { period }
      });
      return data.data;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

// ─── Grievances ───────────────────────────────────────────────────────────────
export interface GrievanceParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  station?: string;
  type?: string;
  officer?: string;
  sortBy?: string;
  sortOrder?: string;
  startDate?: string;
  endDate?: string;
}

export const useGrievances = (params: GrievanceParams = {}) =>
  useQuery({
    queryKey: queryKeys.grievances.all(params),
    queryFn: async () => {
      const { data } = await api.get("/grievances", { params });
      return data;
    },
    staleTime: 30_000,
    placeholderData: (prev: any) => prev,
  });

export const useGrievance = (id: string) =>
  useQuery({
    queryKey: queryKeys.grievances.single(id),
    queryFn: async () => {
      const { data } = await api.get(`/grievances/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

export const useMyGrievances = (params?: { status?: string }) => {
  const path = window.location.pathname;
  const isUserPortal = path.startsWith("/user/") || path === "/user";
  return useQuery({
    queryKey: queryKeys.grievances.my(params),
    queryFn: async () => {
      const { data } = await api.get("/grievances/my", { params });
      return data.data;
    },
    staleTime: 30_000,
    refetchInterval: false,
    enabled: isUserPortal,
  });
};

export const useTrackGrievance = (id: string) =>
  useQuery({
    queryKey: queryKeys.grievances.track(id),
    queryFn: async () => {
      const { data } = await api.get(`/grievances/track/${id}`);
      return data.data;
    },
    enabled: !!id && id.length > 3,
    retry: false,
  });

export const useCreateGrievance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: object) => {
      const { data } = await api.post("/grievances", body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grievances"] });
      toast.success("Grievance submitted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to submit grievance");
    },
  });
};

export const useUpdateGrievanceStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note, officerName }: { id: string; status: string; note?: string; officerName?: string }) => {
      const { data } = await api.patch(`/grievances/${id}/status`, { status, note, officerName });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grievances"] });
      toast.success("Status updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update status");
    },
  });
};

export const useAssignOfficer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, officerName, isNew = false }: { id: string; officerName: string; isNew?: boolean }) => {
      const { data } = await api.patch(`/grievances/${id}/assign`, { officerName });
      return { ...data.data, isNew };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["grievances"] });
      toast.success(data?.isNew ? "Officer assigned" : "Officer reassigned");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to assign officer");
    },
  });
};

export const useAddComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, message, authorName, authorRole }: { id: string; message: string; authorName?: string; authorRole?: string }) => {
      const { data } = await api.post(`/grievances/${id}/comments`, { message, authorName, authorRole });
      return data.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.grievances.single(vars.id) });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to add comment");
    },
  });
};

export const useDeleteGrievance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/grievances/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grievances"] });
      toast.success("Grievance deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete grievance");
    },
  });
};

// ─── Stations ─────────────────────────────────────────────────────────────────
export interface StationParams { search?: string; state?: string; qrActive?: boolean; page?: number; limit?: number; }

export const useStations = (params: StationParams = {}) =>
  useQuery({
    queryKey: queryKeys.stations.all(params),
    queryFn: async () => {
      const { data } = await api.get("/stations", { params });
      return data;
    },
    staleTime: 60_000,
  });

export const useCreateStation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: object) => {
      const { data } = await api.post("/stations", body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stations"] });
      toast.success("Station added successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to add station");
    },
  });
};

export const useUpdateStation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: any }) => {
      const { data } = await api.put(`/stations/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stations"] });
      toast.success("Station updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update station");
    },
  });
};

export const useDeleteStation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/stations/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stations"] });
      toast.success("Station deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete station");
    },
  });
};

// ─── QR Codes ─────────────────────────────────────────────────────────────────
export const useQRCodes = (params?: { status?: string; search?: string }) =>
  useQuery({
    queryKey: queryKeys.qrCodes.all(params),
    queryFn: async () => {
      const { data } = await api.get("/qr-codes", { params });
      return data.data;
    },
    staleTime: 60_000,
  });

export const useGenerateQRCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { stationName: string; code: string; stationId?: string }) => {
      const { data } = await api.post("/qr-codes", body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qr-codes"] });
      qc.invalidateQueries({ queryKey: ["stations"] });
      toast.success("QR Code generated!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to generate QR code");
    },
  });
};

export const useRegenerateQRCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/qr-codes/${id}/regenerate`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qr-codes"] });
      toast.success("QR Code regenerated!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to regenerate QR code");
    },
  });
};

export const useToggleQRStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/qr-codes/${id}/toggle`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qr-codes"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to toggle QR status");
    },
  });
};

export const getQRDownloadUrl = (id: string) =>
  `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/qr-codes/${id}/download`;

export const getQRViewUrl = (id: string) =>
  `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/qr-codes/${id}/view`;

// ─── Officers ─────────────────────────────────────────────────────────────────
export interface OfficerParams { search?: string; role?: string; station?: string; status?: string; page?: number; limit?: number; }

export const useOfficers = (params: OfficerParams = {}) =>
  useQuery({
    queryKey: queryKeys.officers.all(params),
    queryFn: async () => {
      const { data } = await api.get("/officers", { params });
      return data;
    },
    staleTime: 60_000,
  });

export const useCreateOfficer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: object) => {
      const { data } = await api.post("/officers", body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["officers"] });
      toast.success("Officer added successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to add officer");
    },
  });
};

export const useUpdateOfficer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: any }) => {
      const { data } = await api.put(`/officers/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["officers"] });
      toast.success("Officer updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update officer");
    },
  });
};

export const useToggleOfficerStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/officers/${id}/toggle-status`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["officers"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to toggle status");
    },
  });
};

export const useDeleteOfficer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/officers/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["officers"] });
      toast.success("Officer deleted");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete officer");
    },
  });
};

// ─── Case Types ───────────────────────────────────────────────────────────────
export const useCaseTypes = () =>
  useQuery({
    queryKey: queryKeys.caseTypes,
    queryFn: async () => {
      const { data } = await api.get("/case-types");
      return data.data;
    },
    staleTime: 300_000,
  });

// ─── Escalations ──────────────────────────────────────────────────────────────
export interface EscalationParams { status?: string; station?: string; search?: string; page?: number; }

export const useEscalations = (params: EscalationParams = {}) =>
  useQuery({
    queryKey: queryKeys.escalations.all(params),
    queryFn: async () => {
      const { data } = await api.get("/escalations", { params });
      return data;
    },
    staleTime: 30_000,
  });

export const useResolveEscalation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolutionNote }: { id: string; resolutionNote: string }) => {
      const { data } = await api.patch(`/escalations/${id}/resolve`, { resolutionNote });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["escalations"] });
      qc.invalidateQueries({ queryKey: ["grievances"] });
      toast.success("Escalation resolved");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to resolve escalation");
    },
  });
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const useReports = (months = 6) =>
  useQuery({
    queryKey: queryKeys.reports(months),
    queryFn: async () => {
      const { data } = await api.get("/reports", { params: { months } });
      return data.data;
    },
    staleTime: 300_000,
  });

// ─── Notifications ────────────────────────────────────────────────────────────
export const useNotifications = (unreadOnly = false) => {
  const path = window.location.pathname;
  const isUserPortal = path.startsWith("/user/") || path === "/user";
  return useQuery({
    queryKey: [...queryKeys.notifications,unreadOnly,],
    queryFn: async () => {
      const { data } = await api.get("/notifications", { params: { unreadOnly } });
      return data;
    },
    staleTime: 60_000,
    gcTime: 300_000,
    refetchInterval: isUserPortal ? 60_000 : false,
    enabled: isUserPortal,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
};

// ─── User Profile ─────────────────────────────────────────────────────────────
export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: object) => {
      const { data } = await api.put("/users/profile", body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userMe });
      toast.success("Profile updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    },
  });
};
