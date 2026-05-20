import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Attendance from "@/pages/Attendance";

const useIsMobileMock = vi.fn();
const employeeListMock = vi.fn();
const attendanceListByDateMock = vi.fn();
const attendanceSelfListMock = vi.fn();
const attendanceEmployeeRangeMock = vi.fn();
const toastMock = vi.fn();

function isoDateForCurrentMonth(dayOfMonth: number) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(dayOfMonth).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) =>
        [key, ...Object.values(options || {}).map((value) => String(value))].join(" "),
    }),
  };
});

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    currentUser: {
      id: 1,
      employee_id: 9,
      roles: ["admin"],
      permissions: ["attendance.correct", "attendance.approve", "attendance.recalculate", "attendance.read_all"],
    },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}));

vi.mock("@/services/employeeApi", () => ({
  employeeApi: {
    list: (...args: unknown[]) => employeeListMock(...args),
  },
}));

vi.mock("@/services/attendanceApi", () => ({
  attendanceApi: {
    listByDate: (...args: unknown[]) => attendanceListByDateMock(...args),
    selfList: (...args: unknown[]) => attendanceSelfListMock(...args),
    getEmployeeRange: (...args: unknown[]) => attendanceEmployeeRangeMock(...args),
    markAllPresent: vi.fn(),
    smartCorrection: vi.fn(),
    manualCorrection: vi.fn(),
    deleteDay: vi.fn(),
    reviewDay: vi.fn(),
    recalculate: vi.fn(),
  },
}));

function createAttendanceDay(overrides: Partial<Record<string, unknown>> = {}) {
  const workDate = typeof overrides.work_date === "string" ? overrides.work_date : isoDateForCurrentMonth(10);
  return {
    id: 1,
    employee_id: 7,
    work_date: workDate,
    work_schedule_id: 2,
    check_in_time: "08:00:00",
    break_start_time: "12:00:00",
    break_end_time: "13:00:00",
    check_out_time: "17:00:00",
    expected_work_minutes: 480,
    actual_work_minutes: 480,
    break_minutes: 60,
    normal_paid_minutes: 420,
    late_minutes: 0,
    early_leave_minutes: 0,
    late_makeup_minutes: 0,
    overtime_minutes: 30,
    absence_minutes: 0,
    unpaid_minutes: 60,
    status: "present",
    review_status: "needs_review",
    reviewed_at: null,
    reviewed_by: null,
    locked_at: null,
    is_manually_corrected: true,
    calculated_at: `${workDate}T17:00:00Z`,
    created_at: `${workDate}T17:00:00Z`,
    updated_at: `${workDate}T17:00:00Z`,
    events: [],
    ...overrides,
  };
}

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
        <Attendance scope="manage" />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("Attendance monthly calendar responsiveness", () => {
  const editableWorkDate = isoDateForCurrentMonth(10);
  const lockedWorkDate = isoDateForCurrentMonth(12);

  beforeEach(() => {
    useIsMobileMock.mockReturnValue(true);
    employeeListMock.mockResolvedValue([
      {
        id: 7,
        first_name: "Mina",
        last_name: "Stone",
        full_name: "Mina Stone",
        email: "mina@example.com",
        phone: "123456789",
        position: "Supervisor",
        position_id: 1,
        department_id: 1,
        status: "active",
        hire_date: "2025-01-01",
        dues: 0,
        salary_type: 1,
        monthly_price: 0,
        day_price: 0,
        hour_price: 0,
        extra_hours_price: 0,
        vacation_days: 10,
        auto_attendance_enabled: false,
        auto_attendance_effective_from: null,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        user_id: 4,
      },
    ]);
    attendanceListByDateMock.mockResolvedValue([]);
    attendanceSelfListMock.mockResolvedValue([]);
    attendanceEmployeeRangeMock.mockResolvedValue([
      createAttendanceDay({ work_date: editableWorkDate }),
      createAttendanceDay({
        id: 2,
        work_date: lockedWorkDate,
        status: "late",
        review_status: "locked",
        locked_at: `${lockedWorkDate}T18:00:00Z`,
        is_manually_corrected: false,
        overtime_minutes: 0,
      }),
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the mobile monthly list, keeps cards concise, opens editable days, and disables locked days", async () => {
    renderPage();

    expect(await screen.findByTestId("attendance-monthly-mobile-list")).toBeInTheDocument();
    expect(screen.queryByTestId("attendance-monthly-desktop-grid")).not.toBeInTheDocument();

    const editableDay = screen.getByTestId(`attendance-mobile-day-${editableWorkDate}`);
    const lockedDay = screen.getByTestId(`attendance-mobile-day-${lockedWorkDate}`);

    expect(editableDay).not.toHaveTextContent("attendancePage.paidUnpaid");
    expect(editableDay).toHaveTextContent("attendancePage.corrected");
    expect(lockedDay).toBeDisabled();

    fireEvent.click(editableDay);

    await waitFor(() => expect(screen.getByText("attendancePage.correctionTitle")).toBeInTheDocument());
  });

  it("tracks selected mobile days in bulk-select mode", async () => {
    renderPage();

    await screen.findByTestId("attendance-monthly-mobile-list");
    await waitFor(() => expect(screen.getByRole("button", { name: "attendancePage.multiSelectButton" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "attendancePage.multiSelectButton" }));

    fireEvent.click(screen.getByTestId(`attendance-mobile-day-${editableWorkDate}`));

    await waitFor(() => expect(screen.getByTestId(`attendance-mobile-day-${editableWorkDate}`)).toHaveAttribute("data-selected", "true"));
    expect(screen.getByText("attendancePage.multiSelectSelectedCount 1")).toBeInTheDocument();
    expect(screen.getAllByText("attendancePage.multiSelectPicked").length).toBeGreaterThan(0);
  });

  it("keeps the desktop month grid for larger screens", async () => {
    useIsMobileMock.mockReturnValue(false);

    renderPage();

    expect(await screen.findByTestId("attendance-monthly-desktop-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("attendance-monthly-mobile-list")).not.toBeInTheDocument();
  });
});
