// Access Log (Activity Log) API Service — read-only
import { apiFetch } from "./api";

export const ACCESS_LOG_OPERATIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "IMPORT",
  "EXPORT",
  "LOGIN",
  "LOGOUT",
] as const;

export const ACCESS_LOG_STATUSES = ["SUCCESS", "FAILED"] as const;

/** Modules the backend actually writes access logs for. */
export const ACCESS_LOG_MODULES = [
  "AUTH",
  "PURCHASE",
  "PURCHASE_ORDER",
  "SALE",
  "JOURNAL",
  "MANUFACTURING",
  "AGENCY",
  "IMPORT",
] as const;

export type AccessLogOperation = (typeof ACCESS_LOG_OPERATIONS)[number];
export type AccessLogStatus = (typeof ACCESS_LOG_STATUSES)[number];

export interface AccessLog {
  id: string;
  operation: AccessLogOperation;
  module: string;
  status: AccessLogStatus;
  entityType: string | null;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  performedById: string | null;
  performedByName: string | null;
  performedByEmail: string | null;
  branchId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AccessLogMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * GET /api/access-logs returns `meta` next to `data` (not inside it),
 * which the shared `ApiResponse` type from api.ts has no field for.
 */
export interface AccessLogsResponse {
  success: boolean;
  message?: string;
  data: AccessLog[];
  meta: AccessLogMeta;
}

export interface GetAccessLogsParams {
  page?: number;
  /** default 25, max 100 */
  limit?: number;
  performedById?: string;
  module?: string;
  operation?: string;
  status?: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  branchId?: string;
  search?: string;
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  endDate?: string;
}

const MAX_LIMIT = 100;

export const accessLogApi = {
  /** GET /api/access-logs — only params the caller actually set are sent. */
  async getAll(params: GetAccessLogsParams = {}): Promise<AccessLogsResponse> {
    const queryParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      if (key === "limit") {
        queryParams.append("limit", String(Math.min(Number(value), MAX_LIMIT)));
        continue;
      }
      queryParams.append(key, String(value));
    }

    const query = queryParams.toString();
    const url = query ? `/api/access-logs?${query}` : "/api/access-logs";

    const response = (await apiFetch<AccessLog[]>(url)) as unknown as AccessLogsResponse;
    if (!response.success) {
      throw new Error(response.message || "Failed to fetch activity log");
    }
    return response;
  },
};
