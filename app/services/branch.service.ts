// Branch API Service
import { apiFetch } from "./api";
import { Branch, BranchesListResponse, BranchResponse } from "../types/branch";

export interface GetBranchesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const branchApi = {
  async getAll(params?: GetBranchesParams): Promise<{ success: boolean; message: string; data?: BranchesListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);

    const query = queryParams.toString();
    const url = query ? `api/branches/all?${query}` : "api/branches/all";
    return apiFetch<BranchesListResponse>(url);
  },

  async getActive(): Promise<{ success: boolean; message: string; data?: BranchesListResponse }> {
    return apiFetch<BranchesListResponse>("api/branches/selection");
  },

  async getById(branchId: string): Promise<{ success: boolean; message: string; data?: BranchResponse }> {
    return apiFetch<BranchResponse>(`api/branches/${branchId}`);
  },

  async create(payload: CreateBranchPayload): Promise<{ success: boolean; message: string; data?: BranchResponse }> {
    return apiFetch<BranchResponse>("api/branches/create", {
      method: "POST",
      body: payload,
    });
  },

  async update(branchId: string, payload: UpdateBranchPayload): Promise<{ success: boolean; message: string; data?: BranchResponse }> {
    return apiFetch<BranchResponse>(`api/branches/update/${branchId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  async updateStatus(branchId: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    return apiFetch(`api/branches/update-status/${branchId}`, {
      method: "PATCH",
      body: { isActive },
    });
  },
};

export interface CreateBranchPayload {
  name: string;
  code: string;
  gstin: string;
  stateCode: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  phone?: string;
  email?: string;
}

export interface UpdateBranchPayload {
  name?: string;
  code?: string;
  gstin?: string;
  stateCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  phone?: string;
  email?: string;
}