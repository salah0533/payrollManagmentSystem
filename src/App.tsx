import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { HRLayout } from "@/components/layout/HRLayout";
import { useAuth, AuthProvider } from "@/providers/AuthProvider";
import Attendance from "@/pages/Attendance";
import AuditLogs from "@/pages/AuditLogs";
import ChangePassword from "@/pages/ChangePassword";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import Forbidden from "@/pages/Forbidden";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Notifications from "@/pages/Notifications";
import PaymentHist from "@/pages/PaymentHist";
import Payments from "@/pages/Payments";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Users from "@/pages/Users";
import Vacations from "@/pages/Vacations";

const queryClient = new QueryClient();

function AppRootRedirect() {
  const { currentUser, homePath, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser?.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  return <Navigate to={homePath} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<AppRootRedirect />} />

            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>

            <Route element={<ProtectedRoute allowDuringPasswordChange />}>
              <Route path="/change-password" element={<ChangePassword />} />
            </Route>

            <Route path="/forbidden" element={<Forbidden />} />

            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<Dashboard role="admin" />} />
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/employees" element={<Employees scope="admin" />} />
                <Route path="/admin/attendance" element={<Attendance scope="manage" />} />
                <Route path="/admin/payroll" element={<Payments scope="manage" />} />
                <Route path="/admin/pyment-hist" element={<PaymentHist />} />
                <Route path="/admin/vacations" element={<Vacations scope="manage" />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route path="/admin/notifications" element={<Notifications />} />
                <Route path="/admin/audit-logs" element={<AuditLogs />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["admin", "hr"]} />}>
              <Route element={<HRLayout />}>
                <Route path="/hr/dashboard" element={<Dashboard role="hr" />} />
                <Route path="/hr/employees" element={<Employees scope="hr" />} />
                <Route path="/hr/attendance" element={<Attendance scope="manage" />} />
                <Route path="/hr/payroll" element={<Payments scope="manage" />} />
                <Route path="/hr/pyment-hist" element={<PaymentHist />} />
                <Route path="/hr/vacations" element={<Vacations scope="manage" />} />
                <Route path="/hr/notifications" element={<Notifications />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["employee"]} />}>
              <Route element={<EmployeeLayout />}>
                <Route path="/employee/home" element={<Home />} />
                <Route path="/employee/profile" element={<Profile />} />
                <Route path="/employee/attendance" element={<Attendance scope="self" />} />
                <Route path="/employee/payroll" element={<Payments scope="self" />} />
                <Route path="/employee/vacations" element={<Vacations scope="self" />} />
                <Route path="/employee/notifications" element={<Notifications />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
