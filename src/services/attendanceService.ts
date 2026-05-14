import { apiClient } from '@/services/apiClient';
import type { AttendanceDayRead, AttendanceRecord } from '@/types/api';

export interface AttendancePayload {
  employee_id: number;
  date: string;
  entry_time?: string | null;
  exit_time?: string | null;
  attendence_type?: number | null;
}

export const attendanceService = {
  byDate: (date: string) => apiClient.get<AttendanceRecord[]>(`/attendance/emps/${date}`),
  employeeRange: (employeeId: number, start: string, end: string) =>
    apiClient.get<AttendanceRecord[]>(`/attendance/emp/${employeeId}/${start}/${end}`),
  ownRange: (start_date: string, end_date: string) =>
    apiClient.get<AttendanceDayRead[]>('/me/attendance', { start_date, end_date }),
  save: (payload: AttendancePayload) => apiClient.put('/attendance/', payload),
  markAllPresent: () => apiClient.put<{ updated: number; created: number }>('/attendance/mark_all_present'),
};
