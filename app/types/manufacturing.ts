// Manufacturing Types - matches backend AG-ERP-Backend/src/modules/manufacturing/

import { ProductUnit, ProductType } from "./product";

export type ProductRecipeStatus = "DRAFT" | "APPROVED" | "LOCKED" | "REJECTED";
export type ProductManufactureStatus = "DRAFT" | "APPROVED" | "REJECTED";

// Mirror of Prisma Decimal — Prisma returns these as JSON strings by default.
// Manufacturing service explicitly rounds to number on /preview, /create,
// and /approve, but the raw /recipes/:id responses still serialize
// Decimal(18,3) as a string. Keep these typed as `string | number` so
// both the human-friendly formatted display and the raw response work.
export type DecimalLike = string | number;

// ----- Recipe -----

export interface RecipeItem {
  id?: string;
  recipeId?: string;
  productId: string;
  /** Decimal(18,3) — string when from raw /recipes, number when from preview. */
  quantity: DecimalLike;
  unit: ProductUnit;
  createdAt?: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
    productType?: ProductType;
    baseUnit?: ProductUnit;
  };
}

export interface ProductRecipe {
  id: string;
  outputProductId: string;
  /** Decimal(18,3) — server returns as string. */
  outputQuantity: DecimalLike;
  outputUnit: ProductUnit;
  version: number;
  remarks: string | null;
  status: ProductRecipeStatus;
  createdById: string;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  outputProduct: {
    id: string;
    name: string;
    sku?: string;
    productType?: ProductType;
    baseUnit?: ProductUnit;
    applicableGST?: number;
    sellPricePerUnit?: number;
    hsnNo?: string;
  };
  items: RecipeItem[];
}

export interface CreateRecipePayload {
  outputProductId: string;
  outputQuantity: number;
  outputUnit: ProductUnit;
  remarks?: string;
  items: {
    productId: string;
    quantity: number;
    unit: ProductUnit;
  }[];
}

export interface RejectRecipePayload {
  remarks?: string;
}

export interface RecipeResponse {
  recipe: ProductRecipe;
}

export interface RecipesListResponse {
  recipes: ProductRecipe[];
}

// ----- Preview -----

export interface PreviewAllocation {
  productId: string;
  productName: string;
  batchId: string;
  batchNo: string;
  quantity: number;
  unit: ProductUnit;
  unitCost: number;
  totalCost: number;
}

export interface PreviewInsufficient {
  productId: string;
  productName: string;
  requiredQuantity: number;
  availableQuantity: number;
  shortage: number;
  unit: ProductUnit;
}

export interface ManufacturePreview {
  recipe: ProductRecipe;
  outputQuantity: number;
  canManufacture: boolean;
  allocations: PreviewAllocation[];
  insufficient: PreviewInsufficient[];
  totalManufacturingCost: number;
  unitManufacturingCost: number;
}

export interface PreviewRequest {
  recipeId: string;
  branchId: string;
  outputQuantity: number;
}

// ----- Manufacture -----

export interface ProductManufactureConsumption {
  id: string;
  manufactureId: string;
  productId: string;
  batchId: string;
  quantity: number;
  unit: ProductUnit;
  unitCost: number;
  totalCost: number;
  createdAt: string;
  productName?: string;
}

export interface ProductManufacture {
  id: string;
  recipeId: string;
  outputProductId: string;
  branchId: string;
  outputBatchId: string | null;
  outputBatchNo: string;
  outputQuantity: DecimalLike;
  outputUnit: ProductUnit;
  totalManufacturingCost: number;
  unitManufacturingCost: number;
  remarks: string | null;
  status: ProductManufactureStatus;
  voucherId: string | null;
  createdById: string;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  outputProduct?: {
    id: string;
    name: string;
    sku?: string;
    productType?: ProductType;
  };
  recipe?: ProductRecipe;
  consumptions?: ProductManufactureConsumption[];
  voucher?: {
    id: string;
    voucherNo: string;
    voucherType: string;
    narration?: string;
    totalAmount?: number;
    entries?: Array<{
      id: string;
      entryType: string;
      amount: number;
      ledgerId: string;
      productId?: string;
      narration?: string;
    }>;
  };
}

export interface CreateManufacturePayload {
  recipeId: string;
  branchId: string;
  outputQuantity: number;
  remarks?: string;
}

export interface RejectManufacturePayload {
  remarks?: string;
}

export interface ManufactureResponse {
  manufacture: ProductManufacture;
}

export interface ManufacturesListResponse {
  manufactures: ProductManufacture[];
}

// ----- Helpers -----

/**
 * Prisma Decimal values arrive as JSON strings for some endpoints and
 * numbers for others (manufacturing service explicitly `Number(...)`
 * converts on preview/create/approve). This helper normalises to a
 * finite number for display without losing the integer part.
 *
 * Use this only for DISPLAY formatting — never for arithmetic on raw
 * backend-decision data. The backend is authoritative.
 */
export function toFiniteNumber(value: DecimalLike | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
