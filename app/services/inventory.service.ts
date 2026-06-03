// Inventory API Service - matches backend API contract
import { apiFetch } from "./api";
import {
  InventoryBatch,
  InventoryListResponse,
  AvailableBatch,
  InventorySummaryRecord,
  InventorySummaryListResponse,
  ProductBatchHistoryResponse,
} from "../types/inventory";

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

export interface GetInventorySummaryParams {
  page?: number;
  limit?: number;
  branchId?: string;
  productId?: string;
  search?: string;
  status?: string;
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

  // GET /api/inventory/summary - Product-wise stock summary across branches
  async getSummary(params?: GetInventorySummaryParams): Promise<{ success: boolean; message: string; data?: InventorySummaryListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.productId) queryParams.append("productId", params.productId);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.status) queryParams.append("status", params.status);

    const query = queryParams.toString();
    const url = query ? `api/inventory/summary?${query}` : "api/inventory/summary";
    return apiFetch<InventorySummaryListResponse>(url);
  },

  // GET /api/inventory/product/:productId/batch-history - Branch + batch history for a product
  async getProductBatchHistory(productId: string): Promise<{ success: boolean; message: string; data?: ProductBatchHistoryResponse }> {
    return apiFetch<ProductBatchHistoryResponse>(`api/inventory/product/${productId}/batch-history`);
  },
};