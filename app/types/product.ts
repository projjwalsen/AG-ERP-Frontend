// Product Types - matches backend API contract

export type ProductUnit = "KG" | "LTR";

// Backend enum from prisma/schema.prisma
// - PURCHASED  : only ever bought from vendors
// - MANUFACTURED: produced in-house from a recipe
// - BOTH       : can be purchased AND manufactured
export type ProductType = "PURCHASED" | "MANUFACTURED" | "BOTH";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description?: string;
  disclaimer?: string;
  hsnNo?: string;
  applicableGST?: number;
  baseUnit: ProductUnit;
  density?: number;
  operationalUnit: ProductUnit;
  minimumStockKG?: number;
  openingStockKG?: number;
  sellPricePerUnit: number;
  sellPriceLTR: number;
  productType?: ProductType;
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