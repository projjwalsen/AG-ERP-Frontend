// Dashboard API Service — matches AG-ERP-Backend/src/modules/dashboard
import { apiFetch } from "./api";
import {
  DashboardKPI,
  DashboardKPIParams,
} from "@/app/types/dashboard";

export const dashboardApi = {
  /**
   * GET /api/dashboard/kpi
   * Returns { success, message, data: DashboardKPI }
   *
   * Optional query params:
   *   - branchId  string (only honored when actor has ALL branch access)
   *   - startDate ISO date string (inclusive)
   *   - endDate   ISO date string (inclusive, defaults to today)
   */
  async getKPI(
    params?: DashboardKPIParams
  ): Promise<{ success: boolean; message: string; data?: DashboardKPI }> {
    const queryParams = new URLSearchParams();
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const query = queryParams.toString();
    const url = query ? `api/dashboard/kpi?${query}` : "api/dashboard/kpi";
    return apiFetch<DashboardKPI>(url);
  },
};
