import { apiRequest, buildQueryString } from "@/lib/api-client";
import type { AuditLog } from "@/types/domain";

type AuditLogQuery = {
  limit?: number;
  actions?: string[];
  entityTypes?: string[];
  actorUserId?: number | null;
  actorRole?: string | null;
};

export const auditApi = {
  list({ limit = 100, actions, entityTypes, actorUserId, actorRole }: AuditLogQuery = {}) {
    return apiRequest<AuditLog[]>(
      `/audit/${buildQueryString({
        limit,
        action: actions,
        entity_type: entityTypes,
        actor_user_id: actorUserId,
        actor_role: actorRole,
      })}`,
    );
  },
};
