// Transaction API Service — matches AG-ERP-Backend/src/modules/transaction
import { apiFetch } from "./api";
import {
  Transaction,
  TransactionsListResponse,
  TransactionResponse,
  AgencyOutstanding,
  TransactionDirection,
  GetTransactionsParams,
  CreateTransactionPayload,
  UpdateTransactionPayload,
} from "@/app/types/transaction";

export interface GetOutstandingParams {
  agencyId?: string;
  branchId?: string;
  direction?: TransactionDirection;
}

export const transactionApi = {
  /**
   * GET /api/transactions/all
   * Returns { success, message, data: { data: Transaction[], meta } }
   */
  async getAll(
    params?: GetTransactionsParams
  ): Promise<{
    success: boolean;
    message: string;
    data?: TransactionsListResponse;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.agencyId) queryParams.append("agencyId", params.agencyId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.direction) queryParams.append("direction", params.direction);
    if (params?.paymentType) queryParams.append("paymentType", params.paymentType);
    if (params?.suspenseAccount !== undefined) {
      queryParams.append("suspenseAccount", String(params.suspenseAccount));
    }

    const query = queryParams.toString();
    const url = query ? `api/transactions/all?${query}` : "api/transactions/all";
    return apiFetch<TransactionsListResponse>(url);
  },

  /**
   * GET /api/transactions/:transactionId
   * Returns { success, message, data: Transaction }
   */
  async getById(
    transactionId: string
  ): Promise<{ success: boolean; message: string; data?: TransactionResponse }> {
    return apiFetch<TransactionResponse>(`api/transactions/${transactionId}`);
  },

  /**
   * POST /api/transactions/create
   * Returns { success, message, data: Transaction }
   */
  async create(
    payload: CreateTransactionPayload
  ): Promise<{ success: boolean; message: string; data?: TransactionResponse }> {
    return apiFetch<TransactionResponse>("api/transactions/create", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * PATCH /api/transactions/update/:transactionId
   * Returns { success, message, data: Transaction }
   */
  async update(
    transactionId: string,
    payload: UpdateTransactionPayload
  ): Promise<{ success: boolean; message: string; data?: TransactionResponse }> {
    return apiFetch<TransactionResponse>(
      `api/transactions/update/${transactionId}`,
      { method: "PATCH", body: payload }
    );
  },

  /**
   * PATCH /api/transactions/:transactionId/approve
   * Returns { success, message, data: Transaction }
   */
  async approve(
    transactionId: string
  ): Promise<{ success: boolean; message: string; data?: TransactionResponse }> {
    return apiFetch<TransactionResponse>(
      `api/transactions/${transactionId}/approve`,
      { method: "PATCH" }
    );
  },

  /**
   * PATCH /api/transactions/:transactionId/reject
   * Body: { remarks: string }
   * Returns { success, message, data: Transaction }
   */
  async reject(
    payload: { transactionId: string; remarks: string }
  ): Promise<{ success: boolean; message: string; data?: TransactionResponse }> {
    return apiFetch<TransactionResponse>(
      `api/transactions/${payload.transactionId}/reject`,
      { method: "PATCH", body: { remarks: payload.remarks } }
    );
  },

  /**
   * GET /api/transactions/outstanding?agencyId=...&branchId=...&direction=...
   * Returns { success, message, data: AgencyOutstanding }
   */
  async getOutstanding(
    params: GetOutstandingParams
  ): Promise<{ success: boolean; message: string; data?: AgencyOutstanding }> {
    const queryParams = new URLSearchParams();
    if (params.agencyId) queryParams.append("agencyId", params.agencyId);
    if (params.branchId) queryParams.append("branchId", params.branchId);
    if (params.direction) queryParams.append("direction", params.direction);
    const query = queryParams.toString();
    const url = query
      ? `api/transactions/outstanding?${query}`
      : "api/transactions/outstanding";
    return apiFetch<AgencyOutstanding>(url);
  },
};

// Re-export the type so service consumers can import everything from one place.
export type { Transaction };
