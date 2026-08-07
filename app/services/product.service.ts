// Product API Service
import { apiFetch } from "./api";
import { fetchBlob } from "@/lib/download";
import {
  Product,
  ProductType,
  ProductsListResponse,
  ProductResponse,
  PaginationMeta,
  ProductUnit,
} from "../types/product";

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  /** Optional ProductType filter — used by manufacturing to list
   *  MANUFACTURED/BOTH products only. Backend does not currently
   *  accept this query param; included for forward-compat. */
  productType?: ProductType;
}

export interface CreateProductRecipePayload {
  outputQuantity: number;
  outputUnit: ProductUnit;
  remarks?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unit: ProductUnit;
  }>;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  category: string;
  description?: string;
  disclaimer?: string;
  hsnNo?: string;
  applicableGST?: number;
  baseUnit: ProductUnit;
  density?: number;
  operationalUnit: ProductUnit;
  minimumStockKG?: number;
  sellPricePerUnit: number;
  /**
   * PURCHASED | MANUFACTURED | BOTH. Defaults to PURCHASED server-side
   * when omitted; we send it explicitly so manufactured products are
   * properly typed at the source.
   */
  productType?: ProductType;
  recipe?: CreateProductRecipePayload;
}

export interface UpdateProductPayload {
  name?: string;
  sku?: string;
  category?: string;
  description?: string;
  disclaimer?: string;
  hsnNo?: string;
  applicableGST?: number;
  baseUnit?: ProductUnit;
  density?: number;
  operationalUnit?: ProductUnit;
  minimumStockKG?: number;
  sellPricePerUnit?: number;
  productType?: ProductType;
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
    if (params?.productType) queryParams.append("productType", params.productType);

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

  // GET /api/products/all-list?export=true
  // Streams the full products list as an .xlsx file (no pagination).
  async exportExcel(params?: Omit<GetProductsParams, "page" | "limit">): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("export", "true");
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.productType) queryParams.append("productType", params.productType);

    return fetchBlob(`api/products/all-list?${queryParams.toString()}`, "products.xlsx");
  },
};
