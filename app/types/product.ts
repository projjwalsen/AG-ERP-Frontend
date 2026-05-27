// Product Types - matches backend API contract

export type ProductUnit = "KG" | "LTR";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description?: string;
  hsnNo?: string;
  applicableGST?: number;
  baseUnit: ProductUnit;
  density?: number;
  operationalUnit: ProductUnit;
  minimumStockKG?: number;
  sellPricePerUnit: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  conversionPreview?: {
    formula?: string;
    density?: number;
    sampleKg?: number;
    equivalentLtr?: number;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

// Backend returns: { data: { products: Product[], meta: PaginationMeta } }
export interface ProductsListResponse {
  products: Product[];
  meta?: PaginationMeta;
  pagination?: PaginationMeta; // Alias for compatibility
}

export interface ProductResponse {
  product: Product;
}