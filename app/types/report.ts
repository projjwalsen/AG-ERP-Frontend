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

export type OutstandingType = "RECEIVABLE" | "PAYABLE";
export type SuspenseAuthStatus = "PENDING_AUTHENTICATION" | "AUTHENTICATED";
export type GSTRClassification = "B2B" | "B2C";

export interface ReportPeriod {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

// =====================================================================
// 1. OUTSTANDING REPORT — GET /api/reports/outstanding-report
// =====================================================================

export interface OutstandingLedgerRef {
  id: string;
  code: string;
  name: string;
}

export interface OutstandingRow {
  agency_id: string | null;
  agency_name: string | null;
  agency_type: string | null;
  branch: Pick<Branch, "id" | "name" | "code"> | null;
  ledger: OutstandingLedgerRef;
  openingBalance: number | string;
  debit: number | string;
  credit: number | string;
  total_outstanding: number;
  balanceType: string;
  gstin: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface OutstandingSummary {
  totalAgencies: number;
  totalOutstanding: number;
}

export interface OutstandingReportResponse {
  reportName: string;
  generatedAt: string | Date;
  summary: OutstandingSummary;
  rows: OutstandingRow[];
}

export interface GetOutstandingReportParams {
  branchId?: string;
  type?: OutstandingType;
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
  cashInFlowReceipt: number;
  remarks: string | null;
  allocations: DayBookAllocation[];
}

export interface DayBookSummary {
  totalTransactions: number;
  totalReceipts: number;
  totalPayments: number;
  netCashFlow: number;
}

export interface DayBookResponse {
  branch: Pick<Branch, "id" | "name" | "code"> & {
    gstin?: string | null;
    stateCode?: string | null;
  };
  dateRange: ReportPeriod;
  summary: DayBookSummary;
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
}

// =====================================================================
// 3. GSTR-1 REPORT — GET /api/reports/gstr1
// =====================================================================

export interface GSTR1Row {
  classification: GSTRClassification;
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
