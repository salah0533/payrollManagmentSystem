import { apiClient } from '@/services/apiClient';
import type { EmployeeRead } from '@/types/api';

export interface EmployeePayload {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone: string;
  department_id?: number | null;
  position?: string | null;
  status?: string;
  hire_date?: string | null;
  dues?: number;
  daly_work_hours?: number;
  extra_hours_price?: number;
  vacation_days?: number;
  hour_price?: number;
  day_price?: number;
  month_price?: number;
  salary_type?: number;
  allowed_late?: number;
  min_extraTime?: number;
}

export const employeeService = {
  list: () => apiClient.get<EmployeeRead[]>('/employee/'),
  get: (id: number) => apiClient.get<EmployeeRead>(`/employee/${id}`),
  create: (payload: EmployeePayload) => apiClient.post<EmployeeRead>('/employee/', payload),
  update: (id: number, payload: Partial<EmployeePayload>) => apiClient.put<EmployeeRead>(`/employee/${id}`, payload),
  deactivate: (id: number) => apiClient.put<EmployeeRead>(`/employee/${id}`, { status: 'inactive' }),
};
