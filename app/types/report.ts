// Reports Types — matches backend contract (AG-ERP-Backend/src/modules/reports)
//
// All endpoints live under /api/reports and are protected by authMiddleware.
// Response envelope: { success, message?, data } where `data` is the
// specific report object (outstanding / day-book / gstr1 / suspense /
// inventory). Prisma `Decimal` fields are JSON-serialized as strings and
// cast to number at the slice boundary.

import type { Branch } from "./branch";

// =====================================================================
// COMMON
// =====================================================================

export type OutstandingType = "AR" | "AP";
/**
 * Backend's wire-level type. The frontend keeps the AR/AP union for
 * tab labels, but the GET endpoint expects one of these long-form
 * values. The page maps AR → RECEIVABLE and AP → PAYABLE before
 * hitting the wire.
 */
export type OutstandingBackendType = "RECEIVABLE" | "PAYABLE";
export type OutstandingSettlementStatus =
  | "UNPAID"
  | "PARTIALLY_SETTLED"
  | "SETTLED";
export type OutstandingInvoiceType = "PURCHASE" | "SALE";
export type OutstandingBucketKey =
  | "bucket_0_30_days"
  | "bucket_31_60_days"
  | "bucket_61_90_days"
  | "bucket_91_plus_days";
export type SuspenseAuthStatus = "PENDING_AUTHENTICATION" | "AUTHENTICATED";
export type GSTRClassification = "B2B" | "B2C";

export interface ReportPeriod {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

// =====================================================================
// 1. AP / AR OUTSTANDING — GET /api/reports/outstanding-report?type=AR|AP
// =====================================================================
//
// Backend returns a nested structure: one row per agency, with four
// aging buckets (0-30 / 31-60 / 61-90 / 91+ days). Each bucket carries
// its own `amount` and an `invoices` array. A separate top-level
// `detailRows` flattens the same data into a per-invoice ledger view —
// used both for the "detail" toggle and for export.

export interface OutstandingInvoiceRecord {
  id: string;
  agencyId: string;
  branchId: string | null;
  invoiceNo: string | null;
  invoiceDate: string | Date | null;
  supplierInvoiceDate: string | Date | null;
  voucherType: string | null;
  otherReference: string | null;
  subtotalAmount: number | string;
  totalCGSTAmount: number | string;
  totalSGSTAmount: number | string;
  totalIGSTAmount: number | string;
  totalGSTAmount: number | string;
  roundOffAmount: number | string;
  grandTotal: number | string;
  status: string;
  remarks: string | null;
  createdById: string;
  approvedById: string | null;
  approvedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  agency?: Record<string, unknown> | null;
  branch?: Record<string, unknown> | null;
  allocations?: Array<Record<string, unknown>>;
}

export interface OutstandingBucketInvoice {
  invoiceId: string;
  invoiceType: OutstandingInvoiceType;
  invoiceNo: string | null;
  invoiceDate: string | Date | null;
  invoiceAgeDays: number;
  grandTotal: number;
  allocatedAmount: number;
  outstandingAmount: number;
  settlementStatus: OutstandingSettlementStatus;
  invoice: OutstandingInvoiceRecord;
}

export interface OutstandingBucket {
  amount: number;
  invoices: OutstandingBucketInvoice[];
}

export interface OutstandingRow {
  agencyId: string;
  agencyName: string;
  vendorCode: string | null;
  totalOutstanding: number;
  bucket_0_30_days: OutstandingBucket;
  bucket_31_60_days: OutstandingBucket;
  bucket_61_90_days: OutstandingBucket;
  bucket_91_plus_days: OutstandingBucket;
}

export interface OutstandingDetailRow {
  vendorCode: string;
  vendorName: string;
  billNo: string | null;
  billDate: string | Date | null;
  dueDate: string | Date | null;
  billAmount: number;
  gstAmount: number;
  tds: number;
  paidAmount: number;
  balanceAmount: number;
  agingDays: number;
  agingBucket: string;
  branch: string | null;
  remarks: string | null;
}

export interface OutstandingSummary {
  totalAgencies: number;
  totalInvoices: number;
  totalOutstanding: number;
  bucket_0_30_days: number;
  bucket_31_60_days: number;
  bucket_61_90_days: number;
  bucket_91_plus_days: number;
}

export interface OutstandingReportResponse {
  reportName: string;
  generatedAt: string | Date;
  summary: OutstandingSummary;
  rows?: OutstandingRow[];
  detailRows?: OutstandingDetailRow[];
  /**
   * Single-agency bucket breakdown. Populated only when the request
   * hits the agency-scoped endpoint with `agencyId` and no
   * `export=...` flag. In that mode `rows` is omitted entirely — the
   * single agency lives here instead.
   */
  agencyDetails?: OutstandingRow;
  /**
   * Backend echoes back the agency id that was filtered on (and the
   * agency name). Helpful when the page drives directly off the
   * agency-scoped endpoint.
   */
  agencyId?: string;
  agency?: { id: string; name: string };
  branchId?: string | null;
}

export interface GetOutstandingReportParams {
  branchId?: string;
  type?: OutstandingBackendType;
}

// =====================================================================
// 2. BRANCH DAY BOOK — GET /api/reports/branch/:branchId/day-book
// =====================================================================

export interface DayBookAllocation {
  sourceType: string;
  invoiceNo: string | null;
  allocatedAmount: number;
}

export interface DayBookEntry {
  serialNo: number;
  voucherId: string;
  transactionId: string;
  transactionDate: string | Date;
  primaryAgencyName: string | null;
  paymentMode: string | null;
  paymentType: string | null;
  transactionRef: string | null;
  inRoutedVia: boolean;
  secondaryAgencyName: string | null;
  debit: number;
  credit: number;
  remarks: string | null;
  allocations: DayBookAllocation[];
  runningBalance: number | null;
}

export interface DayBookSummary {
  totalTransactions: number;
  totalReceipts: number;
  totalPayments: number;
  netCashFlow: number;
}

export interface DayBookPagination {
  page: number;
  limit: number;
  totalEntries: number;
  totalPages: number;
}

export interface DayBookResponse {
  branch: Pick<Branch, "id" | "name" | "code"> & {
    gstin?: string | null;
    stateCode?: string | null;
  };
  dateRange: ReportPeriod;
  summary: DayBookSummary;
  pagination: DayBookPagination;
  entries: DayBookEntry[];
  /**
   * Day Book endpoint does not return a `generatedAt` field the way the
   * other reports do — we keep the `new Date()` to satisfy callers that
   * surface a "generated at" line in the header.
   */
  generatedAt?: string | Date;
}

export interface GetDayBookParams {
  branchId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  /**
   * When set, the backend scopes the day-book to transactions that
   * posted against this bank account under the selected branch.
   * Mirrors `bankAccountId` in
   * `AG-ERP-Backend/src/modules/reports/reporting.routes.ts`.
   */
  bankAccountId?: string;
}

// =====================================================================
// 3. GSTR-1 REPORT — GET /api/reports/gstr1
// =====================================================================

export interface GSTR1Row {
  classification: GSTRClassification;
  branchName?: string | null;
  branchGst?: string | null;
  customer_gstin: string | null;
  invoice_number: string;
  invoice_date: string | Date;
  place_of_supply_pos: string | null;
  taxable_value: number;
  cgst_rate_amount: number;
  sgst_rate_amount: number;
  igst_rate_amount: number;
  branch_state_code: string | null;
  customer_state_code: string | null;
  invoice_total: number;
}

export interface GSTR1Summary {
  totalInvoices: number;
  b2bInvoices: number;
  b2cInvoices: number;
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalGST: number;
  totalInvoiceValue: number;
}

export interface GSTR1ReportResponse {
  reportName: string;
  generatedAt: string | Date;
  period: ReportPeriod;
  branchId?: string | null;
  summary: GSTR1Summary;
  rows: GSTR1Row[];
}

export interface GetGSTR1Params {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

// =====================================================================
// 4. GST SUSPENSE LOG — GET /api/reports/gst-suspense-log
// =====================================================================

export interface SuspenseRow {
  suspense_id: string;
  bank_clearance_date: string | Date;
  amount_received: number;
  payment_channel: string | null;
  reported_remarks: string;
  auth_status: SuspenseAuthStatus;
  agency_id: string | null;
  agency_name: string | null;
  branch: Pick<Branch, "id" | "name" | "code">;
}

export interface SuspenseSummary {
  totalSuspenseEntries: number;
  pendingAuthentication: number;
  authenticated: number;
  totalAmount: number;
}

export interface SuspenseReportResponse {
  reportName: string;
  generatedAt: string | Date;
  summary: SuspenseSummary;
  rows: SuspenseRow[];
}

export interface GetSuspenseParams {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

// =====================================================================
// 5. STOCK INVENTORY REPORT — GET /api/reports/stock-inventory
// =====================================================================

export interface InventoryRow {
  productCode: string;
  productName: string;
  batchId: string;
  branch: Pick<Branch, "id" | "name" | "code"> & { gstn?: string | null };
  stockKG: number;
  stockLTR: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface InventorySummary {
  totalProducts: number;
  totalBatches: number;
  totalStockKG: number;
  totalStockLTR: number;
}

export interface InventoryReportResponse {
  reportName: string;
  generatedAt: string | Date;
  summary: InventorySummary;
  rows: InventoryRow[];
}

export interface GetInventoryParams {
  branchId?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
}
