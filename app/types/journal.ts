// Journal Types - matches backend API contract

export type JournalHeadType = "INWARD" | "OUTWARD";

export type JournalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PaymentMode = "ONLINE" | "OFFLINE";

export type PaymentType =
  | "CASH"
  | "NEFT"
  | "RTGS"
  | "UPI"
  | "CHEQUE"
  | "DD"
  | "BANK_DEPOSIT";

export interface LedgerSummary {
  id: string;
  code?: string;
  name?: string;
  category?: string;
  nature?: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email?: string;
}

export interface BranchSummary {
  id: string;
  code?: string;
  name: string;
}

export interface VoucherSummary {
  id: string;
  voucherNo: string;
  voucherType: string;
}

export interface JournalHead {
  id: string;
  name: string;
  type: JournalHeadType;
  isActive?: boolean;
  ledger?: LedgerSummary | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Journal {
  id: string;
  branchId: string;
  journalHeadId: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentThrough?: PaymentType;
  remarks?: string | null;
  journalDate: string;
  status: JournalStatus;
  branch?: BranchSummary;
  journalHead?: JournalHead;
  voucher?: VoucherSummary | null;
  createdBy?: UserSummary;
  approvedBy?: UserSummary | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JournalsListResponse {
  journals: Journal[];
  meta?: PaginationMeta;
  pagination?: PaginationMeta;
}

export interface JournalHeadsListResponse {
  journalHeads: JournalHead[];
}

export interface JournalResponse {
  journal: Journal;
}

export interface JournalHeadResponse {
  journalHead: JournalHead;
}