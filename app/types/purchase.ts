// Purchase Types - matches backend API contract

export type PurchaseStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ProductUnit = "KG" | "LTR";

export interface PurchaseItemProduct {
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

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  product?: PurchaseItemProduct;
  batchId: string | null;
  batchNo: string;
  quantity: string;
  unit: ProductUnit;
  purchasePrice: string;
  createdAt: string;
}

export interface PurchaseUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface PurchaseAgency {
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

export interface PurchaseBranch {
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

export interface Purchase {
  id: string;
  invoiceNo: string;
  agencyId: string;
  agency?: PurchaseAgency;
  branchId: string;
  branch?: PurchaseBranch;
  items: PurchaseItem[];
  status: PurchaseStatus;
  remarks?: string;
  approvedById?: string;
  approvedBy?: PurchaseUser;
  approvedAt?: string;
  rejectedById?: string;
  rejectedBy?: PurchaseUser;
  rejectedAt?: string;
  rejectionRemarks?: string;
  createdById?: string;
  createdBy?: PurchaseUser;
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

export interface PurchasesListResponse {
  data: Purchase[];
  meta: PaginationMeta;
}

export interface PurchaseResponse {
  purchase: Purchase;
}