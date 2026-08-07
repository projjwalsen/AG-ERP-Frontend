import { apiFetch } from "./api";
import { fetchBlob } from "@/lib/download";
import {
  PurchaseOrder,
  PurchaseOrderResponse,
  PurchaseOrdersListResponse,
  PurchaseOrderStatus,
} from "../types/purchase-order";
import type { ProductUnit } from "../types/product";

export interface GetPurchaseOrdersParams {
  page?: number;
  limit?: number;
  status?: PurchaseOrderStatus;
  agencyId?: string;
  branchId?: string;
  search?: string;
}

export interface CreatePurchaseOrderPayload {
  agencyId: string;
  branchId: string;
  remarks?: string;
  items: {
    productId: string;
    quantity: number;
    unit: ProductUnit;
    purchasePrice: number;
  }[];
}

export interface RejectPurchaseOrderPayload {
  purchaseOrderId: string;
  remarks: string;
}

export interface PurchaseOrderInvoiceEntryItem {
  purchaseOrderItemId: string;
  productId: string;
  productName: string;
  sku?: string | null;
  hsnNo?: string | null;
  gstPercent: number;
  orderedQuantity: number;
  quantity: number;
  unit: ProductUnit;
  purchasePrice: number;
  batchNo?: string | null;
}

export interface PurchaseOrderInvoiceEntry {
  purchaseOrderId: string;
  poNo: string;
  poDate: string;
  remarks?: string | null;
  agency: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
    code?: string | null;
  };
  items: PurchaseOrderInvoiceEntryItem[];
}

function unwrapPurchaseOrder(data?: PurchaseOrder | PurchaseOrderResponse) {
  if (!data) return undefined;
  return "purchaseOrder" in data ? data.purchaseOrder : data;
}

export const purchaseOrderApi = {
  async getAll(
    params?: GetPurchaseOrdersParams
  ): Promise<{ success: boolean; message: string; data?: PurchaseOrdersListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.status) queryParams.append("status", params.status);
    if (params?.agencyId) queryParams.append("agencyId", params.agencyId);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.search) queryParams.append("search", params.search);

    const query = queryParams.toString();
    const url = query ? `api/purchase-orders/list?${query}` : "api/purchase-orders/list";
    return apiFetch<PurchaseOrdersListResponse>(url);
  },

  async getById(
    purchaseOrderId: string
  ): Promise<{ success: boolean; message: string; data?: PurchaseOrder }> {
    const response = await apiFetch<PurchaseOrderResponse>(
      `api/purchase-orders/${purchaseOrderId}`
    );
    return {
      ...response,
      data: unwrapPurchaseOrder(response.data),
    };
  },

  async getInvoiceEntry(
    purchaseOrderId: string
  ): Promise<{ success: boolean; message: string; data?: PurchaseOrderInvoiceEntry }> {
    return apiFetch<PurchaseOrderInvoiceEntry>(
      `api/purchase-orders/${purchaseOrderId}/invoice-entry`
    );
  },

  async create(
    payload: CreatePurchaseOrderPayload
  ): Promise<{ success: boolean; message: string; data?: PurchaseOrder }> {
    const response = await apiFetch<PurchaseOrderResponse>("api/purchase-orders/create", {
      method: "POST",
      body: payload,
    });
    return {
      ...response,
      data: unwrapPurchaseOrder(response.data),
    };
  },

  async approve(
    purchaseOrderId: string
  ): Promise<{ success: boolean; message: string; data?: PurchaseOrder }> {
    const response = await apiFetch<PurchaseOrderResponse>(
      `api/purchase-orders/${purchaseOrderId}/approve`,
      { method: "PATCH" }
    );
    return {
      ...response,
      data: unwrapPurchaseOrder(response.data),
    };
  },

  async reject(
    payload: RejectPurchaseOrderPayload
  ): Promise<{ success: boolean; message: string; data?: PurchaseOrder }> {
    const response = await apiFetch<PurchaseOrderResponse>(
      `api/purchase-orders/${payload.purchaseOrderId}/reject`,
      {
        method: "PATCH",
        body: { remarks: payload.remarks },
      }
    );
    return {
      ...response,
      data: unwrapPurchaseOrder(response.data),
    };
  },

  async previewPdf(purchaseOrderId: string, poNo?: string): Promise<{ blob: Blob; filename: string }> {
    return fetchBlob(
      `api/purchase-orders/${purchaseOrderId}/pdf`,
      `Purchase-Order-${poNo || purchaseOrderId}.pdf`
    );
  },

  async downloadPdf(purchaseOrderId: string, poNo?: string): Promise<{ blob: Blob; filename: string }> {
    return fetchBlob(
      `api/purchase-orders/${purchaseOrderId}/pdf?download=true`,
      `Purchase-Order-${poNo || purchaseOrderId}.pdf`
    );
  },
};
