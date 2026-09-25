// Journal Types - matches backend API contract

export type JournalHeadType = "INWARD" | "OUTWARD";
export type JournalDirection = JournalHeadType | "BOTH";
export type JournalHeadLevel = "PARENT" | "SUBHEAD";

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
  type: JournalDirection;
  headType?: JournalHeadLevel;
  parentId?: string | null;
  parent?: Pick<JournalHead, "id" | "name" | "parentId"> | null;
  isActive?: boolean;
  ledger?: LedgerSummary | null;
  createdAt?: string;
  updatedAt?: string;
}

export function getJournalHeadPath(head: JournalHead, heads: JournalHead[]): string {
  const names = [head.name];
  const visited = new Set([head.id]);
  let parentId = head.parentId ?? head.parent?.id ?? null;

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = heads.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentId ?? parent.parent?.id ?? null;
  }

  return names.join(" / ");
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
  categoryId?: string | null;
  category?: JournalCategory | null;
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

export interface JournalCategory {
  id: string;
  name: string;
  isActive?: boolean;
  journalHeadId?: string | null;
  journalHead?: JournalHead | null;
}
