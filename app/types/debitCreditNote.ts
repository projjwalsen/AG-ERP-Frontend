export type DebitCreditNoteStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DebitCreditNoteType = "DEBIT_NOTE" | "CREDIT_NOTE";
export type DebitCreditNoteSourceType = "SALE" | "PURCHASE";

export interface DebitCreditNoteAgency {
  id: string;
  name: string;
}

export interface DebitCreditNoteBranch {
  id: string;
  name: string;
  code: string;
}

export interface DebitCreditNoteUser {
  id: string;
  name: string;
}

export interface DebitCreditNoteParticular {
  id: string;
  description: string;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DebitCreditNoteInvoiceReference {
  id: string;
  invoiceNo?: string;
  invoiceDate?: string | null;
  grandTotal?: number | null;
}

export interface DebitCreditNoteSelectableInvoice {
  id: string;
  sourceType: DebitCreditNoteSourceType;
  invoiceNo: string;
  invoiceDate?: string | null;
  grandTotal?: number | string | null;
  status?: string;
  narration?: string | null;
  agency?: DebitCreditNoteAgency;
  branch?: DebitCreditNoteBranch;
}

export interface DebitCreditNote {
  id: string;
  noteNo: string;
  type: DebitCreditNoteType;
  sourceType: DebitCreditNoteSourceType;
  agencyId: string;
  branchId: string;
  saleId?: string | null;
  purchaseId?: string | null;
  noteDate?: string;
  narration?: string | null;
  totalAmount: number;
  status: DebitCreditNoteStatus;
  rejectionRemarks?: string | null;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string | null;
  agency?: DebitCreditNoteAgency;
  branch?: DebitCreditNoteBranch;
  sale?: DebitCreditNoteInvoiceReference;
  purchase?: DebitCreditNoteInvoiceReference;
  particulars: DebitCreditNoteParticular[];
  createdBy?: DebitCreditNoteUser;
  approvedBy?: DebitCreditNoteUser;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface DebitCreditNotesListResponse {
  data: DebitCreditNote[];
  meta: PaginationMeta;
}

export interface DebitCreditNoteInvoicesResponse {
  invoices: DebitCreditNoteSelectableInvoice[];
}
