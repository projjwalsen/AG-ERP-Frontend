// Product Ledger API Service - matches backend API contract
import { apiFetch } from "./api";
import {
  ProductLedgerListResponse,
  ProductLedgerDetail,
  ProductLedgerMovementType,
} from "../types/ledger";

export interface GetProductLedgersParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isLowStock?: boolean;
}

export interface GetProductLedgerDetailParams {
  productId: string;
  page?: number;
  limit?: number;
  movementType?: ProductLedgerMovementType;
  branchId?: string;
}

export const ledgerApi = {
  // GET /api/product-ledger - Paginated list of all product ledgers
  async getAll(params?: GetProductLedgersParams): Promise<{ success: boolean; message: string; data?: ProductLedgerListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.isLowStock !== undefined) queryParams.append("isLowStock", String(params.isLowStock));

    const query = queryParams.toString();
    const url = query ? `api/product-ledger?${query}` : "api/product-ledger";
    return apiFetch<ProductLedgerListResponse>(url);
  },

  // GET /api/product-ledger/:productId/detail - Product detail with stock + paginated movements
  async getById(params: GetProductLedgerDetailParams): Promise<{ success: boolean; message: string; data?: ProductLedgerDetail }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));
    if (params.movementType) queryParams.append("movementType", params.movementType);
    if (params.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    const url = query
      ? `api/product-ledger/${params.productId}/detail?${query}`
      : `api/product-ledger/${params.productId}/detail`;
    return apiFetch<ProductLedgerDetail>(url);
  },
};
