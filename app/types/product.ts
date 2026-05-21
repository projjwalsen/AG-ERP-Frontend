// Product Types

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

export interface ProductsListResponse {
  products: Product[];
}

export interface ProductResponse {
  product: Product;
}