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
