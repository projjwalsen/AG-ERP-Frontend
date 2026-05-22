// Agency API Service
import { apiFetch } from "./api";
import { Agency, AgenciesListResponse, AgencyResponse } from "../types/agency";

export interface GetAgenciesParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: "VENDOR" | "CLIENT" | "BOTH";
  branch?: string;
}

export interface CreateAgencyPayload {
  name: string;
  type: "VENDOR" | "CLIENT" | "BOTH";
  gstin?: string;
  contactPerson?: string;
  mobileNumber?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pinCode?: string;
  branches?: { branchId: string; openingBalance?: number }[];
}

export interface UpdateAgencyPayload {
  name?: string;
  type?: "VENDOR" | "CLIENT" | "BOTH";
  gstin?: string;
  contactPerson?: string;
  mobileNumber?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pinCode?: string;
  branches?: { branchId: string; openingBalance?: number }[];
}

export const agencyApi = {
  async getAll(params?: GetAgenciesParams): Promise<{ success: boolean; message: string; data?: AgenciesListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.type) queryParams.append("type", params.type);
    if (params?.branch) queryParams.append("branch", params.branch);

    const query = queryParams.toString();
    const url = query ? `/api/agencies/all?${query}` : "/api/agencies/all";
    return apiFetch<AgenciesListResponse>(url);
  },

  async getById(agencyId: string): Promise<{ success: boolean; message: string; data?: AgencyResponse }> {
    return apiFetch<AgencyResponse>(`/api/agencies/${agencyId}`);
  },

  async create(payload: CreateAgencyPayload): Promise<{ success: boolean; message: string; data?: AgencyResponse }> {
    return apiFetch<AgencyResponse>("/api/agencies/create", {
      method: "POST",
      body: payload,
    });
  },

  async update(agencyId: string, payload: UpdateAgencyPayload): Promise<{ success: boolean; message: string; data?: AgencyResponse }> {
    return apiFetch<AgencyResponse>(`/api/agencies/update/${agencyId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  async updateStatus(agencyId: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/agencies/update-status/${agencyId}`, {
      method: "PATCH",
      body: { isActive },
    });
  },
};