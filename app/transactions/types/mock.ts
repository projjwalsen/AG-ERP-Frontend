// Mock-only types — these are used by the mock data file and a handful of
// legacy components still in /transactions/components that are not part of
// the new Redux-driven flow. They do NOT correspond to real backend entities.

import type { PaymentMode } from "@/app/types/transaction";

export type TransactionType = "INWARD" | "OUTWARD";

export type AgencyType = "CLIENT" | "VENDOR" | "BOTH";

export type InvoiceStatus = "BILLED" | "PARTIALLY_PAID" | "PAID";

/**
 * Legacy status set used only by mock data and any components still rendering
 * off the mock layer. The real backend returns PENDING | APPROVED | REJECTED.
 */
export type MockTransactionStatus =
  | "DRAFT"
  | "PENDING_AUTHENTICATION"
  | "AUTHENTICATED"
  | "REJECTED";

export type AuditAction =
  | "CREATED"
  | "SUBMITTED"
  | "AUTHENTICATED"
  | "REJECTED"
  | "EDITED";

/**
 * Legacy mock-only shapes for Branch and Agency used by the mock data file
 * and any components still rendering from the mock layer. The real backend
 * shapes live in `@/app/types/transaction`.
 */
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
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
  // Mock data uses the legacy value "OFFLINE_CASH" — widen the union so the
  // mock layer keeps compiling even though the real PaymentMode is now
  // "ONLINE" | "OFFLINE".
  mode: PaymentMode | "OFFLINE_CASH";
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

/**
 * Mock Transaction shape — NOT what the real backend returns. This is the
 * shape used by `lib/mock-data/transactions.ts` and the few components that
 * still pull from the mock layer. The new Redux flow uses the real
 * `Transaction` from `@/app/types/transaction`.
 */
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
  status: MockTransactionStatus;
  remarks?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  auditTrail: AuditLog[];
  authentication?: AuthenticationRecord;
  rejectionReason?: string;
}

export const mockStatusColors: Record<MockTransactionStatus, { bg: string; text: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700" },
  PENDING_AUTHENTICATION: { bg: "bg-amber-100", text: "text-amber-700" },
  AUTHENTICATED: { bg: "bg-green-100", text: "text-green-700" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700" },
};

export const mockStatusLabels: Record<MockTransactionStatus, string> = {
  DRAFT: "Draft",
  PENDING_AUTHENTICATION: "Pending Authentication",
  AUTHENTICATED: "Authenticated",
  REJECTED: "Rejected",
};
