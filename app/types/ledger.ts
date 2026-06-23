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

export type ProductUnit = "KG" | "LTR" | "PIECE";

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

export type LedgerView = "BRANCH" | "AGENCY" | "SUSPENSE";

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

export interface SuspenseLedgerDetailResponse {
  branch: { id: string; code: string; name: string; gstin?: string | null };
  category?: "ACCOUNTING_LEDGER" | "CASH";
  summary?: {
    totalTransactions?: number;
    totalInward?: number;
    totalOutward?: number;
    cashTransactions?: number;
    cashInward?: number;
    cashOutward?: number;
  };
  transactions: SuspenseTransactionRow[];
}

// ====== Branch / Agency details (from getLedgerByBranchId / getLedgerByAgencyId) ======

export interface BranchLedgerDetailResponse {
  branch: { id: string; code: string; name: string };
  category?: string;
  summary?: Record<string, number | string | null>;
  // Backend returns transaction entries (not FinancialLedgerListItem).
  // Shape: { date, transactionNo, transactionRefNo, agency, paymentMode,
  //         paymentType, direction, inward, outward, runningBalance, remarks }
  entries?: AgencyLedgerEntry[];
  // Cash-category branch entries use a different shape — no paymentMode etc.
  cashEntries?: AgencyCashEntry[];
  // Kept for backward compatibility with any older payloads.
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
  // Backend returns transaction entries (not FinancialLedgerListItem).
  // Shape: { date, transactionNo, transactionRefNo, direction, paymentMode,
  //         paymentType, agency, inward, outward, runningBalance, remarks }
  entries?: AgencyLedgerEntry[];
  // Cash-category entries use a different shape — no paymentMode etc.
  cashEntries?: AgencyCashEntry[];
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
