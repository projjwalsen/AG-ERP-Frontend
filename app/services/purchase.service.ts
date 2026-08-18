// Purchase API Service - matches backend API contract
import { apiFetch } from "./api";
import { Purchase, PurchasesListResponse } from "../types/purchase";

export interface GetPurchasesParams {
  page?: number;
  limit?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  voucherType?: "PURCHASE" | "RCM_PURCHASE";
  branchId?: string;
  search?: string;
}

/**
 * Mirrors POST /api/purchases/create. All string fields are sent through
 * verbatim — empty strings / undefined fields are removed at the slice
 * boundary so the wire payload matches the curl contract:
 *
 * {
 *   agencyId, branchId, invoiceNo,
 *   invoiceDate?, supplierInvoiceDate?, otherReference?,
 *   roundOffAmount?, remarks?,
 *   transport?: { purchaseOrderNo, purchaseOrderDate, receiptNoteNo,
 *                 receiptNoteDate, lrNo, dispatchThrough, destination,
 *                 vehicleOrFlightNo, portOfLoading, portOfDischarge,
 *                 countryTo, billOfEntryNo, billOfEntryDate, portCode },
 *   items: [{ productId, batchNo, quantity, unit, purchasePrice }]
 * }
 */
export interface PurchaseTransportDetails {
  purchaseOrderNo?: string;
  purchaseOrderDate?: string;
  receiptNoteNo?: string;
  receiptNoteDate?: string;
  lrNo?: string;
  dispatchThrough?: string;
  destination?: string;
  vehicleOrFlightNo?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  countryTo?: string;
  billOfEntryNo?: string;
  billOfEntryDate?: string;
  portCode?: string;
}

export interface CreatePurchasePayload {
  purchaseOrderId?: string;
  agencyId: string;
  branchId: string;
  invoiceNo: string;
  invoiceDate?: string;
  supplierInvoiceDate?: string;
  voucherType?: "PURCHASE" | "RCM_PURCHASE";
  otherReference?: string;
  roundOffAmount?: number;
  remarks?: string;
  transport?: PurchaseTransportDetails;
  items: {
    productId: string;
    batchNo: string;
    quantity: number;
    unit: "KG" | "LTR" | "MT";
    purchasePrice: number;
  }[];
}

export interface ApprovePurchasePayload {
  purchaseId: string;
}

export interface RejectPurchasePayload {
  purchaseId: string;
  remarks: string;
}

export const purchaseApi = {
  // GET /api/purchases/get-all
  async getAll(params?: GetPurchasesParams): Promise<{ success: boolean; message: string; data?: PurchasesListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.status) queryParams.append("status", params.status);
    if (params?.voucherType) queryParams.append("voucherType", params.voucherType);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.search?.trim()) queryParams.append("search", params.search.trim());

    const query = queryParams.toString();
    const url = query ? `api/purchases/get-all?${query}` : "api/purchases/get-all";
    return apiFetch<PurchasesListResponse>(url);
  },

  // GET /api/purchases/:purchaseId
  async getById(purchaseId: string): Promise<{ success: boolean; message: string; data?: Purchase }> {
    return apiFetch<Purchase>(`api/purchases/${purchaseId}`);
  },

  // POST /api/purchases/create
  async create(payload: CreatePurchasePayload): Promise<{ success: boolean; message: string; data?: Purchase }> {
    return apiFetch<Purchase>("api/purchases/create", {
      method: "POST",
      body: payload,
    });
  },

  // PATCH /api/purchases/:purchaseId/approve
  async approve(purchaseId: string): Promise<{ success: boolean; message: string; data?: Purchase }> {
    return apiFetch<Purchase>(`api/purchases/${purchaseId}/approve`, {
      method: "PATCH",
    });
  },

  // PATCH /api/purchases/:purchaseId/reject
  async reject(payload: RejectPurchasePayload): Promise<{ success: boolean; message: string; data?: Purchase }> {
    return apiFetch<Purchase>(`api/purchases/${payload.purchaseId}/reject`, {
      method: "PATCH",
      body: { remarks: payload.remarks },
    });
  },
};
