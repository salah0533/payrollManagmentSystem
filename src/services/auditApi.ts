import { apiRequest, buildQueryString } from "@/lib/api-client";
import type { AuditLog } from "@/types/domain";

export const auditApi = {
  list(limit = 100) {
    return apiRequest<AuditLog[]>(`/audit/${buildQueryString({ limit })}`);
  },
};
