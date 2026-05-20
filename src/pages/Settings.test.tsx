import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import Settings from "@/pages/Settings";

const listWorkSchedulesMock = vi.fn();
const createWorkScheduleMock = vi.fn();
const updateWorkScheduleByIdMock = vi.fn();
const getPayrollPolicyMock = vi.fn();
const updatePayrollPolicyMock = vi.fn();
const toastMock = vi.fn();

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    currentUser: {
      id: 7,
      roles: ["admin"],
      permissions: ["settings.read", "settings.update"],
    },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

vi.mock("@/services/settingsApi", () => ({
  settingsApi: {
    getWorkSchedule: vi.fn(),
    listWorkSchedules: (...args: unknown[]) => listWorkSchedulesMock(...args),
    createWorkSchedule: (...args: unknown[]) => createWorkScheduleMock(...args),
    updateWorkScheduleById: (...args: unknown[]) => updateWorkScheduleByIdMock(...args),
    updateWorkSchedule: vi.fn(),
    getPayrollPolicy: (...args: unknown[]) => getPayrollPolicyMock(...args),
    getPayrollCurrency: vi.fn(),
    updatePayrollPolicy: (...args: unknown[]) => updatePayrollPolicyMock(...args),
  },
}));

vi.mock("@/lib/format", async () => {
  const actual = await vi.importActual<typeof import("@/lib/format")>("@/lib/format");
  return {
    ...actual,
    setDefaultCurrency: vi.fn(),
  };
});

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
        <Settings />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("Settings payroll mode", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads, edits, and saves the monthly payroll calculation mode", async () => {
    listWorkSchedulesMock.mockResolvedValue([
      {
        id: 1,
        name: "Default Schedule",
        start_time: "08:00:00",
        end_time: "17:00:00",
        break_start_time: "12:00:00",
        break_end_time: "13:00:00",
        break_minutes: 60,
        weekly_off_days: ["friday", "saturday"],
        timezone: "Africa/Algiers",
        is_default: true,
        created_at: "2026-05-19T00:00:00Z",
        updated_at: "2026-05-19T00:00:00Z",
      },
    ]);
    getPayrollPolicyMock.mockResolvedValue({
      id: 1,
      name: "default",
      payroll_cycle: "monthly",
      minimum_overtime_minutes: 30,
      minimum_auto_pay_minutes: 0,
      allowed_late_minutes: 0,
      default_currency: "DZD",
      significant_change_threshold: 1,
      paid_vacation_counts_for_daily: true,
      overtime_enabled: true,
      monthly_payroll_calculation_mode: "calendar_days",
      auto_recalculate_draft_payroll: true,
      lock_payroll_after_payment: true,
      allow_vacation_carryover: true,
      max_vacation_carryover_days: null,
      carryover_expiry_month: null,
      carryover_expiry_day: null,
      reserve_vacation_days_on_pending: false,
      created_at: "2026-05-19T00:00:00Z",
      updated_at: "2026-05-19T00:00:00Z",
    });
    updatePayrollPolicyMock.mockImplementation(async (payload) => ({
      id: 1,
      ...payload,
      created_at: "2026-05-19T00:00:00Z",
      updated_at: "2026-05-19T00:00:00Z",
    }));

    renderPage();

    await screen.findByText("settings.payrollCalculationMode");

    const radios = screen.getAllByRole("radio");
    const [calendarRadio, workingRadio] = radios;

    expect(calendarRadio).toBeChecked();
    expect(workingRadio).not.toBeChecked();

    fireEvent.click(workingRadio);
    expect(workingRadio).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "settings.savePayrollPolicy" }));

    await waitFor(() =>
      expect(updatePayrollPolicyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          monthly_payroll_calculation_mode: "working_days",
        }),
      ),
    );
  });

  it("creates a new work schedule and marks it as default", async () => {
    listWorkSchedulesMock.mockResolvedValue([
      {
        id: 1,
        name: "Default Schedule",
        start_time: "08:00:00",
        end_time: "17:00:00",
        break_start_time: "12:00:00",
        break_end_time: "13:00:00",
        break_minutes: 60,
        weekly_off_days: ["friday", "saturday"],
        timezone: "Africa/Algiers",
        is_default: true,
        created_at: "2026-05-19T00:00:00Z",
        updated_at: "2026-05-19T00:00:00Z",
      },
    ]);
    getPayrollPolicyMock.mockResolvedValue({
      id: 1,
      name: "default",
      payroll_cycle: "monthly",
      minimum_overtime_minutes: 30,
      minimum_auto_pay_minutes: 0,
      allowed_late_minutes: 0,
      default_currency: "DZD",
      significant_change_threshold: 1,
      paid_vacation_counts_for_daily: true,
      overtime_enabled: true,
      monthly_payroll_calculation_mode: "calendar_days",
      auto_recalculate_draft_payroll: true,
      lock_payroll_after_payment: true,
      allow_vacation_carryover: true,
      max_vacation_carryover_days: null,
      carryover_expiry_month: null,
      carryover_expiry_day: null,
      reserve_vacation_days_on_pending: false,
      created_at: "2026-05-19T00:00:00Z",
      updated_at: "2026-05-19T00:00:00Z",
    });
    createWorkScheduleMock.mockImplementation(async (payload) => ({
      id: 2,
      ...payload,
      created_at: "2026-05-20T00:00:00Z",
      updated_at: "2026-05-20T00:00:00Z",
    }));

    renderPage();

    await screen.findByText("settings.savedSchedules");

    fireEvent.click(screen.getByRole("button", { name: "settings.newSchedule" }));
    fireEvent.change(screen.getByLabelText("settings.scheduleName"), { target: { value: "Night Shift" } });
    fireEvent.click(screen.getAllByRole("switch")[0]);
    fireEvent.click(screen.getByRole("button", { name: "settings.createWorkSchedule" }));

    await waitFor(() =>
      expect(createWorkScheduleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Night Shift",
          is_default: true,
        }),
      ),
    );
  });
});
