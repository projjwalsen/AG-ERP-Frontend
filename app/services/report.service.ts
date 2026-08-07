// Reports API Service — matches AG-ERP-Backend/src/modules/reports
//
// All endpoints sit behind authMiddleware and live under /api/reports.
// Response envelope: { success, message?, data } where `data` is the
// report payload. Mirrors the URL shapes defined in
// `reporting.routes.ts` exactly (no client-side path remapping).
//
// Each report also supports a `?export=true` query that streams an .xlsx
// file built by the backend's `ExcelService.export` (column definitions
// live in `AG-ERP-Backend/src/modules/exports/branch.export.ts`). The
// `exportExcel` methods below mirror that contract.

import { apiFetch } from "./api";
import { fetchBlob } from "@/lib/download";
import {
  OutstandingReportResponse,
  GetOutstandingReportParams,
  OutstandingBackendType,
  DayBookResponse,
  GetDayBookParams,
  GSTR1ReportResponse,
  GetGSTR1Params,
  SuspenseReportResponse,
  GetSuspenseParams,
  InventoryReportResponse,
  GetInventoryParams,
} from "@/app/types/report";

export const reportApi = {
  /**
   * GET /api/reports/outstanding-report?branchId=&type=RECEIVABLE|PAYABLE
   */
  async getOutstandingReport(
    params?: GetOutstandingReportParams
  ): Promise<{ success: boolean; message: string; data?: OutstandingReportResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.type) queryParams.append("type", params.type);
    const query = queryParams.toString();
    const url = query
      ? `api/reports/outstanding-report?${query}`
      : "api/reports/outstanding-report";
    return apiFetch<OutstandingReportResponse>(url);
  },

  /**
   * GET /api/reports/branch/:branchId/day-book?startDate=&endDate=&bankAccountId=&page=&limit=
   *
   * If `bankAccountId` is supplied the backend scopes the day-book to
   * transactions that posted against that bank account under the
   * selected branch. The mirror `bankAccountId` query parameter is
   * defined in the OpenAPI scalar under
   * `AG-ERP-Backend/src/modules/reports/reporting.routes.ts`.
   *
   * Pagination: the response carries a `pagination` object describing
   * the current page slice. `page` is 1-indexed; `limit` defaults to
   * 25 entries. Running balance on each row is computed against the
   * FULL result set, then the slice is taken — so per-page balances
   * stay correct.
   */
  async getBranchDayBook(
    params: GetDayBookParams
  ): Promise<{ success: boolean; message: string; data?: DayBookResponse }> {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);
    if (params.bankAccountId) queryParams.append("bankAccountId", params.bankAccountId);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));
    const query = queryParams.toString();
    const url = query
      ? `api/reports/branch/${params.branchId}/day-book?${query}`
      : `api/reports/branch/${params.branchId}/day-book`;
    return apiFetch<DayBookResponse>(url);
  },

  /**
   * GET /api/reports/gstr1?branchId=&startDate=&endDate=
   */
  async getGSTR1Report(
    params?: GetGSTR1Params
  ): Promise<{ success: boolean; message: string; data?: GSTR1ReportResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const query = queryParams.toString();
    const url = query ? `api/reports/gstr1?${query}` : "api/reports/gstr1";
    return apiFetch<GSTR1ReportResponse>(url);
  },

  /**
   * GET /api/reports/gst-suspense-log?branchId=&startDate=&endDate=
   */
  async getGSTSuspenseLog(
    params?: GetSuspenseParams
  ): Promise<{ success: boolean; message: string; data?: SuspenseReportResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const query = queryParams.toString();
    const url = query
      ? `api/reports/gst-suspense-log?${query}`
      : "api/reports/gst-suspense-log";
    return apiFetch<SuspenseReportResponse>(url);
  },

  /**
   * GET /api/reports/stock-inventory?branchId=&productId=&startDate=&endDate=
   */
  async getStockInventoryReport(
    params?: GetInventoryParams
  ): Promise<{ success: boolean; message: string; data?: InventoryReportResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.productId) queryParams.append("productId", params.productId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const query = queryParams.toString();
    const url = query
      ? `api/reports/stock-inventory?${query}`
      : "api/reports/stock-inventory";
    return apiFetch<InventoryReportResponse>(url);
  },

  /** GET /api/reports/trial-balance?branchId=&startDate=&endDate=&includeZero=true */
  async getTrialBalanceReport(
    params?: { branchId?: string; startDate?: string; endDate?: string; includeZero?: boolean }
  ): Promise<{ success: boolean; message: string; data?: import("@/app/types/report").TrialBalanceResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.includeZero) queryParams.append("includeZero", String(params.includeZero));
    const query = queryParams.toString();
    const url = query ? `api/reports/trial-balance?${query}` : `api/reports/trial-balance`;
    return apiFetch(url as any);
  },

  // ===================================================================
  // EXCEL EXPORTS
  //
  // Each endpoint accepts `?export=true`; the backend's
  // `ExcelService.export` streams an .xlsx file with column definitions
  // from `branch.export.ts`. The `defaultName` is the fallback filename
  // if the server doesn't return a Content-Disposition header.
  // ===================================================================

  /** GET /api/reports/outstanding-report?export=true&branchId=&type= */
  async exportOutstandingExcel(
    params?: { branchId?: string; type?: OutstandingBackendType }
  ): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("export", "true");
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.type) queryParams.append("type", params.type);
    return fetchBlob(
      `api/reports/outstanding-report?${queryParams.toString()}`,
      "outstanding-report.xlsx"
    );
  },

  /**
   * GET /api/reports/outstanding-report/agency/export?agencyId=&type=
   *
   * Returns the JSON bucket breakdown for a single agency. The route
   * name says "export" but the backend's controller is wired to the
   * same `getOutstandingReport` handler, so without an `export=...`
   * flag it returns the structured JSON payload (rows + summary +
   * detailRows) instead of an .xlsx stream.
   *
   * Used by /reports/outstanding-report/:agencyId to load the bucket
   * detail for one agency in isolation. The agencyId is also sent
   * via the X-Agency-Id header so server-side audit logs can
   * attribute the request.
   */
  async getAgencyOutstanding(params: {
    agencyId: string;
    branchId?: string;
    type: OutstandingBackendType;
  }): Promise<{
    success: boolean;
    message: string;
    data?: OutstandingReportResponse;
  }> {
    const queryParams = new URLSearchParams();
    queryParams.append("agencyId", params.agencyId);
    queryParams.append("type", params.type);
    if (params.branchId) queryParams.append("branchId", params.branchId);
    return apiFetch<OutstandingReportResponse>(
      `api/reports/outstanding-report/agency/export?${queryParams.toString()}`,
      {
        method: "GET",
        headers: { "X-Agency-Id": params.agencyId },
      }
    );
  },

  /**
   * GET /api/reports/outstanding-report/agency/export?agencyId=&type=&export=DETAILS
   * Streams an Excel file with the per-invoice detail rows for a single
   * agency. The agencyId is also forwarded via the X-Agency-Id header
   * so backend audit logs can attribute the export to the agency.
   */
  async exportAgencyOutstandingExcel(params: {
    agencyId: string;
    branchId?: string;
    type: OutstandingBackendType;
  }): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("agencyId", params.agencyId);
    queryParams.append("type", params.type);
    if (params.branchId) queryParams.append("branchId", params.branchId);
    // `export=DETAILS` tells the controller to return the per-invoice
    // export shape (one row per bill). The backend honours the same
    // query string the summary export uses.
    queryParams.append("export", "DETAILS");
    return fetchBlob(
      `api/reports/outstanding-report/agency/export?${queryParams.toString()}`,
      `outstanding-${params.agencyId}.xlsx`,
      { "X-Agency-Id": params.agencyId }
    );
  },

  /**
   * GET /api/reports/branch/:branchId/day-book?export=true&startDate=&endDate=&bankAccountId=
   * Note: branchId is in the path, not the query.
   */
  async exportDayBookExcel(
    params: GetDayBookParams
  ): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("export", "true");
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);
    if (params.bankAccountId)
      queryParams.append("bankAccountId", params.bankAccountId);
    return fetchBlob(
      `api/reports/branch/${params.branchId}/day-book?${queryParams.toString()}`,
      "day-book.xlsx"
    );
  },

  /** GET /api/reports/gstr1?export=true&branchId=&startDate=&endDate= */
  async exportGSTR1Excel(
    params?: GetGSTR1Params
  ): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("export", "true");
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    return fetchBlob(
      `api/reports/gstr1?${queryParams.toString()}`,
      "gstr1-report.xlsx"
    );
  },

  /** GET /api/reports/gst-suspense-log?export=true&branchId=&startDate=&endDate= */
  async exportGSTSuspenseExcel(
    params?: GetSuspenseParams
  ): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("export", "true");
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    return fetchBlob(
      `api/reports/gst-suspense-log?${queryParams.toString()}`,
      "gst-suspense-log.xlsx"
    );
  },

  /** GET /api/reports/stock-inventory?export=true&branchId=&productId=&startDate=&endDate= */
  async exportStockInventoryExcel(
    params?: GetInventoryParams
  ): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("export", "true");
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.productId) queryParams.append("productId", params.productId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    return fetchBlob(
      `api/reports/stock-inventory?${queryParams.toString()}`,
      "stock-inventory.xlsx"
    );
  },

  /** GET /api/reports/trial-balance?export=true&branchId=&startDate=&endDate=&includeZero=true */
  async exportTrialBalanceExcel(
    params?: { branchId?: string; startDate?: string; endDate?: string; includeZero?: boolean }
  ): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("export", "true");
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.includeZero) queryParams.append("includeZero", String(params.includeZero));
    return fetchBlob(`api/reports/trial-balance?${queryParams.toString()}`, "trial-balance.xlsx");
  },
};
