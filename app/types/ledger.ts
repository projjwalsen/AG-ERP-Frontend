// Product Ledger Types - matches backend API contract
// (the live product ledger is exposed via the product-ledger endpoints;
//  the empty ledger.service.ts in /accounting/ledger/ is a placeholder)

export type ProductLedgerDirection = "DEBIT" | "CREDIT";
export type ProductLedgerMovementType =
  | "OPENING_BALANCE"
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "RETURN_IN"
  | "RETURN_OUT"
  | "DAMAGE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT";

export type ProductUnit = "KG" | "LTR" | "MT" | "PIECE";

export interface ProductLedgerListItem {
  id: string;
  code: string;
  productId: string;
  productName: string;
  productSKU: string;
  productCategory?: string;
  baseUnit?: ProductUnit;
  globalStockKG: number;
  globalStockLTR: number;
  minimumStockKG: number | null;
  sellPricePerUnit: number;
  isLowStock: boolean;
  isActive: boolean;
}

export interface ProductLedgerListResponse {
  data: ProductLedgerListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ProductLedgerEntry {
  id: string;
  movementType: ProductLedgerMovementType;
  direction: ProductLedgerDirection;
  quantityKG: number;
  quantityLTR: number | null;
  runningStockKG?: number;
  unit: ProductUnit;
  branch: { id: string; name: string; code: string } | null;
  agency: { id: string; name: string; type: string } | null;
  purchaseId: string | null;
  saleId: string | null;
  invoiceNo: string | null;
  batchNo: string | null;
  unitCost: number | null;
  totalCost: number | null;
  remarks: string | null;
  entryDate: string;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface ProductLedgerBranchStock {
  branchId: string;
  branchName: string;
  branchCode: string;
  currentStockKG: number;
  currentStockLTR: number;
}

export interface ProductLedgerDetail {
  product: {
    id: string;
    name: string;
    sku: string;
    category?: string;
    baseUnit?: ProductUnit;
    density: number | null;
    minimumStockKG: number | null;
    applicableGST: number;
    sellPricePerUnit: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  ledger: { id: string; code: string; isActive: boolean } | null;
  stock: {
    globalStockKG: number;
    globalStockLTR: number;
    openingStockKG?: number;
    closingStockKG?: number;
    isLowStock: boolean;
  };
  branchStock: ProductLedgerBranchStock[];
  movements: {
    entries: ProductLedgerEntry[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

// =============== FINANCIAL LEDGER TYPES ===============

export type FinancialLedgerType =
  | "CUSTOMER"
  | "VENDOR"
  | "BANK"
  | "CASH"
  | "GST"
  | "SALES"
  | "PURCHASE"
  | "PRODUCT"
  | "SUSPENSE";

export type FinancialLedgerNature = "DEBIT" | "CREDIT";

export type BalanceType = "DR" | "CR";

export type LedgerView = "BRANCH" | "AGENCY" | "SUSPENSE" | "COMPANY";

// ====== Company Ledger (whole-company consolidated statement) ======

export interface CompanyLedgerEntry {
  serialNo: number;
  // Backend sends dates as pre-formatted IST strings (e.g. "22-Jun-2026").
  // Some payloads may send an ISO timestamp — renderer handles both.
  date: string;
  // Branch name attached to this entry (optional; some summary rows omit it).
  branch?: string | null;
  description: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CompanyLedgerResponse {
  company: { name: string };
  summary: {
    totalIncome: number;
    totalExpense: number;
    closingBalance: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalEntries: number;
    totalPages: number;
  };
  entries: CompanyLedgerEntry[];
}

// ====== GST Ledger Report (backend: /api/ledgers/gst-ledger) ======

export interface GSTLedgerEntry {
  date: string;
  particulars: string;
  voucherNo: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
}

export interface GSTLedgerTotals {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
}

export interface GSTLedgerGroup {
  entries: GSTLedgerEntry[];
  totals: GSTLedgerTotals;
}

export interface GSTLiabilityRow {
  output: number;
  input: number;
  payable: number;
}

export interface GSTLiabilitySummary {
  cgst: GSTLiabilityRow;
  sgst: GSTLiabilityRow;
  igst: GSTLiabilityRow;
  total: GSTLiabilityRow;
}

export interface GSTLedgerResponse {
  company: { name: string };
  period: { startDate?: string | null; endDate?: string | null };
  inputGSTLedger: GSTLedgerGroup;
  outputGSTLedger: GSTLedgerGroup;
  liabilitySummary: GSTLiabilitySummary;
}

export interface LedgerGroupMaster {
  id: string;
  code: string;
  name: string;
  nature: FinancialLedgerNature;
  parentId: string | null;
  parent?: LedgerGroupMaster | null;
  children?: LedgerGroupMaster[];
  _count?: { ledgers: number };
}

export interface FinancialLedgerListItem {
  id: string;
  code: string;
  name: string;
  category: FinancialLedgerType;
  nature: FinancialLedgerNature;
  group: { code: string; name: string };
  branch: { id: string; code: string; name: string } | null;
  agency: { id: string; name: string } | null;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
  balanceType: BalanceType;
  gstin: string | null;
  pan: string | null;
  isActive: boolean;
}

export interface FinancialLedgerListResponse {
  data: FinancialLedgerListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ====== View mode rows (BRANCH / AGENCY / SUSPENSE) ======

export interface BranchViewRow {
  id: string;
  code: string;
  name: string;
  gstin?: string | null;
  openingBalance: number;
  totalDebit?: number;
  totalCredit?: number;
  totalReceivable?: number;
  totalPayable?: number;
  balanceAmount?: number;
  closingBalance: number;
  balanceType?: "RECEIVABLE" | "PAYABLE" | "DR" | "CR";
  ledgerCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgencyViewRow {
  id: string;
  name: string;
  gstin?: string | null;
  openingBalance: number;
  totalDebit?: number;
  totalCredit?: number;
  totalReceivable?: number;
  totalPayable?: number;
  balanceAmount?: number;
  closingBalance: number;
  balanceType?: "RECEIVABLE" | "PAYABLE" | "DR" | "CR";
  ledgerCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SuspenseBranchInfo {
  id: string;
  name: string;
  code: string;
  gstin: string | null;
  stateCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  phnNumber?: string | null;
  email?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SuspenseTransactionRow {
  id: string;
  transactionNo: string;
  branch: SuspenseBranchInfo;
  agency: { id: string; name: string } | null;
  direction: "INWARD" | "OUTWARD";
  amount: number;
  paymentMode: string;
  paymentType: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

// Each branch returned by /api/ledgers/get-all?view=SUSPENSE
export interface SuspenseBranchView {
  branch: SuspenseBranchInfo;
  summary: {
    totalTransactions: number;
    totalInward: number;
    totalOutward: number;
  };
  data: SuspenseTransactionRow[];
}

export type LedgerViewRow = BranchViewRow | AgencyViewRow | SuspenseBranchView;

// ====== Branch / Agency / Suspense details ======

/**
 * One row of the suspense ledger detail. The backend returns
 * `entries[]` (income/expense style) rather than the previous
 * `transactions[]` shape — the renderer in
 * `app/ledger/financial/suspense/[branchId]/page.tsx` is built around
 * this contract.
 */
export interface SuspenseLedgerEntry {
  serialNo: number;
  date: string;
  voucherNo: string;
  description: string;
  income: number;
  expense: number;
  paymentMode: string;
  paymentType: string;
  transactionRefNo?: string | null;
  remarks?: string | null;
}

export interface SuspenseLedgerDetailResponse {
  branch: { id: string; code: string; name: string; gstin?: string | null };
  category?: "ACCOUNTING_LEDGER" | "CASH";
  summary?: {
    totalTransactions?: number;
    totalIncome?: number;
    totalExpense?: number;
    closingBalance?: number;
    totalInward?: number;
    totalOutward?: number;
    cashTransactions?: number;
    cashInward?: number;
    cashOutward?: number;
  };
  entries: SuspenseLedgerEntry[];
}

// ====== Branch / Agency details (from getLedgerByBranchId / getLedgerByAgencyId) ======

export interface BranchLedgerDetailResponse {
  branch: { id: string; code: string; name: string; amountReceivable?: number; amountPayable?: number };
  category?: string;
  summary?: Record<string, number | string | null>;
  // ===== Category-specific payload =====
  // ACCOUNTING_LEDGER: voucher-style entries.
  entries?: AgencyVoucherEntry[];
  // ACCOUNTING_LEDGER: income/expense style (branches currently return this).
  incomeExpenseEntries?: BranchLedgerEntry[];
  // CASH (voucher-style).
  cashEntries?: AgencyCashVoucherEntry[];
  // CASH (older transactional shape).
  cashTransactionEntries?: AgencyCashEntry[];
  // CREDITORS / DEBTORS: grouped by ledger.
  data?: AgencyPartyLedgerGroup[];
  // GST: backend returns the list of GST ledgers (CGST/SGST/IGST)
  // directly under `ledgers` with summary keys
  // { totalGSTLedgers, totalDebit, totalCredit, totalBalance, createdAt, updatedAt }.
  ledgers?: FinancialLedgerListItem[];
}

export interface AgencyLedgerDetailResponse {
  agency: {
    id: string;
    name: string;
    type?: string;
    gstin?: string | null;
    contactPerson?: string | null;
    mobileNumber?: string | null;
    email?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    stateCode?: string | null;
    pinCode?: string | null;
    isActive?: boolean;
    amountReceivable?: string | number | null;
    amountPayable?: string | number | null;
    createdAt?: string;
    updatedAt?: string;
  };
  category?: string;
  summary?: Record<string, number | string | null>;
  // ===== Category-specific payload =====
  // ACCOUNTING_LEDGER: voucher-style entries.
  //   entries: AgencyVoucherEntry[] = { date, voucherNo, particular, debit, credit, balance }
  //   summary: { openingBalance, totalPurchases, totalPayments, closingBalance }
  entries?: AgencyVoucherEntry[];
  // CASH (voucher-style): { date, voucherNo, particular, debit, credit, balance }
  cashEntries?: AgencyCashVoucherEntry[];
  // CASH (older transactional shape): { date, transactionNo, branch, relatedParty,
  //   direction, receipt, payment, narration }
  cashTransactionEntries?: AgencyCashEntry[];
  // CREDITORS / DEBTORS: grouped by ledger (typically one group per agency/branch).
  data?: AgencyPartyLedgerGroup[];
  // Kept for backward compatibility with any older payloads.
  ledgers?: FinancialLedgerListItem[];
}

export interface AgencyLedgerEntry {
  date: string;
  transactionNo: string;
  transactionRefNo?: string | null;
  direction: "INWARD" | "OUTWARD";
  paymentMode?: string;
  paymentType?: string;
  agency?: string | null;
  inward?: number;
  outward?: number;
  runningBalance?: number;
  remarks?: string | null;
}

// Cash-category entries (category=CASH). Different shape — no
// paymentMode/paymentType/inward/outward/runningBalance/remarks, instead
// carries branch, relatedParty, receipt, payment, narration.
export interface AgencyCashEntry {
  date: string;
  transactionNo: string;
  transactionRefNo?: string | null;
  branch?: string | null;
  agency?: string | null;
  relatedParty?: string | null;
  direction: "INWARD" | "OUTWARD";
  receipt?: number;
  payment?: number;
  narration?: string | null;
}

// Accounting-ledger entries (category=ACCOUNTING_LEDGER).
// Voucher-style statement: { date, voucherNo, particular, debit, credit, balance }.
// CREDITORS / DEBTORS responses come back richer (with id, voucherType,
// invoiceNo, counterLedgers[], runningBalance, balanceType, narration,
// sourceDocument) — see `AgencyPartyStatementEntry` for the extended shape
// used inside `AgencyPartyLedgerGroup.entries`.
export interface AgencyVoucherEntry {
  date: string | null;
  voucherNo: string;
  particular: string;
  debit: number;
  credit: number;
  balance: number;
}

// Richer statement entry used inside CREDITORS / DEBTORS grouped responses
// (AgencyPartyLedgerGroup.entries). Extends the basic voucher fields with
// the metadata the backend returns on each ledger entry.
export interface AgencyPartyStatementEntry extends AgencyVoucherEntry {
  id?: string | null;
  voucherId?: string | null;
  voucherType?: string | null;
  invoiceNo?: string | null;
  sourceId?: string | null;
  sourceDocument?: {
    sourceId?: string;
    voucherType?: string;
    voucherNo?: string;
  };
  counterLedgers?: Array<{ id: string; code: string; name: string }>;
  runningBalance?: number;
  balanceType?: "DR" | "CR";
  narration?: string | null;
}

// Branch income/expense entries (category=ACCOUNTING_LEDGER for branches).
// { serialNo, date, description, income, expense, balance }
export interface BranchLedgerEntry {
  serialNo: number;
  date: string;
  description: string;
  income: number;
  expense: number;
  balance: number;
}

// Cash ledger entries — voucher-style shape.
// { date, voucherNo, particular, debit, credit, balance }
export interface AgencyCashVoucherEntry {
  date: string;
  voucherNo: string;
  particular: string;
  debit: number;
  credit: number;
  balance: number;
}

// Sundry Debtors / Creditors grouped response.
// { data: [{ ledger: {id, code, name}, entries: AgencyPartyStatementEntry[], summary: ... }] }
export interface AgencyPartyLedgerGroup {
  ledger: { id: string; code: string; name: string };
  entries: AgencyPartyStatementEntry[];
  summary: {
    openingBalance: number;
    openingBalanceType: "DR" | "CR";
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    closingBalanceType: "DR" | "CR";
  };
}

export interface FinancialLedgerDetail {
  ledger: {
    id: string;
    code: string;
    name: string;
    category: FinancialLedgerType;
    nature: FinancialLedgerNature;
    gstApplicable: boolean;
    gstin: string | null;
    pan: string | null;
    creditLimit: number | null;
    group: { id: string; code: string; name: string };
    branch: { id: string; code: string; name: string } | null;
    agency?: { id: string; name: string };
    agencies?: { id: string; name: string }[];
    isActive: boolean;
    createdBy?: { id: string; name: string };
  };
  balances: {
    openingBalance: number;
    currentBalance: number;
    debit: number;
    credit: number;
    closingBalance: number;
    balanceType: BalanceType;
  };
  outstanding: { amount: number; type: "RECEIVABLE" | "PAYABLE" } | null;
  statistics: { voucherCount: number };
}

export interface FinancialLedgerStatementEntry {
  id: string | null;
  type: "OPENING" | "ENTRY";
  date: string;
  voucherId: string | null;
  voucherNo: string | null;
  voucherType: string | null;
  invoiceNo: string | null;
  sourceId: string;
  branch: { id: string; name: string; code: string } | null;
  counterLedgers: { id: string; code: string; name: string }[];
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: BalanceType;
  narration: string | null;
  sourceDocument: {
    sourceId: string;
    voucherType: string;
    voucherNo: string;
  };
}

export interface FinancialLedgerStatementResponse {
  ledger: {
    id: string;
    code: string;
    name: string;
    category: FinancialLedgerType;
    nature: FinancialLedgerNature;
    group: { id: string; code: string; name: string };
    branch: { id: string; code: string; name: string } | null;
    agency: { id: string; name: string } | null;
  };
  summary: {
    openingBalance: number;
    openingBalanceType: BalanceType;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    closingBalanceType: BalanceType;
  };
  outstanding: { receivable: number; payable: number } | null;
  entries: FinancialLedgerStatementEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
