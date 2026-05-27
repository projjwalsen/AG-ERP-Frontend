// Transaction Types

export type TransactionType = "RECEIVE" | "RELEASE";
export type PaymentMode = "CASH" | "CHEQUE" | "ONLINE";
export type TransactionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Transaction {
  id: string;
  transactionNumber: string;
  type: TransactionType;
  agencyId: string;
  agency?: {
    id: string;
    name: string;
    type: "VENDOR" | "CLIENT" | "BOTH";
  };
  amount: number;
  paymentMode: PaymentMode;
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  transactionId?: string;
  remarks?: string;
  status: TransactionStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  agencyId: string;
  amount: number;
  paymentMode: PaymentMode;
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

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionsListResponse {
  transactions: Transaction[];
  pagination?: PaginationMeta;
}

export interface TransactionResponse {
  transaction: Transaction;
}