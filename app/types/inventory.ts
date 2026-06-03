// Inventory Types - matches backend API contract

export type BatchStatus = "ACTIVE" | "INACTIVE" | "LOW_STOCK" | "OUT_OF_STOCK" | "IN_STOCK";
export type ProductUnit = "KG" | "LTR";

// Available batch for sales dropdown (from /api/inventory/batches)
export interface AvailableBatch {
  id: string;
  batchNo: string;
  purchasePrice: number;
  availableQtyKG: number;
  availableQtyLTR: number;
  isActive: boolean;
  createdAt: string;
  lastUpdated?: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  product?: {
    id: string;
    name: string;
    sku: string;
    baseUnit?: ProductUnit;
    minimumStockKG?: number;
    density?: number;
  };
}

// Inventory batch for management page (from /api/inventory/batches/all)
export interface InventoryBatch {
  id: string;
  batchNo: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    category?: string;
    baseUnit?: ProductUnit;
    minimumStockKG?: number;
    density?: number;
  };
  branchId: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  purchasePrice: number;
  availableQtyKG: number;
  availableQtyLTR: number;
  isActive: boolean;
  status?: BatchStatus;
  createdAt: string;
  lastUpdated?: string;
  updatedAt?: string;
}

// Inventory summary record (from /api/inventory/summary) - product-wise
// stock aggregated across all branches. One row per product.
export interface InventorySummaryRecord {
  productId: string;
  name: string;
  sku: string;
  baseUnit?: string;
  density?: string;
  totalStockKG: number;
  totalStockLTR: number;
  minimumStockKG: string;
  branchCount: number;
  status: BatchStatus;
}

export interface InventorySummaryListResponse {
  data: InventorySummaryRecord[];
  meta: PaginationMeta;
}

// Batch history for a single product across all branches (from /api/inventory/product/:productId/batch-history)
export interface ProductBatchHistoryBatch {
  id: string;
  batchNo: string;
  purchasePrice: string;
  availableQtyKG: string;
  availableQtyLTR: string;
  isActive: boolean;
  createdAt: string;
  lastUpdated: string;
}

export interface ProductBatchHistoryBranch {
  branchId: string;
  branchName: string;
  branchCode: string;
  stateCode?: string;
  city?: string;
  state?: string;
  addressLine1?: string;
  addressLine2?: string;
  batches: ProductBatchHistoryBatch[];
}

export interface ProductBatchHistoryProduct {
  id: string;
  name: string;
  sku: string;
  baseUnit?: string;
  density?: string;
  hsnNo?: string;
  sellPricePerUnit?: string;
  minimumStockKG?: string;
}

export interface ProductBatchHistoryResponse {
  product: ProductBatchHistoryProduct;
  branches: ProductBatchHistoryBranch[];
}

export interface InventorySummary {
  totalProducts: number;
  activeBatches: number;
  lowStockItems: number;
  outOfStock: number;
  totalValue: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface InventoryListResponse {
  data: InventoryBatch[];
  meta: PaginationMeta;
}

export interface InventoryResponse {
  batch: InventoryBatch;
}