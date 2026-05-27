// Inventory Types - matches backend API contract

export type BatchStatus = "ACTIVE" | "INACTIVE" | "LOW_STOCK" | "OUT_OF_STOCK";
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