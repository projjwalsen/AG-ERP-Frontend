// Transaction Types — matches backend contract (AG-ERP-Backend/src/modules/transaction)
//
// All endpoints sit behind authMiddleware and live under /api/transactions.
// Response envelope: { success, message, data }. The list endpoint returns
// { data: Transaction[], meta: PaginationMeta }; single/create/update/approve/
// reject all return { data: Transaction } with no wrapper.

import type { User } from "./api";

export type TransactionDirection = "INWARD" | "OUTWARD";
export type TransactionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type TransactionPaymentType = "NORMAL" | "THIRD_PARTY";
export type PaymentMode = "ONLINE" | "OFFLINE";

export interface Branch {
  id: string;
  name: string;
  code: string;
  city?: string;
  state?: string;
}

export interface Agency {
  id: string;
  name: string;
  type: "CLIENT" | "VENDOR" | "BOTH";
  gstin?: string;
  contactPerson?: string;
  mobileNumber?: string;
  email?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface Transaction {
  id: string;
  transactionNo: string;
  status: TransactionStatus;
  branchId: string;
  direction: TransactionDirection;
  suspenseAccount: boolean;
  agencyId: string | null;
  paymentType: TransactionPaymentType;
  thirdPartyAgencyId: string | null;
  amount: number;
  paymentMode: PaymentMode;
  transactionRefNo: string | null;
  remarks: string | null;
  createdById: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  // Joined relations (optional — server may omit)
  branch?: Branch;
  agency?: Agency | null;
  thirdPartyAgency?: Agency | null;
  createdBy?: User;
  approvedBy?: User;
}

export interface TransactionsListResponse {
  data: Transaction[];
  meta: PaginationMeta;
}

export interface TransactionResponse {
  data: Transaction;
}

export interface AgencyOutstanding {
  direction: TransactionDirection;
  salesOutstanding: number;
  purchaseOutstanding: number;
  netOutstanding: number;
}

// =================== PAYLOADS ===================

export interface GetTransactionsParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  agencyId?: string;
  status?: TransactionStatus;
  direction?: TransactionDirection;
  paymentType?: TransactionPaymentType;
  suspenseAccount?: boolean;
}

export interface CreateTransactionPayload {
  branchId: string;
  direction: TransactionDirection;
  suspense: boolean;
  agencyId?: string;
  paymentType: TransactionPaymentType;
  thirdPartyAgencyId?: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionRefNo?: string;
  remarks?: string;
}

export interface UpdateTransactionPayload {
  branchId?: string;
  direction?: TransactionDirection;
  suspense?: boolean;
  agencyId?: string;
  paymentType?: TransactionPaymentType;
  thirdPartyAgencyId?: string;
  amount?: number;
  paymentMode?: PaymentMode;
  transactionRefNo?: string;
  remarks?: string;
}

export interface RejectTransactionPayload {
  transactionId: string;
  remarks: string;
}

// =================== UI HELPERS ===================

export const statusColors: Record<TransactionStatus, { bg: string; text: string }> = {
  PENDING: { bg: "bg-amber-100", text: "text-amber-700" },
  APPROVED: { bg: "bg-emerald-100", text: "text-emerald-700" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700" },
};

export const statusLabels: Record<TransactionStatus, string> = {
  PENDING: "Pending Authentication",
  APPROVED: "Authenticated",
  REJECTED: "Rejected",
};
