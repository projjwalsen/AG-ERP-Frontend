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
  search?: string;
}

/**
 * Mirrors POST /api/sales/create. Items are FLAT — each row is exactly
 * one (product, batch) pair carrying `quantity` and an optional
 * `unitPrice` override. To allocate quantity for a single product from
 * N batches, send N items. The backend computes GST / totals itself
 * from the resolved batch + product + agency branch-state.
 *
 * Wire shape (matches `SalesItemPayload` in `sales.service.ts`):
 *
 * {
 *   agencyId, branchId,
 *   invoiceNo?, invoiceDate?, remarks?, voucherType?, otherReference?,
 *   roundOffAmount?, suppliersRef?, deliveryNote?,
 *   buyerOrderNo?, buyerOrderDate?, despatchDocNo?, despatchDocDate?,
 *   despatchThrough?, destination?,
 *   transport?: { ... },
 *   items: [{ productId, batchId, quantity, unit, unitPrice? }]
 * }
 */
export interface SaleTransportDetails {
  /** Delivery — fields not currently filled remain blank strings. */
  deliveryNote?: string;
  buyerOrderNo?: string;
  buyerOrderDate?: string;
  termsOfDelivery?: string;

  /** Dispatch. */
  despatchDocNo?: string;
  despatchDocDate?: string;
  despatchThrough?: string;
  destination?: string;
  vehicleOrFlightNo?: string;

  billOfLadingNo?: string;

  /** Export. */
  portOfLoading?: string;
  portOfDischarge?: string;
  countryTo?: string;
  shippingNo?: string;
  shippingDate?: string;
  portCode?: string;

  /** Convenience aliases kept for the form (mapped into the matching
      backend field on submit). */
  lrNo?: string;
  receiptNoteNo?: string;
  receiptNoteDate?: string;
  purchaseOrderNo?: string;
  purchaseOrderDate?: string;
  dispatchThrough?: string;
  billOfEntryNo?: string;
  billOfEntryDate?: string;
}

export interface CreateSalesItem {
  productId: string;
  batchId: string;
  quantity: number;
  unit: "KG" | "LTR";
  /** Optional override; backend falls back to the product's per-unit
   *  default price when omitted. */
  unitPrice?: number;
}

export interface CreateSalesPayload {
  agencyId: string;
  branchId: string;
  invoiceNo?: string;
  invoiceDate?: string;
  remarks?: string;
  voucherType?: string;
  otherReference?: string;
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  qrCodeImage?: string;
  modeOfPayment?: string;
  referenceNo?: string;
  referenceDate?: string;
  roundOffAmount?: number;
  suppliersRef?: string;
  deliveryNote?: string;
  buyerOrderNo?: string;
  buyerOrderDate?: string;
  despatchDocNo?: string;
  despatchDocDate?: string;
  despatchThrough?: string;
  destination?: string;
  transport?: SaleTransportDetails;
  items: CreateSalesItem[];
}

function cleanOptional(value?: string) {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function normalizeSalesPayload(
  payload: CreateSalesPayload
): CreateSalesPayload {
  const input = payload.transport || {};

  const transport: SaleTransportDetails = {
    deliveryNote: cleanOptional(
      input.deliveryNote || payload.deliveryNote
    ),
    buyerOrderNo: cleanOptional(
      input.buyerOrderNo ||
      input.purchaseOrderNo ||
      payload.buyerOrderNo
    ),
    buyerOrderDate:
      input.buyerOrderDate ||
      input.purchaseOrderDate ||
      payload.buyerOrderDate,
    termsOfDelivery:
      cleanOptional(input.termsOfDelivery),
    despatchDocNo: cleanOptional(
      input.despatchDocNo || payload.despatchDocNo
    ),
    despatchDocDate:
      input.despatchDocDate || payload.despatchDocDate,
    despatchThrough: cleanOptional(
      input.despatchThrough ||
      input.dispatchThrough ||
      payload.despatchThrough
    ),
    destination: cleanOptional(
      input.destination || payload.destination
    ),
    vehicleOrFlightNo:
      cleanOptional(input.vehicleOrFlightNo),
    billOfLadingNo: cleanOptional(
      input.billOfLadingNo || input.lrNo
    ),
    portOfLoading: cleanOptional(input.portOfLoading),
    portOfDischarge: cleanOptional(input.portOfDischarge),
    countryTo: cleanOptional(input.countryTo),
    shippingNo: cleanOptional(input.shippingNo),
    shippingDate: input.shippingDate,
    portCode: cleanOptional(input.portCode),
  };

  const hasTransport = Object.values(transport).some(
    value => value !== undefined && value !== ""
  );

  return {
    agencyId: payload.agencyId,
    branchId: payload.branchId,
    invoiceNo: cleanOptional(payload.invoiceNo),
    invoiceDate: payload.invoiceDate,
    remarks: cleanOptional(payload.remarks),
    voucherType: cleanOptional(payload.voucherType),
    otherReference: cleanOptional(payload.otherReference),
    irn: cleanOptional(payload.irn),
    ackNo: cleanOptional(payload.ackNo),
    ackDate: payload.ackDate,
    qrCodeImage: cleanOptional(payload.qrCodeImage),
    modeOfPayment: cleanOptional(payload.modeOfPayment),
    referenceNo: cleanOptional(payload.referenceNo),
    referenceDate: payload.referenceDate,
    roundOffAmount: payload.roundOffAmount,
    transport: hasTransport ? transport : undefined,
    items: payload.items,
  };
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
    if (params?.search?.trim()) queryParams.append("search", params.search.trim());

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
      body: normalizeSalesPayload(payload),
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