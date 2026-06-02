// Transaction Management ERP - Domain Types

export type TransactionStatus =
  | "DRAFT"
  | "PENDING_AUTHENTICATION"
  | "AUTHENTICATED"
  | "REJECTED";

export type TransactionType = "INWARD" | "OUTWARD";

export type PaymentMode = "ONLINE" | "OFFLINE_CASH";

export type AgencyType = "CLIENT" | "VENDOR" | "BOTH";

export type InvoiceStatus = "BILLED" | "PARTIALLY_PAID" | "PAID";

export type AuditAction =
  | "CREATED"
  | "SUBMITTED"
  | "AUTHENTICATED"
  | "REJECTED"
  | "EDITED";

export interface Branch {
  id: string;
  code: string;
  name: string;
  city?: string;
  state?: string;
}

export interface Agency {
  id: string;
  name: string;
  type: AgencyType;
  gstin?: string;
  contactPerson?: string;
  mobileNumber?: string;
  email?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  agencyId: string;
  branchId: string;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: InvoiceStatus;
}

export interface Payment {
  id: string;
  mode: PaymentMode;
  amount: number;
  transactionId?: string;
  utr?: string;
  secondaryAgencyId?: string;
  remarks?: string;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  userId: string;
  userName: string;
  timestamp: string;
  ipAddress?: string;
  computerId?: string;
  remarks?: string;
}

export interface AuthenticationRecord {
  id: string;
  voucherId: string;
  authenticatedById: string;
  authenticatedByName: string;
  authenticatedAt: string;
  remarks?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Transaction {
  id: string;
  voucherNo: string;
  voucherDate: string;
  type: TransactionType;
  branchId: string;
  agencyId?: string;
  invoiceId?: string;
  payment: Payment;
  amount: number;
  isSuspense: boolean;
  suspenseAccount?: "GST_Suspense_Clearing";
  status: TransactionStatus;
  remarks?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  auditTrail: AuditLog[];
  authentication?: AuthenticationRecord;
  rejectionReason?: string;
}

export const statusColors: Record<TransactionStatus, { bg: string; text: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700" },
  PENDING_AUTHENTICATION: { bg: "bg-amber-100", text: "text-amber-700" },
  AUTHENTICATED: { bg: "bg-green-100", text: "text-green-700" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700" },
};

export const statusLabels: Record<TransactionStatus, string> = {
  DRAFT: "Draft",
  PENDING_AUTHENTICATION: "Pending Authentication",
  AUTHENTICATED: "Authenticated",
  REJECTED: "Rejected",
};
