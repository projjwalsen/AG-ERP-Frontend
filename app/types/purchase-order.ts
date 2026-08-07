import type { ProductUnit } from "./product";
import type { PurchaseAgency, PurchaseBranch, PurchaseUser } from "./purchase";

export type PurchaseOrderStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PurchaseOrderItemProduct {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  description?: string;
  hsnNo?: string;
  applicableGST?: string | number;
  baseUnit?: ProductUnit;
  density?: string | number;
  isActive?: boolean;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  product?: PurchaseOrderItemProduct;
  quantity: string | number;
  unit: ProductUnit;
  purchasePrice: string | number;
  totalAmount?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseOrderLinkedPurchase {
  id: string;
  invoiceNo: string;
  invoiceDate?: string;
  grandTotal?: string | number;
  status: string;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  poDate: string;
  agencyId: string;
  agency?: PurchaseAgency;
  branchId: string;
  branch?: PurchaseBranch;
  subtotalAmount?: string | number;
  remarks?: string | null;
  status: PurchaseOrderStatus;
  createdById?: string;
  createdBy?: PurchaseUser;
  approvedById?: string | null;
  approvedBy?: PurchaseUser | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionRemarks?: string | null;
  items: PurchaseOrderItem[];
  purchases?: PurchaseOrderLinkedPurchase[];
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseOrdersPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface PurchaseOrdersListResponse {
  data: PurchaseOrder[];
  meta: PurchaseOrdersPaginationMeta;
}

export interface PurchaseOrderResponse {
  purchaseOrder: PurchaseOrder;
}
