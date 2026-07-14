// Bank Account API Service — matches AG-ERP-Backend/src/modules/bank
//
// All endpoints are mounted under /api/bank and protected by authMiddleware.
// Response envelope: { success, message?, data } where `data` is either an
// account object, an array of accounts, or a paginated wrapper.
//
// Backend routes used by this service:
//   POST   /api/bank/create
//   GET    /api/bank/get-all?branchId=&search=
//   GET    /api/bank/branch/:branchId
//   GET    /api/bank/:bankAccountId
//   PUT    /api/bank/update/:bankAccountId
//   PATCH  /api/bank/:bankAccountId/status

import { apiFetch } from "./api";
import { Branch } from "../types/branch";

export interface BankAccount {
  id: string;
  branchId: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  bankBranchName: string;
  isActive: boolean;
  createdAt?: string;
  branch?: Pick<Branch, "id" | "name" | "code">;
}

export interface CreateBankAccountPayload {
  branchId: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  bankBranchName: string;
}

export type UpdateBankAccountPayload = Partial<CreateBankAccountPayload>;

interface RawListEnvelope<T> {
  data: T[];
  meta?: { total?: number };
}

export const bankApi = {
  /**
   * GET /api/bank/branch/:branchId
   * Returns the active bank accounts for a single branch. Used by the
   * bank-account manager on the Branches page when the user has
   * selected a specific branch.
   */
  async getByBranch(
    branchId: string
  ): Promise<{ success: boolean; message: string; data?: BankAccount[] }> {
    return apiFetch<BankAccount[]>(`api/bank/branch/${branchId}`);
  },

  /**
   * GET /api/bank/get-all?branchId=&search=
   * Returns every bank account (across branches), optionally filtered by
   * branch id and free-text search over bank name / account number / IFSC.
   */
  async getAll(params?: {
    branchId?: string;
    search?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: BankAccount[];
  }> {
    const queryParams = new URLSearchParams();
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.search) queryParams.append("search", params.search);
    const qs = queryParams.toString();
    return apiFetch<RawListEnvelope<BankAccount>>(
      qs ? `api/bank/get-all?${qs}` : "api/bank/get-all"
    ).then((res) => ({
      success: res.success,
      message: res.message,
      data: Array.isArray((res.data as unknown) as BankAccount[])
        ? ((res.data as unknown) as BankAccount[])
        : ((res.data as RawListEnvelope<BankAccount>)?.data ?? []),
    }));
  },

  /**
   * POST /api/bank/create
   */
  async create(
    payload: CreateBankAccountPayload
  ): Promise<{ success: boolean; message: string; data?: BankAccount }> {
    return apiFetch<BankAccount>("api/bank/create", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * PUT /api/bank/update/:bankAccountId
   */
  async update(
    bankAccountId: string,
    payload: UpdateBankAccountPayload
  ): Promise<{ success: boolean; message: string; data?: BankAccount }> {
    return apiFetch<BankAccount>(`api/bank/update/${bankAccountId}`, {
      method: "PUT",
      body: payload,
    });
  },

  /**
   * PATCH /api/bank/:bankAccountId/status
   */
  async updateStatus(
    bankAccountId: string,
    isActive: boolean
  ): Promise<{ success: boolean; message: string; data?: BankAccount }> {
    return apiFetch<BankAccount>(`api/bank/${bankAccountId}/status`, {
      method: "PATCH",
      body: { isActive },
    });
  },
};
