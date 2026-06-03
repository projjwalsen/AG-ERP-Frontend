// Sales API Service - matches backend API contract
import { apiFetch } from "./api";
import { Sales, SalesListResponse } from "../types/sales";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";

/**
 * Internal helper to fetch a binary response (PDF) with auth cookies.
 * Returns the Blob plus a best-effort filename parsed from Content-Disposition
 * (falls back to the supplied defaultName).
 */
async function fetchPdfBlob(endpoint: string, defaultName: string): Promise<{ blob: Blob; filename: string }> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const url = `${API_BASE_URL}/${cleanEndpoint}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`,
    }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  const blob = await response.blob();

  // Best-effort filename extraction from Content-Disposition
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : defaultName;

  return { blob, filename };
}

export interface GetSalesParams {
  page?: number;
  limit?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  branchId?: string;
}

// Payload matches backend API contract
export interface CreateSalesPayload {
  agencyId: string;
  branchId: string;
  items: {
    productId: string;
    batchId: string;
    quantity: number;
    unit: "KG" | "LTR";
    unitPrice?: number;
  }[];
  remarks?: string;
  deliveryNote:string;
  suppliersRef: string;
  otherReference:string;
  buyerOrderNo: string;
  buyerOrderDate: string,
  despatchDocNo: string,
  despatchDocDate: string,
  despatchThrough: string,
  destination: string,
  invoiceDate?: string,

}

export interface ApproveSalesPayload {
  saleId: string;
  remarks?: string;
}

export interface RejectSalesPayload {
  saleId: string;
  remarks: string;
}

export const salesApi = {
  // GET /api/sales/get-all
  async getAll(params?: GetSalesParams): Promise<{ success: boolean; message: string; data?: SalesListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.status) queryParams.append("status", params.status);
    if (params?.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    const url = query ? `api/sales/get-all?${query}` : "api/sales/get-all";
    return apiFetch<SalesListResponse>(url);
  },

  // GET /api/sales/:saleId
  async getById(saleId: string): Promise<{ success: boolean; message: string; data?: Sales }> {
    return apiFetch<Sales>(`api/sales/${saleId}`);
  },

  // POST /api/sales/create
  async create(payload: CreateSalesPayload): Promise<{ success: boolean; message: string; data?: Sales }> {
    return apiFetch<Sales>("api/sales/create", {
      method: "POST",
      body: payload,
    });
  },

  // PATCH /api/sales/:saleId/approve
  async approve(payload: ApproveSalesPayload): Promise<{ success: boolean; message: string; data?: Sales }> {
    return apiFetch<Sales>(`api/sales/${payload.saleId}/approve`, {
      method: "PATCH",
      body: { remarks: payload.remarks },
    });
  },

  // PATCH /api/sales/:saleId/reject
  async reject(payload: RejectSalesPayload): Promise<{ success: boolean; message: string; data?: Sales }> {
    return apiFetch<Sales>(`api/sales/${payload.saleId}/reject`, {
      method: "PATCH",
      body: { remarks: payload.remarks },
    });
  },

  // GET /api/sales/invoice/preview/:saleId
  // Returns the invoice PDF as a Blob plus its filename (parsed from Content-Disposition).
  // Use this for PENDING sales to show an in-app preview.
  async previewInvoice(saleId: string): Promise<{ blob: Blob; filename: string }> {
    return fetchPdfBlob(
      `api/sales/invoice/preview/${saleId}`,
      `invoice-preview-${saleId}.pdf`
    );
  },

  // GET /api/sales/invoice/download/:saleId
  // Returns the invoice PDF as a Blob plus its filename (parsed from Content-Disposition).
  // Use this for APPROVED sales to trigger a browser download.
  async downloadInvoice(saleId: string): Promise<{ blob: Blob; filename: string }> {
    return fetchPdfBlob(
      `api/sales/invoice/download/${saleId}`,
      `invoice-${saleId}.pdf`
    );
  },
};