// Sales Types - matches backend API contract

export type SalesStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ProductUnit = "KG" | "LTR";

export interface SalesItemProduct {
  id: string;
  name: string;
  sku: string;
  category?: string;
  description?: string;
  hsnNo?: string;
  applicableGST?: string;
  baseUnit?: string;
  density?: string;
  sellPricePerUnit?: string;
  operationalUnit?: string;
  minimumStockKG?: string;
  isActive: boolean;
}

export interface SalesItemBatch {
  id: string;
  branchId: string;
  productId: string;
  batchNo: string;
  purchasePrice?: string;
  availableQtyKG?: string;
  availableQtyLTR?: string;
  isActive: boolean;
}

export interface SalesItem {
  id: string;
  saleId: string;
  productId: string;
  product?: SalesItemProduct;
  batchId: string;
  batch?: SalesItemBatch;
  quantity: string;
  unit: ProductUnit;
  sellingPrice?: string;
  createdAt: string;
}

export interface SalesUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface SalesAgency {
  id: string;
  name: string;
  type: "VENDOR" | "CLIENT" | "BOTH";
  gstin?: string;
  contactPerson?: string;
  mobileNumber?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pinCode?: string;
  isActive: boolean;
}

export interface SalesBranch {
  id: string;
  name: string;
  code: string;
  gstin?: string;
  stateCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  phnNumber?: string;
  email?: string;
  isActive: boolean;
}

export interface Sales {
  id: string;
  invoiceNo: string;
  agencyId: string;
  agency?: SalesAgency;
  branchId: string;
  branch?: SalesBranch;
  items: SalesItem[];
  status: SalesStatus;
  remarks?: string;
  approvedById?: string;
  approvedBy?: SalesUser;
  approvedAt?: string;
  rejectedById?: string;
  rejectedBy?: SalesUser;
  rejectedAt?: string;
  rejectionRemarks?: string;
  createdById?: string;
  createdBy?: SalesUser;
  createdAt: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface SalesListResponse {
  data: Sales[];
  meta: PaginationMeta;
}

export interface SalesResponse {
  sale: Sales;
}