import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { RoleRedirect } from '@/components/auth/RoleRedirect';
import { AuthProvider } from '@/context/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Login from '@/pages/auth/Login';
import RequestAccess from '@/pages/auth/RequestAccess';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ChangePassword from '@/pages/auth/ChangePassword';
import AccessDenied from '@/pages/AccessDenied';
import AdminDashboard from '@/pages/portal/AdminDashboard';
import HRDashboard from '@/pages/portal/HRDashboard';
import EmployeeDashboard from '@/pages/portal/EmployeeDashboard';
import UsersPage from '@/pages/portal/UsersPage';
import EmployeesPage from '@/pages/portal/EmployeesPage';
import EmployeeProfilePage from '@/pages/portal/EmployeeProfilePage';
import AttendancePage from '@/pages/portal/AttendancePage';
import PayrollPage from '@/pages/portal/PayrollPage';
import LeavePage from '@/pages/portal/LeavePage';
import ReportsPage from '@/pages/portal/ReportsPage';
import SettingsPage from '@/pages/portal/SettingsPage';
import MyProfilePage from '@/pages/portal/MyProfilePage';
import MyAttendancePage from '@/pages/portal/MyAttendancePage';
import MyPayrollPage from '@/pages/portal/MyPayrollPage';
import MyLeavePage from '@/pages/portal/MyLeavePage';
import RequestsPage from '@/pages/portal/RequestsPage';
import HRRecordsPage from '@/pages/portal/HRRecordsPage';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/request-access" element={<RequestAccess />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<RoleRedirect />} />
                <Route path="/access-denied" element={<AccessDenied />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route element={<DashboardLayout />}>
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<UsersPage />} />
                    <Route path="/admin/employees" element={<EmployeesPage />} />
                    <Route path="/admin/employees/:employeeId" element={<EmployeeProfilePage />} />
                    <Route path="/admin/payroll" element={<PayrollPage />} />
                    <Route path="/admin/attendance" element={<AttendancePage />} />
                    <Route path="/admin/leave" element={<LeavePage />} />
                    <Route path="/admin/reports" element={<ReportsPage />} />
                    <Route path="/admin/settings" element={<SettingsPage />} />
                  </Route>

                  <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
                  <Route element={<RoleProtectedRoute allowedRoles={['hr']} />}>
                    <Route path="/hr/dashboard" element={<HRDashboard />} />
                    <Route path="/hr/employees" element={<EmployeesPage />} />
                    <Route path="/hr/employees/:employeeId" element={<EmployeeProfilePage />} />
                    <Route path="/hr/attendance" element={<AttendancePage />} />
                    <Route path="/hr/leave" element={<LeavePage />} />
                    <Route path="/hr/payroll" element={<PayrollPage />} />
                    <Route path="/hr/records" element={<HRRecordsPage />} />
                  </Route>

                  <Route path="/employee" element={<Navigate to="/employee/dashboard" replace />} />
                  <Route element={<RoleProtectedRoute allowedRoles={['employee']} />}>
                    <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
                    <Route path="/employee/profile" element={<MyProfilePage />} />
                    <Route path="/employee/attendance" element={<MyAttendancePage />} />
                    <Route path="/employee/payroll" element={<MyPayrollPage />} />
                    <Route path="/employee/leave" element={<MyLeavePage />} />
                    <Route path="/employee/requests" element={<RequestsPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
