// Inventory API Service - matches backend API contract
import { apiFetch } from "./api";
import { fetchBlob } from "@/lib/download";
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

  // ===== Export endpoints =====
  // Each returns a streamed .xlsx file; use `downloadBlob(...)` from
  // `@/lib/download` to save it on the user's machine.

  // GET /api/inventory/batches/all?export=true
  async exportBatches(params?: Omit<GetInventoryParams, "page" | "limit">): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("export", "true");
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.productId) queryParams.append("productId", params.productId);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.isActive !== undefined) queryParams.append("isActive", String(params.isActive));

    return fetchBlob(`api/inventory/batches/all?${queryParams.toString()}`, "inventory_batches.xlsx");
  },

  // GET /api/inventory/summary?export=true
  async exportSummary(params?: Omit<GetInventorySummaryParams, "page" | "limit">): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("export", "true");
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.productId) queryParams.append("productId", params.productId);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.status) queryParams.append("status", params.status);

    return fetchBlob(`api/inventory/summary?${queryParams.toString()}`, "branch_inventory_summary.xlsx");
  },

  // GET /api/inventory/product/:productId/batch-history?export=true
  async exportProductHistory(productId: string): Promise<{ blob: Blob; filename: string }> {
    return fetchBlob(
      `api/inventory/product/${productId}/batch-history?export=true`,
      `product_batch_history_${productId}.xlsx`
    );
  },
};