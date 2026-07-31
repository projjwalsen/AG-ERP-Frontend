// Product Types - matches backend API contract

export type ProductUnit = "KG" | "LTR" | "MT";

// Backend enum from prisma/schema.prisma
// - PURCHASED  : only ever bought from vendors
// - MANUFACTURED: produced in-house from a recipe
// - BOTH       : can be purchased AND manufactured
export type ProductType = "PURCHASED" | "MANUFACTURED" | "BOTH";

export interface ProductRecipeItemSummary {
  id?: string;
  recipeId?: string;
  productId: string;
  quantity: number | string;
  unit: ProductUnit;
  product?: {
    id: string;
    name: string;
    sku?: string;
  };
}

export interface ProductRecipeOutput {
  id: string;
  outputProductId: string;
  outputQuantity: number | string;
  outputUnit: ProductUnit;
  version: number;
  remarks?: string | null;
  status?: string;
  createdById?: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  items: ProductRecipeItemSummary[];
}

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
  recipeOutputs?: ProductRecipeOutput[];
  conversionPreview?: {
    formula?: string;
    density?: number;
    sampleKg?: number;
    equivalentLtr?: number;
  };
  availableStockKG?:number;
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