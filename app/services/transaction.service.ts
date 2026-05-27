// Transaction API Service
import { apiFetch } from "./api";
import { Transaction, TransactionsListResponse, TransactionResponse } from "../types/transaction";

export interface GetTransactionsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: "RECEIVE" | "RELEASE";
  status?: "PENDING" | "APPROVED" | "REJECTED";
  paymentMode?: "CASH" | "CHEQUE" | "ONLINE";
  agencyId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateTransactionPayload {
  type: "RECEIVE" | "RELEASE";
  agencyId: string;
  amount: number;
  paymentMode: "CASH" | "CHEQUE" | "ONLINE";
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  transactionId?: string;
  remarks?: string;
  branchId?: string;
}

export interface ApproveTransactionPayload {
  transactionId: string;
  remarks?: string;
}

export interface RejectTransactionPayload {
  transactionId: string;
  rejectionReason: string;
}

export const transactionApi = {
  async getAll(params?: GetTransactionsParams): Promise<{ success: boolean; message: string; data?: TransactionsListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.type) queryParams.append("type", params.type);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.paymentMode) queryParams.append("paymentMode", params.paymentMode);
    if (params?.agencyId) queryParams.append("agencyId", params.agencyId);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const query = queryParams.toString();
    const url = query ? `api/transactions/all?${query}` : "api/transactions/all";
    return apiFetch<TransactionsListResponse>(url);
  },

  async getById(transactionId: string): Promise<{ success: boolean; message: string; data?: TransactionResponse }> {
    return apiFetch<TransactionResponse>(`api/transactions/${transactionId}`);
  },

  async create(payload: CreateTransactionPayload): Promise<{ success: boolean; message: string; data?: TransactionResponse }> {
    return apiFetch<TransactionResponse>("api/transactions/create", {
      method: "POST",
      body: payload,
    });
  },

  async approve(payload: ApproveTransactionPayload): Promise<{ success: boolean; message: string; data?: TransactionResponse }> {
    return apiFetch<TransactionResponse>(`api/transactions/approve/${payload.transactionId}`, {
      method: "POST",
      body: { remarks: payload.remarks },
    });
  },

  async reject(payload: RejectTransactionPayload): Promise<{ success: boolean; message: string; data?: TransactionResponse }> {
    return apiFetch<TransactionResponse>(`api/transactions/reject/${payload.transactionId}`, {
      method: "POST",
      body: { rejectionReason: payload.rejectionReason },
    });
  },
};