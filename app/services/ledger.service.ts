// Product Ledger API Service - matches backend API contract
import { apiFetch } from "./api";
import { fetchBlob } from "@/lib/download";
import {
  ProductLedgerListResponse,
  ProductLedgerDetail,
  ProductLedgerMovementType,
  FinancialLedgerListItem,
  FinancialLedgerDetail,
  FinancialLedgerStatementResponse,
  FinancialLedgerType,
  LedgerGroupMaster,
  LedgerView,
  LedgerViewRow,
  BranchLedgerDetailResponse,
  AgencyLedgerDetailResponse,
  SuspenseLedgerDetailResponse,
} from "../types/ledger";

export interface GetProductLedgersParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isLowStock?: boolean;
}

export interface GetProductLedgerDetailParams {
  productId: string;
  page?: number;
  limit?: number;
  movementType?: ProductLedgerMovementType;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

// ===== Financial Ledger list params =====
// Removed `groupCode` and `category` filters — backend get-all uses `view` only.
export interface GetFinancialLedgersParams {
  page?: number;
  limit?: number;
  search?: string;
  view: LedgerView;
  branchId?: string;
}

export interface GetLedgerStatementParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";

export const ledgerApi = {
  // GET /api/product-ledger - Paginated list of all product ledgers
  async getAll(params?: GetProductLedgersParams): Promise<{ success: boolean; message: string; data?: ProductLedgerListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.isLowStock !== undefined) queryParams.append("isLowStock", String(params.isLowStock));

    const query = queryParams.toString();
    const url = query ? `api/product-ledger?${query}` : "api/product-ledger";
    return apiFetch<ProductLedgerListResponse>(url);
  },

  // GET /api/product-ledger/:productId/detail - Product detail with stock + paginated movements
  async getById(params: GetProductLedgerDetailParams): Promise<{ success: boolean; message: string; data?: ProductLedgerDetail }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));
    if (params.movementType) queryParams.append("movementType", params.movementType);
    if (params.branchId) queryParams.append("branchId", params.branchId);
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);

    const query = queryParams.toString();
    const url = query
      ? `api/product-ledger/${params.productId}/detail?${query}`
      : `api/product-ledger/${params.productId}/detail`;
    return apiFetch<ProductLedgerDetail>(url);
  },

  // =============== FINANCIAL LEDGER ===============

  // GET /api/ledgers/groups - Hierarchical ledger group masters
  async getGroups(): Promise<{ success: boolean; message: string; data?: LedgerGroupMaster[] }> {
    return apiFetch<LedgerGroupMaster[]>("api/ledgers/groups");
  },

  // GET /api/ledgers/get-all - Paginated list of ledgers in the chosen VIEW.
  // For BRANCH view, backend returns BranchViewRow[] ({id,code,name,ledgerCount})
  // For AGENCY view, backend returns AgencyViewRow[] ({id,name,ledgerCount})
  // For SUSPENSE view, backend returns { summary, data: TransactionRow[] }
  //   (or, per user-pasted payload, just data: TransactionRow[] — accept both).
  //
  // The component renders only 4 columns: name, balance amount, gstin, closing balance.
  async getAllLedgers(params: GetFinancialLedgersParams): Promise<{
    success: boolean;
    message: string;
    data?: { rows: LedgerViewRow[]; total: number; suspense?: { summary: any; transactions: any[] } | null };
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));
    if (params.search) queryParams.append("search", params.search);
    if (params.view) queryParams.append("view", params.view);
    if (params.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    const url = query ? `api/ledgers/get-all?${query}` : "api/ledgers/get-all";

    interface RawAllLedgersResponse {
      success: boolean;
      message?: string;
      data?: any;
    }

    const response = await fetch(`${API_BASE_URL}/${url}`, { credentials: "include" });

    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      return { success: false, message: err.message || `HTTP error! status: ${response.status}` };
    }

    const raw = (await response.json()) as RawAllLedgersResponse;
    if (raw.success && raw.data !== undefined) {
      // SUSPENSE view: backend returns either { summary, data: [...] } or just [...] (single branch case)
      if (params.view === "SUSPENSE") {
        const d = raw.data;
        if (Array.isArray(d)) {
          return {
            success: true,
            message: raw.message || "",
            data: {
              rows: [],
              total: d.length,
              suspense: { summary: null, transactions: d },
            },
          };
        }
        if (d && typeof d === "object") {
          const transactions = Array.isArray(d.data) ? d.data : [];
          return {
            success: true,
            message: raw.message || "",
            data: {
              rows: [],
              total: transactions.length,
              suspense: { summary: d.summary ?? null, transactions },
            },
          };
        }
      }

      const list = Array.isArray(raw.data) ? raw.data : [];
      return {
        success: true,
        message: raw.message || "",
        data: { rows: list as LedgerViewRow[], total: list.length },
      };
    }
    return { success: false, message: raw.message || "Failed to fetch ledgers" };
  },

  // GET /api/ledgers/:ledgerId - Single ledger with current balance
  async getFinancialLedgerById(ledgerId: string): Promise<{ success: boolean; message: string; data?: FinancialLedgerDetail }> {
    return apiFetch<FinancialLedgerDetail>(`api/ledgers/${ledgerId}`);
  },

  // GET /api/ledgers/:ledgerId/statement - Passbook-style statement with running balance
  async getLedgerStatement(
    ledgerId: string,
    params?: GetLedgerStatementParams
  ): Promise<{ success: boolean; message: string; data?: FinancialLedgerStatementResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));

    const query = queryParams.toString();
    const url = query
      ? `api/ledgers/${ledgerId}/statement?${query}`
      : `api/ledgers/${ledgerId}/statement`;
    return apiFetch<FinancialLedgerStatementResponse>(url);
  },

  // GET /api/ledgers/branch/:branchId - Branch-wise detail (after View Details)
  async getLedgerByBranchId(
    branchId: string,
    category?: "ACCOUNTING_LEDGER" | "CASH" | "GST" | "DEBTORS" | "CREDITORS"
  ): Promise<{ success: boolean; message: string; data?: BranchLedgerDetailResponse }> {
    const query = category ? `?category=${category}` : "";
    return apiFetch<BranchLedgerDetailResponse>(`api/ledgers/branch/${branchId}${query}`);
  },

  // GET /api/ledgers/agency/:agencyId - Agency-wise detail (after View Details)
  async getLedgerByAgencyId(
    agencyId: string,
    category?: "ACCOUNTING_LEDGER" | "CASH" | "DEBTORS" | "CREDITORS"
  ): Promise<{ success: boolean; message: string; data?: AgencyLedgerDetailResponse }> {
    const query = category ? `?category=${category}` : "";
    return apiFetch<AgencyLedgerDetailResponse>(`api/ledgers/agency/${agencyId}${query}`);
  },

  // GET /api/ledgers/suspense/:branchId - Suspense transactions for a branch
  async getLedgerBySuspenseId(
    branchId: string,
    category?: "ACCOUNTING_LEDGER" | "CASH"
  ): Promise<{ success: boolean; message: string; data?: SuspenseLedgerDetailResponse }> {
    const query = category ? `?category=${category}` : "";
    return apiFetch<SuspenseLedgerDetailResponse>(`api/ledgers/suspense/${branchId}${query}`);
  },

  // ===== Export endpoints =====
  // Each streams an .xlsx file with the full filtered set (no pagination).

  // GET /api/product-ledger?export=true
  async exportProductLedgers(params?: Omit<GetProductLedgersParams, "page" | "limit">): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("export", "true");
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.isLowStock !== undefined) queryParams.append("isLowStock", String(params.isLowStock));

    return fetchBlob(`api/product-ledger?${queryParams.toString()}`, "product-ledgers.xlsx");
  },

  // GET /api/ledgers/get-all?export=true&view=BRANCH|AGENCY|SUSPENSE
  // Filename comes from the backend as `ledger_<view>.xlsx` (e.g. ledger_BRANCH.xlsx).
  async exportFinancialLedgers(params: { view: LedgerView; search?: string; branchId?: string }): Promise<{ blob: Blob; filename: string }> {
    const queryParams = new URLSearchParams();
    queryParams.append("export", "true");
    queryParams.append("view", params.view);
    if (params.search) queryParams.append("search", params.search);
    if (params.branchId) queryParams.append("branchId", params.branchId);

    return fetchBlob(
      `api/ledgers/get-all?${queryParams.toString()}`,
      `ledger_${params.view.toLowerCase()}.xlsx`
    );
  },
};
