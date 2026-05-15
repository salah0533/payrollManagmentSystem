import { apiRequest, buildQueryString } from "@/lib/api-client";
import type {
  AttendanceActionPayload,
  AttendanceActionResult,
  AttendanceCorrectionPayload,
  AttendanceDay,
  AttendanceType,
} from "@/types/domain";

export const attendanceApi = {
  getTypes() {
    return apiRequest<AttendanceType[]>("/att_types/");
  },
  listByDate(date: string) {
    return apiRequest<AttendanceDay[]>(`/attendance/days/${date}`);
  },
  getEmployeeRange(employeeId: number, startDate: string, endDate: string) {
    return apiRequest<AttendanceDay[]>(`/attendance/employee/${employeeId}/${startDate}/${endDate}`);
  },
  getDay(employeeId: number, workDate: string) {
    return apiRequest<AttendanceDay>(`/attendance/day/${employeeId}/${workDate}`);
  },
  markAllPresent(workDate?: string) {
    return apiRequest<{ created?: number; updated?: number }>(
      `/attendance/mark_all_present${buildQueryString({ work_date: workDate })}`,
      {
        method: "PUT",
      },
    );
  },
  selfList(startDate: string, endDate: string) {
    return apiRequest<AttendanceDay[]>(
      `/me/attendance${buildQueryString({ start_date: startDate, end_date: endDate })}`,
    );
  },
  selfAction(action: "check-in" | "break-start" | "break-end" | "check-out", payload: AttendanceActionPayload = {}) {
    return apiRequest<AttendanceActionResult>(`/me/attendance/${action}`, {
      method: "POST",
      body: payload,
    });
  },
  manualCorrection(payload: AttendanceCorrectionPayload) {
    return apiRequest<AttendanceActionResult>("/attendance/manual-correction", {
      method: "POST",
      body: payload,
    });
  },
  deleteDay(employeeId: number, workDate: string) {
    return apiRequest<{ deleted: number }>(`/attendance/day/${employeeId}/${workDate}`, {
      method: "DELETE",
    });
  },
  recalculate(employeeId: number, startDate: string, endDate: string) {
    return apiRequest<{ employee_id: number; recalculated_days: number }>(
      `/attendance/recalculate/${employeeId}/${startDate}/${endDate}`,
      {
        method: "POST",
      },
    );
  },
};
