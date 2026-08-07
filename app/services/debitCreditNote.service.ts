import { apiFetch } from "./api";
import { fetchBlob } from "@/lib/download";
import {
  DebitCreditNote,
  DebitCreditNoteInvoicesResponse,
  DebitCreditNoteSourceType,
  DebitCreditNoteStatus,
  DebitCreditNoteType,
  DebitCreditNotesListResponse,
} from "../types/debitCreditNote";

export interface GetDebitCreditNotesParams {
  page?: number;
  limit?: number;
  status?: DebitCreditNoteStatus;
  sourceType?: DebitCreditNoteSourceType;
  type?: DebitCreditNoteType;
  agencyId?: string;
  branchId?: string;
  saleId?: string;
  purchaseId?: string;
}

export interface GetDebitCreditNoteInvoicesParams {
  sourceType: DebitCreditNoteSourceType;
  agencyId?: string;
  branchId?: string;
  search?: string;
}

export interface CreateDebitCreditNotePayload {
  type: DebitCreditNoteType;
  sourceType: DebitCreditNoteSourceType;
  agencyId: string;
  branchId: string;
  saleId?: string | null;
  purchaseId?: string | null;
  noteDate?: string;
  narration?: string;
  particulars: Array<{
    description: string;
    amount: number;
  }>;
}

export interface ApproveDebitCreditNotePayload {
  noteId: string;
}

export interface RejectDebitCreditNotePayload {
  noteId: string;
  remarks?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";

async function fetchDebitCreditNotePdf(
  endpoint: string,
  defaultName: string,
  method: "GET" | "PATCH" = "GET"
): Promise<{ blob: Blob; filename: string }> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const response = await fetch(`${API_BASE_URL}/${cleanEndpoint}`, {
    method,
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response
      .text()
      .then((text) => {
        try {
          return JSON.parse(text).message || text;
        } catch {
          return text;
        }
      })
      .catch(() => `HTTP error! status: ${response.status}`);
    throw new Error(message || `HTTP error! status: ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : defaultName;

  return { blob, filename };
}

export const debitCreditNoteApi = {
  async getAll(params?: GetDebitCreditNotesParams): Promise<{ success: boolean; message: string; data?: DebitCreditNotesListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.status) queryParams.append("status", params.status);
    if (params?.sourceType) queryParams.append("sourceType", params.sourceType);
    if (params?.type) queryParams.append("type", params.type);
    if (params?.agencyId) queryParams.append("agencyId", params.agencyId);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.saleId) queryParams.append("saleId", params.saleId);
    if (params?.purchaseId) queryParams.append("purchaseId", params.purchaseId);

    const query = queryParams.toString();
    const url = query ? `api/debit-credit-notes?${query}` : "api/debit-credit-notes";
    return apiFetch<DebitCreditNotesListResponse>(url);
  },

  async getInvoices(params: GetDebitCreditNoteInvoicesParams): Promise<{ success: boolean; message: string; data?: DebitCreditNoteInvoicesResponse }> {
    const queryParams = new URLSearchParams();
    queryParams.append("sourceType", params.sourceType);
    if (params.agencyId) queryParams.append("agencyId", params.agencyId);
    if (params.branchId) queryParams.append("branchId", params.branchId);
    if (params.search) queryParams.append("search", params.search);

    return apiFetch<DebitCreditNoteInvoicesResponse>(`/api/debit-credit-notes/invoices?${queryParams.toString()}`);
  },

  async create(payload: CreateDebitCreditNotePayload): Promise<{ success: boolean; message: string; data?: DebitCreditNote }> {
    const response = await apiFetch<{ note: DebitCreditNote }>("/api/debit-credit-notes", {
      method: "POST",
      body: payload,
    });

    return {
      success: response.success,
      message: response.message,
      data: response.data?.note,
    };
  },

  async getById(noteId: string): Promise<{ success: boolean; message: string; data?: DebitCreditNote }> {
    const response = await apiFetch<{ note: DebitCreditNote }>(`api/debit-credit-notes/${noteId}`);
    return {
      success: response.success,
      message: response.message,
      data: response.data?.note,
    };
  },

  async approve(noteId: string): Promise<{ success: boolean; message: string; data?: DebitCreditNote }> {
    await fetchDebitCreditNotePdf(`api/debit-credit-notes/${noteId}/approve`, `${noteId}.pdf`, "PATCH");
    return this.getById(noteId);
  },

  async approvePdf(noteId: string): Promise<{ blob: Blob; filename: string }> {
    return fetchDebitCreditNotePdf(`api/debit-credit-notes/${noteId}/approve`, `${noteId}.pdf`, "PATCH");
  },

  async previewPdf(noteId: string): Promise<{ blob: Blob; filename: string }> {
    return fetchBlob(`api/debit-credit-notes/${noteId}/pdf`, `${noteId}.pdf`);
  },

  async downloadPdf(noteId: string): Promise<{ blob: Blob; filename: string }> {
    return fetchBlob(`api/debit-credit-notes/${noteId}/pdf?download=true`, `${noteId}.pdf`);
  },

  async reject(payload: RejectDebitCreditNotePayload): Promise<{ success: boolean; message: string; data?: DebitCreditNote }> {
    const response = await apiFetch<{ note: DebitCreditNote }>(`api/debit-credit-notes/${payload.noteId}/reject`, {
      method: "PATCH",
      body: { remarks: payload.remarks },
    });
    return {
      success: response.success,
      message: response.message,
      data: response.data?.note,
    };
  },
};
