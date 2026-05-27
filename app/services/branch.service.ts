// Branch API Service
import { apiFetch } from "./api";
import { Branch, BranchesListResponse, BranchResponse, PaginationMeta } from "../types/branch";

export interface GetBranchesParams {
  page?: number;
  limit?: number;
  search?: string;
}

// Raw API response types
interface RawListResponse {
  success: boolean;
  message: string;
  data?: Branch[];
}

interface RawActiveBranchesResponse {
  success: boolean;
  message: string;
  data?: Branch[];
}

export const branchApi = {
  async getAll(params?: GetBranchesParams): Promise<{ success: boolean; message: string; data?: BranchesListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);

    const query = queryParams.toString();
    const url = query ? `/api/branches/all?${query}` : "/api/branches/all";
    return apiFetch<{ branches: Branch[]; meta: PaginationMeta }>(url).then((response) => ({
      success: response.success,
      message: response.message,
      data: response.data ? {
        branches: response.data.branches,
        meta: response.data.meta,
        pagination: response.data.meta,
      } : undefined,
    }));
  },

  // Backend returns: { success, message, data: [ ...branches array... ] }
  // data IS the direct array, not { branches: [...] }
  async getActive(): Promise<{ success: boolean; message: string; data?: { branches: Branch[] } }> {
    const response: RawActiveBranchesResponse = await apiFetch(`/api/branches/selection`);
    return {
      success: response.success,
      message: response.message,
      // Backend returns data as direct array, wrap it
      data: response.success && response.data ? { branches: response.data } : undefined,
    };
  },

  async getById(branchId: string): Promise<{ success: boolean; message: string; data?: BranchResponse }> {
    return apiFetch<BranchResponse>(`/api/branches/${branchId}`);
  },

  async create(payload: CreateBranchPayload): Promise<{ success: boolean; message: string; data?: BranchResponse }> {
    return apiFetch<BranchResponse>("/api/branches/create", {
      method: "POST",
      body: payload,
    });
  },

  async update(branchId: string, payload: UpdateBranchPayload): Promise<{ success: boolean; message: string; data?: BranchResponse }> {
    return apiFetch<BranchResponse>(`/api/branches/update/${branchId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  async updateStatus(branchId: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/branches/update-status/${branchId}`, {
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
  phnNumber?: string;
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
  phnNumber?: string;
  email?: string;
}