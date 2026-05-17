import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import Home from "@/pages/Home";

const profileMock = vi.fn();
const selfAttendanceMock = vi.fn();
const selfVacationsMock = vi.fn();
const notificationsMock = vi.fn();
const payrollPeriodsMock = vi.fn();

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    currentUser: {
      employee_id: 5,
      roles: ["employee"],
      permissions: ["attendance.check_in_own", "attendance.read_own", "notifications.read_own"],
    },
    refreshUnreadNotificationCount: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/services/employeeApi", () => ({
  employeeApi: {
    getMyProfile: (...args: unknown[]) => profileMock(...args),
  },
}));

vi.mock("@/services/attendanceApi", () => ({
  attendanceApi: {
    selfList: (...args: unknown[]) => selfAttendanceMock(...args),
    selfAction: vi.fn(),
  },
}));

vi.mock("@/services/vacationApi", () => ({
  vacationApi: {
    listSelf: (...args: unknown[]) => selfVacationsMock(...args),
  },
}));

vi.mock("@/services/notificationApi", () => ({
  notificationApi: {
    listMine: (...args: unknown[]) => notificationsMock(...args),
  },
}));

vi.mock("@/services/payrollApi", () => ({
  payrollApi: {
    listSelfPeriods: (...args: unknown[]) => payrollPeriodsMock(...args),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Home />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("Home auto attendance behavior", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("disables self-service attendance actions and shows the auto attendance notice", async () => {
    profileMock.mockResolvedValue({
      id: 5,
      full_name: "Jane Auto",
      first_name: "Jane",
      last_name: "Auto",
      email: "jane@example.com",
      phone: "1234567890",
      department_id: null,
      position_id: null,
      position: "Engineer",
      status: "active",
      hire_date: "2026-01-01",
      dues: 0,
      salary_type: 0,
      monthly_price: 0,
      day_price: 0,
      hour_price: 0,
      extra_hours_price: 0,
      vacation_days: 0,
      auto_attendance_enabled: true,
      auto_attendance_effective_from: "2026-05-04",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      user_id: 10,
    });
    selfAttendanceMock.mockResolvedValue([]);
    selfVacationsMock.mockResolvedValue([]);
    notificationsMock.mockResolvedValue({ items: [] });
    payrollPeriodsMock.mockResolvedValue([]);

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText(/attendance is generated automatically after your scheduled workday ends/i),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole("button", { name: /check in/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /break start/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /break end/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /check out/i })).toBeDisabled();
  });
});
