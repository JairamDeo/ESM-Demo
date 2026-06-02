import { lazy, Suspense, memo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useRBACStore } from "@/stores/rbac";

const AdminLayout   = lazy(() => import("@/components/AdminLayout"));
const UserLayout    = lazy(() => import("@/components/UserLayout"));
const AdminLogin    = lazy(() => import("@/pages/AdminLogin"));
const Dashboard     = lazy(() => import("@/pages/Dashboard"));
const Grievances    = lazy(() => import("@/pages/Grievances"));
const CaseTypes     = lazy(() => import("@/pages/CaseTypes"));
const Stations      = lazy(() => import("@/pages/Stations"));
const QRCodes       = lazy(() => import("@/pages/QRCodes"));
const UsersOfficers = lazy(() => import("@/pages/UsersOfficers"));
const Escalations   = lazy(() => import("@/pages/Escalations"));
const Reports       = lazy(() => import("@/pages/Reports"));
const SettingsPage  = lazy(() => import("@/pages/SettingsPage"));
const NotFound      = lazy(() => import("@/pages/NotFound"));
const Login          = lazy(() => import("@/pages/user/Login"));
const VerifyOTP      = lazy(() => import("@/pages/user/VerifyOTP"));
const UserHome       = lazy(() => import("@/pages/user/UserHome"));
const Services       = lazy(() => import("@/pages/user/Services"));
const RaiseGrievance = lazy(() => import("@/pages/user/RaiseGrievance"));
const MyComplaints   = lazy(() => import("@/pages/user/MyComplaints"));
const TrackCase      = lazy(() => import("@/pages/user/TrackCase"));
const UserProfile    = lazy(() => import("@/pages/user/UserProfile"));
const Notifications  = lazy(() => import("@/pages/user/Notifications"));
const UserSettings   = lazy(() => import("@/pages/user/UserSettings"));

 export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

const PageLoader = memo(() => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
));

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const AdminGuard = memo(() => {
  const { isAuthenticated, isAdmin } = useAuth();
  const hasToken = !!localStorage.getItem("vitric_admin_token");
  if (!hasToken && (!isAuthenticated || !isAdmin)) return <Navigate to="/admin/login" replace />;
  
  return (
    <S><AdminLayout>
      <Routes>
        <Route path="/"            element={<S><Dashboard /></S>} />
        <Route path="/grievances"  element={<S><Grievances /></S>} />
        <Route path="/case-types"  element={<S><CaseTypes /></S>} />
        <Route path="/stations"    element={<S><Stations /></S>} />
        <Route path="/qr-codes"    element={<S><QRCodes /></S>} />
        <Route path="/users"       element={<S><UsersOfficers /></S>} />
        <Route path="/escalations" element={<S><Escalations /></S>} />
        <Route path="/reports"     element={<S><Reports /></S>} />
        <Route path="/settings"    element={<S><SettingsPage /></S>} />
        <Route path="*"            element={<S><NotFound /></S>} />
      </Routes>
    </AdminLayout></S>
  );
});

const UserRoutes = memo(() => {
  const { isAuthenticated, user } = useAuth();
  const rbacPerms = useRBACStore.getState().permissions;
  const role = user?.role as any;
  const canAccessVeteranPortal = role === "user" || (isAuthenticated && rbacPerms[role]?.loginAsVeteran);
  const hasToken = !!localStorage.getItem("vitric_user_token");

  if (!hasToken && (!isAuthenticated || !canAccessVeteranPortal)) return <Navigate to="/user/login" replace />;

  return (
    <S><UserLayout>
      <Routes>
        <Route path="/"                element={<S><UserHome /></S>} />
        <Route path="/services"        element={<S><Services /></S>} />
        <Route path="/raise-grievance" element={<S><RaiseGrievance /></S>} />
        <Route path="/complaints"      element={<S><MyComplaints /></S>} />
        <Route path="/track-case"      element={<S><TrackCase /></S>} />
        <Route path="/profile"         element={<S><UserProfile /></S>} />
        <Route path="/notifications"   element={<S><Notifications /></S>} />
        <Route path="/settings"        element={<S><UserSettings /></S>} />
      </Routes>
    </UserLayout></S>
  );
});

const AdminLoginGuard = memo(() => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (isAuthenticated && isAdmin) return <Navigate to="/" replace />;
  return <S><AdminLogin /></S>;
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <Toaster richColors position="top-right" closeButton duration={5000} />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/admin/login"     element={<AdminLoginGuard />} />
            <Route path="/user/login"      element={<S><Login /></S>} />
            <Route path="/user/verify-otp" element={<S><VerifyOTP /></S>} />
            <Route path="/user/*"          element={<UserRoutes />} />
            <Route path="/*"               element={<AdminGuard />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;