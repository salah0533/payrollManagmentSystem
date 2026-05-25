import { apiRequest, buildQueryString } from "@/lib/api-client";
import type { AuditLogPage } from "@/types/domain";

type AuditLogQuery = {
  page?: number;
  pageSize?: number;
  actions?: string[];
  entityTypes?: string[];
  actorUserId?: number | null;
  actorRole?: string | null;
  search?: string;
};

export const auditApi = {
  list({ page = 1, pageSize = 100, actions, entityTypes, actorUserId, actorRole, search }: AuditLogQuery = {}) {
    return apiRequest<AuditLogPage>(
      `/audit/${buildQueryString({
        page,
        page_size: pageSize,
        action: actions,
        entity_type: entityTypes,
        actor_user_id: actorUserId,
        actor_role: actorRole,
        search,
      })}`,
    );
  },
};
