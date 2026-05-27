// Product API Service
import { apiFetch } from "./api";
import { Product, ProductsListResponse, ProductResponse, PaginationMeta } from "../types/product";

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  category: string;
  description?: string;
  hsnNo?: string;
  applicableGST?: number;
  baseUnit: "KG" | "LTR";
  density?: number;
  operationalUnit: "KG" | "LTR";
  minimumStockKG?: number;
  sellPricePerUnit: number;
}

export interface UpdateProductPayload {
  name?: string;
  sku?: string;
  category?: string;
  description?: string;
  hsnNo?: string;
  applicableGST?: number;
  baseUnit?: "KG" | "LTR";
  density?: number;
  operationalUnit?: "KG" | "LTR";
  minimumStockKG?: number;
  sellPricePerUnit?: number;
}

// Raw API response types
interface RawActiveProductsResponse {
  success: boolean;
  message: string;
  data?: Product[] | { products: Product[] };
}

export const productApi = {
  async getAll(params?: GetProductsParams): Promise<{ success: boolean; message: string; data?: ProductsListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category) queryParams.append("category", params.category);

    const query = queryParams.toString();
    const url = query ? `/api/products/all-list?${query}` : "/api/products/all-list";
    return apiFetch<{ products: Product[]; meta: PaginationMeta }>(url).then((response) => ({
      success: response.success,
      message: response.message,
      data: response.data ? {
        products: response.data.products,
        meta: response.data.meta,
        pagination: response.data.meta,
      } : undefined,
    }));
  },

  // Backend may return active products as either a direct array or wrapped object.
  async getActive(): Promise<{ success: boolean; message: string; data?: { products: Product[] } }> {
    const response: RawActiveProductsResponse = await apiFetch(`/api/products/active-list`);
    const products = Array.isArray(response.data)
      ? response.data
      : response.data?.products ?? [];

    return {
      success: response.success,
      message: response.message,
      data: response.success ? { products } : undefined,
    };
  },

  async getById(productId: string): Promise<{ success: boolean; message: string; data?: ProductResponse }> {
    return apiFetch<ProductResponse>(`/api/products/${productId}`);
  },

  async create(payload: CreateProductPayload): Promise<{ success: boolean; message: string; data?: ProductResponse }> {
    return apiFetch<ProductResponse>("/api/products/create", {
      method: "POST",
      body: payload,
    });
  },

  async update(productId: string, payload: UpdateProductPayload): Promise<{ success: boolean; message: string; data?: ProductResponse }> {
    return apiFetch<ProductResponse>(`/api/products/update/${productId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  async updateStatus(productId: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/products/toggle-status/${productId}`, {
      method: "PATCH",
      body: { isActive },
    });
  },
};