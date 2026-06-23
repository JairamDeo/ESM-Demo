import React, { createContext, useContext } from "react";

interface DashboardDataContextType {
  data: any;
  isLoading: boolean;
  period: string;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export function DashboardDataProvider({ children, data, isLoading, period }: { children: React.ReactNode, data: any, isLoading: boolean, period: string }) {
  return (
    <DashboardDataContext.Provider value={{ data, isLoading, period }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (context === undefined) {
    throw new Error("useDashboardData must be used within a DashboardDataProvider");
  }
  return context;
}
