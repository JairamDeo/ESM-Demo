import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { getApiBaseUrl } from "@/lib/apiBase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const useDashboard = (period = "all") =>
  useQuery({
    queryKey: queryKeys.dashboard(period),
    queryFn: async () => {
      const { data } = await api.get("/grievances/dashboard", {
        params: { period }
      });
      if (!data?.success) {
        throw new Error(data?.message || "Failed to fetch dashboard data");
      }
      return data.data ?? {
        stats: { total: 0, pending: 0, inProgress: 0, escalated: 0, resolved: 0 },
        counts: { stations: 0, officers: 0, activeQR: 0 },
        monthly: [],
        byType: [],
        byStation: [],
        recent: [],
      };
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
    mutationFn: async (body: object | FormData) => {
      const isFormData = body instanceof FormData;
      const { data } = await api.post("/grievances", body, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : {}
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grievances"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] }); 
      qc.invalidateQueries({ queryKey: ["reports"] });  


      toast.success("Grievance submitted successfully!");
    },
    onError: (err: any) => {
      const raw = err?.response?.data?.message || "";
      const friendly =
        raw.includes("type, veteranName, stationName") || raw.includes("service type")
          ? "Please complete all required fields: service type, station HQ, and your details."
          : raw.includes("Station HQ")
            ? "Please select your Station HQ before submitting."
            : raw || "Could not submit your grievance. Please try again.";
      toast.error(friendly);
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
      qc.invalidateQueries({ queryKey: ["grievances"] });  // ← grievances list
      qc.invalidateQueries({ queryKey: ["dashboard"] });   // ← dashboard stats
      qc.invalidateQueries({ queryKey: ["escalations"] }); // ← escalations list
      qc.invalidateQueries({ queryKey: ["reports"] }); 

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
    mutationFn: async (payload: any) => {
      const isFormData = payload instanceof FormData;
      const id = isFormData ? payload.get("id") : payload.id;
      const { data } = await api.post(`/grievances/${id}/comments`, payload);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      const id = vars instanceof FormData ? vars.get("id") : vars.id;
      qc.invalidateQueries({ queryKey: queryKeys.grievances.single(id as string) });
      qc.invalidateQueries({ queryKey: queryKeys.grievances.track(id as string) });
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
      qc.invalidateQueries({ queryKey: ["dashboard"] });  
      qc.invalidateQueries({ queryKey: ["reports"] });  

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
  `${getApiBaseUrl()}/qr-codes/${id}/download`;

export const getQRViewUrl = (id: string) =>
  `${getApiBaseUrl()}/qr-codes/${id}/view`;

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
export const useCaseTypes = (params?: { status?: string }) =>
  useQuery({
    queryKey: [...queryKeys.caseTypes, params],
    queryFn: async () => {
      const { data } = await api.get("/case-types", { params });
      return data.data;
    },
    staleTime: 300_000,
  });

  export const useCreateCaseType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; description?: string; category: string }) => {
      const { data } = await api.post("/case-types", body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case-types"] });
      toast.success("Case type added successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to add case type");
    },
  });
};

export const useUpdateCaseType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: any }) => {
      const { data } = await api.put(`/case-types/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case-types"] });
      toast.success("Case type updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update case type");
    },
  });
};

export const useDeleteCaseType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/case-types/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case-types"] });
      toast.success("Case type deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete case type");
    },
  });
};

// ─── Case Type Required Documents ─────────────────────────────────────────────
export const useCaseTypeDocumentsList = () =>
  useQuery({
    queryKey: ["case-type-documents"],
    queryFn: async () => {
      const { data } = await api.get("/case-type-documents");
      return data.data;
    },
    staleTime: 60_000,
  });

export const useRequiredDocumentsForCaseType = (params: {
  caseTypeId?: string;
  slug?: string;
  name?: string;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: ["case-type-documents", "lookup", params],
    queryFn: async () => {
      const { data } = await api.get("/case-type-documents/for-case-type", { params });
      return data.data;
    },
    enabled: !!(params.enabled !== false && (params.caseTypeId || params.slug || params.name)),
    staleTime: 60_000,
  });

// ─── Veteran Document Uploads ──────────────────────────────────────────────────
export const useVeteranDocumentChecklist = (caseTypeId: string) =>
  useQuery({
    queryKey: ["veteran-document-checklist", caseTypeId],
    queryFn: async () => {
      const { data } = await api.get("/veteran/required-documents/checklist", { params: { caseTypeId } });
      return data.data;
    },
    enabled: !!caseTypeId,
    staleTime: 0,
  });

export const useUploadVeteranRequiredDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ caseTypeId, documentLabel, itemIndex, file }: { caseTypeId: string; documentLabel: string; itemIndex?: number; file: File }) => {
      const formData = new FormData();
      formData.append("caseTypeId", caseTypeId);
      formData.append("documentLabel", documentLabel);
      if (itemIndex !== undefined) formData.append("itemIndex", String(itemIndex));
      formData.append("file", file);

      const { data } = await api.post("/veteran/required-documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["veteran-document-checklist", variables.caseTypeId] });
      qc.invalidateQueries({ queryKey: ["veteran-document-uploads", variables.caseTypeId] });
    },
  });
};

export const useListVeteranUploads = (caseTypeId: string) =>
  useQuery({
    queryKey: ["veteran-document-uploads", caseTypeId],
    queryFn: async () => {
      const { data } = await api.get("/veteran/required-documents/uploads", { params: { caseTypeId } });
      return data.data;
    },
    enabled: !!caseTypeId,
    staleTime: 0,
  });

export const useDeleteVeteranUpload = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uploadId, caseTypeId }: { uploadId: string; caseTypeId?: string }) => {
      const { data } = await api.delete(`/veteran/required-documents/uploads/${uploadId}`);
      return data.data;
    },
    onSuccess: (_, variables) => {
      if (variables.caseTypeId) {
        qc.invalidateQueries({ queryKey: ["veteran-document-checklist", variables.caseTypeId] });
        qc.invalidateQueries({ queryKey: ["veteran-document-uploads", variables.caseTypeId] });
      } else {
        qc.invalidateQueries({ queryKey: ["veteran-document-checklist"] });
        qc.invalidateQueries({ queryKey: ["veteran-document-uploads"] });
      }
    },
  });
};

export const useUpsertCaseTypeDocuments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      caseTypeId,
      ...body
    }: {
      caseTypeId: string;
      documents: Array<{
        label: string;
        text: string;
        isMandatory: boolean;
        sortOrder: number;
        templateUrl?: string;
        templateFileName?: string;
      }>;
      questions?: string[];
      guidelines?: string[];
      note?: string;
      acceptedFormats?: string;
      maxFileSizeMb?: number;
      isActive?: boolean;
    }) => {
      const { data } = await api.put(`/case-type-documents/${caseTypeId}`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case-type-documents"] });
      toast.success("Required documents saved");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save required documents");
    },
  });
};

export const useUploadDocumentTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      caseTypeId,
      itemIndex,
      file,
    }: {
      caseTypeId: string;
      itemIndex: number;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("template", file);
      formData.append("itemIndex", String(itemIndex));
      const { data } = await api.post(`/case-type-documents/${caseTypeId}/templates`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case-type-documents"] });
      toast.success("Template uploaded");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to upload template");
    },
  });
};

export const useRemoveDocumentTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ caseTypeId, itemIndex }: { caseTypeId: string; itemIndex: number }) => {
      const { data } = await api.delete(`/case-type-documents/${caseTypeId}/templates/${itemIndex}`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case-type-documents"] });
      toast.success("Template removed");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to remove template");
    },
  });
};

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
      qc.invalidateQueries({ queryKey: ["dashboard"] });  
      qc.invalidateQueries({ queryKey: ["reports"] });  


      toast.success("Escalation resolved");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to resolve escalation");
    },
  });
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const useReports = (months = 6, period = "all") =>
  useQuery({
    queryKey: [...queryKeys.reports(months), period],
    queryFn: async () => {
      const { data } = await api.get("/reports", { params: { months, period } });
      return data.data;
    },
    staleTime: 0,           // ← always fresh
    refetchInterval: 60_000, // ← auto refetch every 60 seconds
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
export const useUserMe = () =>
  useQuery({
    queryKey: queryKeys.userMe,
    queryFn: async () => {
      const { data } = await api.get("/auth/user/me");
      return data.user as {
        _id: string;
        name?: string;
        phone?: string;
        rank?: string;
        serviceNumber?: string;
        email?: string;
        address?: string;
        stationHQ?: string;
      };
    },
    staleTime: 60_000,
  });
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

// ─── Headquarter ─────────────────────────────────────────────────────────────

export const useHQs = () =>
  useQuery({
    queryKey: ["hq-master"],
    queryFn: async () => {
      const { data } = await api.get("/hq-master");
      return data.data as { _id: string; name: string; city: string; stateId?: string; stateName?: string; state?: string }[];
    },
    staleTime: 600_000,
  });

// ─── States ─────────────────────────────────────────────────────────────

export const useStates = () =>
  useQuery({
    queryKey: ["states-master"],
    queryFn: async () => {
      const { data } = await api.get("/states-master");
      return data.data as { _id: string; name: string; code: string }[];
    },
    staleTime: 600_000,
  });

export const useCreateState = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; code: string }) => {
      const { data } = await api.post("/states-master", body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["states-master"] });
      toast.success("Area created successfully");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to create area"),
  });
};

export const useCreateHQ = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      city: string;
      stateId?: string;
      address?: string;
      commanderName?: string;
    }) => {
      const { data } = await api.post("/hq-master", body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hq-master"] });
      toast.success("Headquarters created successfully");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to create HQ"),
  });
};

// ─── Categories ─────────────────────────────────────────────────────────────

  export const useCategories = (params?: { status?: string }) =>
  useQuery({
    queryKey: ["categories", params],
    queryFn: async () => {
      const { data } = await api.get("/categories", { params });
      return data.data as { _id: string; name: string; isActive?: boolean }[];
    },
    staleTime: 600_000,
  });

  export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; isActive?: boolean }) => {
      const { data } = await api.post("/categories", body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category added successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to add category");
    },
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: any }) => {
      const { data } = await api.put(`/categories/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update category");
    },
  });
};

// ─── Announcements ────────────────────────────────────────────────────────────
export const useAnnouncements = () =>
  useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data } = await api.get("/announcements");
      return data.data;
    },
    staleTime: 60_000,
  });

export const useCreateAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post("/announcements", body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement sent successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to send announcement");
    },
  });
};
