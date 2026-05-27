// Sales API Service - matches backend API contract
import { apiFetch } from "./api";
import { Sales, SalesListResponse } from "../types/sales";

export interface GetSalesParams {
  page?: number;
  limit?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  branchId?: string;
}

// Payload matches backend API contract
export interface CreateSalesPayload {
  agencyId: string;
  branchId: string;
  items: {
    productId: string;
    batchId: string;
    quantity: number;
    unit: "KG" | "LTR";
  }[];
  remarks?: string;
}

export interface ApproveSalesPayload {
  saleId: string;
  remarks?: string;
}

export interface RejectSalesPayload {
  saleId: string;
  remarks: string;
}

export const salesApi = {
  // GET /api/sales/get-all
  async getAll(params?: GetSalesParams): Promise<{ success: boolean; message: string; data?: SalesListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.status) queryParams.append("status", params.status);
    if (params?.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    const url = query ? `api/sales/get-all?${query}` : "api/sales/get-all";
    return apiFetch<SalesListResponse>(url);
  },

  // GET /api/sales/:saleId
  async getById(saleId: string): Promise<{ success: boolean; message: string; data?: Sales }> {
    return apiFetch<Sales>(`api/sales/${saleId}`);
  },

  // POST /api/sales/create
  async create(payload: CreateSalesPayload): Promise<{ success: boolean; message: string; data?: Sales }> {
    return apiFetch<Sales>("api/sales/create", {
      method: "POST",
      body: payload,
    });
  },

  // PATCH /api/sales/:saleId/approve
  async approve(payload: ApproveSalesPayload): Promise<{ success: boolean; message: string; data?: Sales }> {
    return apiFetch<Sales>(`api/sales/${payload.saleId}/approve`, {
      method: "PATCH",
      body: { remarks: payload.remarks },
    });
  },

  // PATCH /api/sales/:saleId/reject
  async reject(payload: RejectSalesPayload): Promise<{ success: boolean; message: string; data?: Sales }> {
    return apiFetch<Sales>(`api/sales/${payload.saleId}/reject`, {
      method: "PATCH",
      body: { remarks: payload.remarks },
    });
  },
};