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
/**
 * Legacy ONLINE / OFFLINE bucket kept only for display in read paths where
 * the server hasn't migrated to `paymentThrough` yet. New payloads should
 * send `paymentThrough` instead.
 */
export type PaymentMode = "ONLINE" | "OFFLINE";

/**
 * New payment-instrument enum the backend expects on create/update.
 * Rules:
 *   - NEFT | RTGS | UPI        → transactionRefNo  is required
 *   - CHEQUE | DD              → referenceNo       is required
 *   - CASH                     → neither is required
 *   - 3rd Party agency         → no paymentThrough at all (treated as CASH)
 */
export type PaymentThrough = "CASH" | "CHEQUE" | "DD" | "NEFT" | "RTGS" | "UPI";

export const PAYMENT_THROUGH_OPTIONS: { value: PaymentThrough; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "DD", label: "DD (Demand Draft)" },
  { value: "NEFT", label: "NEFT" },
  { value: "RTGS", label: "RTGS" },
  { value: "UPI", label: "UPI" },
];

/** Which reference field is required for a given payment-through value. */
export function requiredReferenceField(
  pt: PaymentThrough
): "transactionRefNo" | "referenceNo" | null {
  if (pt === "NEFT" || pt === "RTGS" || pt === "UPI") return "transactionRefNo";
  if (pt === "CHEQUE" || pt === "DD") return "referenceNo";
  return null; // CASH — neither
}

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
  /**
   * New field — instrument-level payment (CASH / CHEQUE / DD / NEFT /
   * RTGS / UPI). May be absent on rows that predate the migration;
   * consumers should fall back to `paymentMode` (ONLINE / OFFLINE) for
   * display.
   */
  paymentThrough?: PaymentThrough | null;
  /**
   * Bank UTR/IMPS for NEFT / RTGS / UPI. Populated by the create form
   * only when `paymentThrough` is in that set.
   */
  transactionRefNo: string | null;
  /**
   * Cheque or DD instrument number. Populated by the create form only
   * when `paymentThrough` is CHEQUE or DD.
   */
  referenceNo?: string | null;
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
  direction?: TransactionDirection;
  /**
   * What the agency owes us (DUE Amount) — sales-side outstanding.
   * Sourced from the backend's `amountDue` field.
   */
  amountDue: number;
  /**
   * What we owe the agency (Amount Receivable) — purchase-side outstanding.
   * Sourced from the backend's `amountReceivable` field.
   */
  amountReceivable: number;
  /**
   * Optional net outstanding (amountDue - amountReceivable). Surfaced by
   * older backend versions; the form falls back to 0 when missing.
   */
  netOutstanding?: number;
  /**
   * Legacy fields — kept optional so existing code that referenced
   * them doesn't immediately break, but the canonical source is now
   * `amountDue` / `amountReceivable`. Remove once all consumers are
   * migrated.
   * @deprecated use amountDue instead
   */
  salesOutstanding?: number;
  /**
   * @deprecated use amountReceivable instead
   */
  purchaseOutstanding?: number;
  /**
   * Optional pending (Amount Receivable) bucket — surfaced by the backend
   * for the new transaction form. When absent, the form falls back to
   * `amountReceivable`.
   */
  pendingAmount?: number;
  /**
   * Optional explicit due/outstanding bucket — the form labels this as
   * "DUE Amount" in the agency card. Falls back to `amountDue` when not
   * provided.
   */
  dueAmount?: number;
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
  /**
   * Required field — instrument-level enum (CASH / CHEQUE / DD / NEFT /
   * RTGS / UPI). Decides which reference field below is required.
   */
  paymentThrough: PaymentThrough;
  /**
   * Channel-level dropdown (ONLINE / OFFLINE). Sent alongside
   * `paymentThrough`; not used for validation.
   */
  paymentMode: PaymentMode;
  /**
   * Bank UTR / IMPS / UPI reference — populated for NEFT / RTGS / UPI
   * (and labelled "Transaction No" in the UI).
   */
  transactionRefNo?: string;
  /**
   * Cheque or DD instrument number — populated for CHEQUE / DD
   * (and labelled "Reference No" in the UI).
   */
  referenceNo?: string;
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
  paymentThrough?: PaymentThrough;
  paymentMode?: PaymentMode;
  transactionRefNo?: string;
  referenceNo?: string;
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
