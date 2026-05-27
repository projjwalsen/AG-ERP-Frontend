// Purchase API Service - matches backend API contract
import { apiFetch } from "./api";
import { Purchase, PurchasesListResponse } from "../types/purchase";

export interface GetPurchasesParams {
  page?: number;
  limit?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  branchId?: string;
}

// Payload matches backend API contract
export interface CreatePurchasePayload {
  agencyId: string;
  branchId: string;
  invoiceNo: string;
  items: {
    productId: string;
    batchNo: string;
    quantity: number;
    unit: "KG" | "LTR";
    purchasePrice: number;
  }[];
  remarks?: string;
}

export interface ApprovePurchasePayload {
  purchaseId: string;
}

export interface RejectPurchasePayload {
  purchaseId: string;
  remarks: string;
}

export const purchaseApi = {
  // GET /api/purchases/get-all
  async getAll(params?: GetPurchasesParams): Promise<{ success: boolean; message: string; data?: PurchasesListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.status) queryParams.append("status", params.status);
    if (params?.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    const url = query ? `api/purchases/get-all?${query}` : "api/purchases/get-all";
    return apiFetch<PurchasesListResponse>(url);
  },

  // GET /api/purchases/:purchaseId
  async getById(purchaseId: string): Promise<{ success: boolean; message: string; data?: Purchase }> {
    return apiFetch<Purchase>(`api/purchases/${purchaseId}`);
  },

  // POST /api/purchases/create
  async create(payload: CreatePurchasePayload): Promise<{ success: boolean; message: string; data?: Purchase }> {
    return apiFetch<Purchase>("api/purchases/create", {
      method: "POST",
      body: payload,
    });
  },

  // PATCH /api/purchases/:purchaseId/approve
  async approve(purchaseId: string): Promise<{ success: boolean; message: string; data?: Purchase }> {
    return apiFetch<Purchase>(`api/purchases/${purchaseId}/approve`, {
      method: "PATCH",
    });
  },

  // PATCH /api/purchases/:purchaseId/reject
  async reject(payload: RejectPurchasePayload): Promise<{ success: boolean; message: string; data?: Purchase }> {
    return apiFetch<Purchase>(`api/purchases/${payload.purchaseId}/reject`, {
      method: "PATCH",
      body: { remarks: payload.remarks },
    });
  },
};