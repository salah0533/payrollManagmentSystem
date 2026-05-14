import { apiClient } from '@/services/apiClient';
import type { VacationRead } from '@/types/api';

export interface VacationPayload {
  employee_id: number;
  start_date: string;
  end_date: string;
  vacation_type: number;
  vacation_status: number;
  is_paid: boolean;
}

export interface VacationUpdatePayload extends Partial<VacationPayload> {
  id: number;
}

export const leaveService = {
  listByYear: (year: number) => apiClient.get<VacationRead[]>(`/vacation/${year}`),
  current: () => apiClient.get<VacationRead[]>('/vacation/current'),
  create: (payload: VacationPayload) => apiClient.put('/vacation/', payload),
  update: (payload: VacationUpdatePayload) => apiClient.post('/vacation/', payload),
  own: () => apiClient.get<VacationRead[]>('/me/vacations'),
  requestOwn: (payload: Omit<VacationPayload, 'employee_id' | 'vacation_status'>) =>
    apiClient.post('/me/vacations/request', payload),
};
