import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PaymentHist from "@/pages/PaymentHist";

const employeeListMock = vi.fn();
const getEmployeeHistoryMock = vi.fn();
const listAdjustmentsMock = vi.fn();

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

vi.mock("@/services/employeeApi", () => ({
  employeeApi: {
    list: (...args: unknown[]) => employeeListMock(...args),
  },
}));

vi.mock("@/services/payrollApi", () => ({
  payrollApi: {
    getEmployeeHistory: (...args: unknown[]) => getEmployeeHistoryMock(...args),
    listAdjustments: (...args: unknown[]) => listAdjustmentsMock(...args),
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
        <PaymentHist />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("Payment history detail breakdown", () => {
  beforeEach(() => {
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

    getEmployeeHistoryMock.mockResolvedValue({
      employee_id: 7,
      employee_name: "Mina Stone",
      employee_status: "active",
      page: 1,
      page_size: 20,
      total_records: 1,
      total_pages: 1,
      summary: {
        net_salary_total: 4200,
        payable_total: 4000,
        paid_amount_total: 2500,
        remaining_amount_total: 1500,
        payroll_count: 1,
      },
      items: [
        {
          id: 101,
          payroll_period_id: 12,
          employee_id: 7,
          salary_type: "monthly",
          base_salary: 5000,
          normal_amount: 4200,
          overtime_amount: 150,
          bonus_amount: 200,
          deduction_amount: 0,
          late_deduction_amount: 0,
          unpaid_vacation_deduction: 0,
          adjustment_amount: 150,
          gross_salary: 5350,
          net_salary: 4200,
          total_amount: 4000,
          paid_amount: 2500,
          balance_amount: 1500,
          status: "partially_paid",
          calculated_at: "2026-05-15T10:00:00Z",
          reviewed_at: null,
          approved_at: null,
          paid_at: "2026-05-20T10:00:00Z",
          notes: null,
          attendance_deduction_amount: 100,
          manual_deduction_amount: 50,
          late_penalty_amount: 0,
          needs_review_reason: null,
          calculation_data_json: {
            paid_minutes: 480,
            unpaid_minutes: 60,
          },
          period_name: "May 2026",
          period_start_date: "2026-05-01",
          period_end_date: "2026-05-31",
        },
      ],
    });

    listAdjustmentsMock.mockResolvedValue([
      {
        id: 201,
        employee_payroll_id: 101,
        payroll_period_id: 12,
        employee_id: 7,
        adjustment_type: "bonus",
        amount: 200,
        reason: "Referral bonus",
        created_by: 1,
        created_at: "2026-05-16T09:00:00Z",
      },
      {
        id: 202,
        employee_payroll_id: 101,
        payroll_period_id: 12,
        employee_id: 7,
        adjustment_type: "deduction",
        amount: 50,
        reason: "Meal deduction",
        created_by: 1,
        created_at: "2026-05-16T09:00:00Z",
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("toggles stored calculation lines and adjustment rows when the payroll period row is clicked", async () => {
    renderPage();

    expect(await screen.findByText("May 2026")).toBeInTheDocument();
    expect(screen.queryByText("payrollPage.calculationFields.paid_minutes")).not.toBeInTheDocument();
    expect(screen.queryByText("Referral bonus")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("payroll-history-row-101"));

    expect(await screen.findByText("payrollPage.calculationFields.paid_minutes")).toBeInTheDocument();
    expect(await screen.findByText("payrollPage.calculationFields.unpaid_minutes")).toBeInTheDocument();
    expect(await screen.findByText("Referral bonus")).toBeInTheDocument();
    expect(await screen.findByText("Meal deduction")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("payroll-history-row-101"));

    await waitFor(() => expect(screen.queryByText("payrollPage.calculationFields.paid_minutes")).not.toBeInTheDocument());
    expect(screen.queryByText("Referral bonus")).not.toBeInTheDocument();
  });

  it("prints the current payroll history report with the visible breakdown data", async () => {
    const writeMock = vi.fn();
    const closeMock = vi.fn();
    const focusMock = vi.fn();
    const printMock = vi.fn();
    const openMock = vi.fn(() => ({
      document: {
        write: writeMock,
        close: closeMock,
      },
      focus: focusMock,
      print: printMock,
    }));
    vi.stubGlobal("open", openMock);
    window.open = openMock as typeof window.open;

    renderPage();

    await screen.findByText("May 2026");
    fireEvent.click(screen.getByTestId("payroll-history-row-101"));
    await screen.findByText("Referral bonus");

    fireEvent.click(screen.getByRole("button", { name: "payrollHistoryPage.printReport" }));

    await waitFor(() => expect(openMock).toHaveBeenCalled());
    await waitFor(() => expect(writeMock).toHaveBeenCalled());
    expect(writeMock.mock.calls[0][0]).toContain("Mina Stone");
    expect(writeMock.mock.calls[0][0]).toContain("May 2026");
    expect(writeMock.mock.calls[0][0]).toContain("Referral bonus");
    await waitFor(() => expect(printMock).toHaveBeenCalled());
  });
});
