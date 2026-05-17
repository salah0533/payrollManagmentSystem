import { apiRequest, buildQueryString } from "@/lib/api-client";
import type {
  SelfVacationRequestPayload,
  VacationBalance,
  Vacation,
  VacationPayload,
  VacationStatus,
  VacationType,
  VacationUpdatePayload,
} from "@/types/domain";

export const vacationApi = {
  getTypes() {
    return apiRequest<VacationType[]>("/vacation_types/");
  },
  getStatuses() {
    return apiRequest<VacationStatus[]>("/vacation_status/");
  },
  listAll(year: number) {
    return apiRequest<Vacation[]>(`/vacation/${year}`);
  },
  listCurrent() {
    return apiRequest<Vacation[]>("/vacation/current");
  },
  listSelf() {
    return apiRequest<Vacation[]>("/me/vacations");
  },
  getBalance(employeeId: number, params: { start_year?: number; end_year?: number; as_of?: string } = {}) {
    return apiRequest<VacationBalance>(`/annual_vacations/balance/${employeeId}${buildQueryString(params)}`);
  },
  getMyBalance(params: { start_year?: number; end_year?: number; as_of?: string } = {}) {
    return apiRequest<VacationBalance>(`/me/vacation-balance${buildQueryString(params)}`);
  },
  requestSelf(payload: SelfVacationRequestPayload) {
    return apiRequest<null>("/me/vacations/request", {
      method: "POST",
      body: payload,
    });
  },
  create(payload: VacationPayload) {
    return apiRequest<null>("/vacation/", {
      method: "PUT",
      body: payload,
    });
  },
  update(payload: VacationUpdatePayload) {
    return apiRequest<null>("/vacation/", {
      method: "POST",
      body: payload,
    });
  },
  remove(vacationId: number) {
    return apiRequest<null>(`/vacation/${vacationId}`, {
      method: "DELETE",
    });
  },
};
