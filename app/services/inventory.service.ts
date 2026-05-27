// Inventory API Service - matches backend API contract
import { apiFetch } from "./api";
import { InventoryBatch, InventoryListResponse, AvailableBatch } from "../types/inventory";

export interface GetInventoryParams {
  page?: number;
  limit?: number;
  branchId?: string;
  productId?: string;
  search?: string;
  isActive?: boolean;
}

export interface GetAvailableBatchesParams {
  branchId?: string;
  productId?: string;
  isActive?: boolean;
}

export const inventoryApi = {
  // GET /api/inventory/batches - For sales dropdown (returns array directly)
  async getAvailableBatches(params?: GetAvailableBatchesParams): Promise<{ success: boolean; message: string; data?: AvailableBatch[] }> {
    const queryParams = new URLSearchParams();
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.productId) queryParams.append("productId", params.productId);
    if (params?.isActive !== undefined) queryParams.append("isActive", String(params.isActive));

    const query = queryParams.toString();
    const url = query ? `api/inventory/batches?${query}` : "api/inventory/batches";
    return apiFetch<AvailableBatch[]>(url);
  },

  // GET /api/inventory/batches/all - For inventory management page
  async getAll(params?: GetInventoryParams): Promise<{ success: boolean; message: string; data?: InventoryListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.productId) queryParams.append("productId", params.productId);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.isActive !== undefined) queryParams.append("isActive", String(params.isActive));

    const query = queryParams.toString();
    const url = query ? `api/inventory/batches/all?${query}` : "api/inventory/batches/all";
    return apiFetch<InventoryListResponse>(url);
  },
};