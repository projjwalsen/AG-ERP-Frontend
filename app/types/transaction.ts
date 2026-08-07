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
 * Settlement type the backend expects on create/update. The previous
 * "3rd Party Transaction" toggle used `paymentType: "THIRD_PARTY"`; the
 * new flow asks the user to pick *how* the payment is settled:
 *
 *   - INVOICE_TO_INVOICE  → apply the payment against one specific invoice
 *                           (sale for INWARD, purchase for OUTWARD). The
 *                           transaction amount MUST equal the invoice's
 *                           outstanding — server-enforced.
 *
 *   - LUMPSUM             → apply a single amount that gets FIFO-allocated
 *                           across the primary agency's outstanding
 *                           invoices AND the third-party counter-party's
 *                           invoices on approval. Requires a third-party
 *                           agency; primary and third-party agencies must
 *                           differ; both must have enough outstanding for
 *                           the requested amount.
 */
export type SettlementType = "INVOICE_TO_INVOICE" | "LUMPSUM";

export const SETTLEMENT_TYPE_OPTIONS: {
  value: SettlementType;
  label: string;
  description: string;
}[] = [
  {
    value: "INVOICE_TO_INVOICE",
    label: "Invoice to Invoice",
    description:
      "Settle the payment against a single invoice. The amount must match the invoice's outstanding.",
  },
  {
    value: "LUMPSUM",
    label: "Lumpsum",
    description:
      "Apply a single amount that gets FIFO-allocated across both the primary and counter-party agency invoices on approval.",
  },
];
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
 *
 * Note: this list mirrors the OpenAPI scalar (`CASH / CHEQUE / DD / NEFT /
 * RTGS / UPI`). The backend's Prisma enum also includes `BANK_DEPOSIT`,
 * which the documented `/create` schema accepts but the form dropdown
 * doesn't surface — extend `PAYMENT_THROUGH_OPTIONS` when you need it.
 */
export type PaymentThrough = "CASH" | "CHEQUE" | "DD" | "NEFT" | "RTGS" | "UPI";

export const PAYMENT_THROUGH_OPTIONS: { value: PaymentThrough; label: string }[] = [
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
  /**
   * Settlement type carried by the new flow. Older rows predating the
   * migration were stored with `paymentType: "THIRD_PARTY"` instead —
   * the form synthesises a settlement type from `paymentType` for those
   * (THIRD_PARTY → LUMPSUM) when reading back.
   */
  settlementType?: SettlementType | null;
  /**
   * For invoice-to-invoice settlements, the resolved invoice id. The
   * server enforces INWARD → `saleId` and OUTWARD → `purchaseId`, but
   * carries both columns on the row regardless.
   */
  saleId?: string | null;
  purchaseId?: string | null;
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
  /**
   * New field. Drives which validations the backend runs at create time.
   * Required for non-suspense transactions.
   */
  settlementType: SettlementType;
  suspense: boolean;
  agencyId?: string;
  /**
   * Required when settlementType === 'LUMPSUM'. Backend rejects
   * third-party for invoice-to-invoice settlements.
   */
  thirdPartyAgencyId?: string;
  /**
   * Required when settlementType === 'INVOICE_TO_INVOICE' and
   * direction === 'INWARD'. Populated via /api/transactions/invoices.
   * Mutually exclusive with purchaseId.
   */
  saleId?: string;
  /**
   * Required when settlementType === 'INVOICE_TO_INVOICE' and
   * direction === 'OUTWARD'. Mutually exclusive with saleId.
   */
  purchaseId?: string;
  paymentThrough: PaymentThrough;
  /**
   * Channel-level dropdown (ONLINE / OFFLINE). Sent alongside
   * paymentThrough; not used for validation.
   */
  paymentMode: PaymentMode;
  amount: number;
  /**
   * Bank UTR / IMPS / UPI reference — populated for NEFT / RTGS / UPI
   * (and labelled "Transaction No" in the UI).
   */
  transactionRefNo?: string;
  /**
   * Cheque / DD instrument number — populated for CHEQUE / DD
   * (and labelled "Reference No" in the UI).
   */
  referenceNo?: string;
  /**
   * Bank account the transaction posts against. Populated when the
   * user picks a non-cash Payment Through and an account under the
   * selected branch. Optional — backend accepts transactions
   * without it.
   */
  bankAccountId?: string;
  remarks?: string;
}

export interface UpdateTransactionPayload {
  branchId?: string;
  direction?: TransactionDirection;
  settlementType?: SettlementType;
  suspense?: boolean;
  agencyId?: string;
  thirdPartyAgencyId?: string;
  saleId?: string;
  purchaseId?: string;
  amount?: number;
  paymentThrough?: PaymentThrough;
  paymentMode?: PaymentMode;
  transactionRefNo?: string;
  referenceNo?: string;
  remarks?: string;
}

export interface OutstandingInvoice {
  id: string;
  invoiceNo: string | null;
  invoiceDate?: string | Date | null;
  invoiceType: "SALE" | "PURCHASE";
  grandTotal: number;
  allocatedAmount: number;
  outstandingAmount: number;
  fullySettled: boolean;
  partiallySettled: boolean;
  agencyId: string;
  branchId: string;
}

export interface FifoInvoicePreview {
  invoiceId: string;
  invoiceNo: string | null;
  invoiceType: "SALE" | "PURCHASE";
  invoiceDate: string | Date;
  fifoOrder: number;
  totalAmount: number;
  outstandingAmount: number;
  payingAmount: number;
  remainingOutstanding: number;
  settlementStatus: "FULLY_SETTLED" | "PARTIALLY_SETTLED";
}

export interface FifoAgencyPreview {
  agency: { id: string; name: string };
  requestedAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  canProceed: boolean;
  invoices: FifoInvoicePreview[];
}

export interface FifoPreviewResponse {
  settlementType: "LUMPSUM";
  direction: TransactionDirection;
  requestedAmount: number;
  canProceed: boolean;
  reason: string | null;
  primaryAgency: FifoAgencyPreview;
  thirdPartyAgency: FifoAgencyPreview;
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
