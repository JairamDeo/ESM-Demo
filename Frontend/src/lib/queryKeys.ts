export const queryKeys = {
  dashboard: ["dashboard"] as const,
  grievances: {
    all: (params?: object) => ["grievances", params] as const,
    single: (id: string) => ["grievances", id] as const,
    my: (params?: object) => ["grievances", "my", params] as const,
    track: (id: string) => ["grievances", "track", id] as const,
  },
  stations: {
    all: (params?: object) => ["stations", params] as const,
    single: (id: string) => ["stations", id] as const,
  },
  qrCodes: {
    all: (params?: object) => ["qr-codes", params] as const,
    single: (id: string) => ["qr-codes", id] as const,
  },
  officers: {
    all: (params?: object) => ["officers", params] as const,
    single: (id: string) => ["officers", id] as const,
  },
  caseTypes: ["case-types"] as const,
  escalations: {
    all: (params?: object) => ["escalations", params] as const,
    single: (id: string) => ["escalations", id] as const,
  },
  reports: (months?: number) => ["reports", months] as const,
  notifications: ["notifications"] as const,
  userMe: ["user", "me"] as const,
};
