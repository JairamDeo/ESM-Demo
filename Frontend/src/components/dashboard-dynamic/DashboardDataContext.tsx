import React, { createContext, useContext } from "react";

export interface DashboardData {
  avgResolutionHours?: number;
  stats?: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    escalated: number;
  };
  monthly?: Array<Record<string, unknown>>;
  byStation?: Array<Record<string, unknown>>;
  bySubmissionSource?: Array<Record<string, unknown>>;
  slaStats?: { withinSla?: number; overdue?: number };
  recent?: Array<Record<string, unknown>>;
  counts?: { stations: number; officers: number; activeQR: number };
  byPriority?: Array<Record<string, unknown>>;
  byType?: Array<{ name: string; value: number }>;
}

interface DashboardDataContextType {
  data: DashboardData | null;
  isLoading: boolean;
  period: string;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export function DashboardDataProvider({ children, data, isLoading, period }: { children: React.ReactNode, data: DashboardData | null, isLoading: boolean, period: string }) {
  return (
    <DashboardDataContext.Provider value={{ data, isLoading, period }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (context === undefined) {
    throw new Error("useDashboardData must be used within a DashboardDataProvider");
  }
  return context;
}
