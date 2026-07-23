// Product Ledger + Financial Ledger Redux Slice
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  ledgerApi,
  GetFinancialLedgersParams,
  GetLedgerStatementParams,
} from "../services/ledger.service";
import {
  ProductLedgerListItem,
  ProductLedgerListResponse,
  ProductLedgerDetail,
  ProductLedgerMovementType,
  LedgerGroupMaster,
  LedgerView,
  LedgerViewRow,
  FinancialLedgerDetail,
  FinancialLedgerStatementResponse,
  BranchLedgerDetailResponse,
  AgencyLedgerDetailResponse,
  SuspenseLedgerDetailResponse,
  SuspenseTransactionRow,
  CompanyLedgerResponse,
  GSTLedgerResponse,
} from "../types/ledger";

export interface LedgerState {
  // ===== Product Ledger =====
  ledgers: ProductLedgerListItem[];
  isListLoading: boolean;
  listError: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  } | null;

  currentDetail: ProductLedgerDetail | null;
  isDetailLoading: boolean;
  detailError: string | null;

  // ===== Financial Ledger =====
  ledgerGroups: LedgerGroupMaster[];
  isGroupsLoading: boolean;
  groupsError: string | null;

  // ===== Financial Ledger List (per-view: BRANCH / AGENCY / SUSPENSE) =====
  financialLedgers: LedgerViewRow[];
  financialView: LedgerView | null;
  // For SUSPENSE view, the backend returns branches with their transactions
  // (or a flat transactions list per branch). Store separately so the table
  // can render branch rows with a count + View Details affordance.
  suspenseData: {
    summary: { totalTransactions: number; totalInward: number; totalOutward: number } | null;
    transactions: SuspenseTransactionRow[];
  } | null;
  isFinancialListLoading: boolean;
  financialListError: string | null;
  financialPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;

  currentFinancialLedger: FinancialLedgerDetail | null;
  isFinancialDetailLoading: boolean;
  financialDetailError: string | null;

  currentFinancialStatement: FinancialLedgerStatementResponse | null;
  isStatementLoading: boolean;
  statementError: string | null;

  // ===== Branch / Agency / Suspense Details =====
  currentBranchDetail: BranchLedgerDetailResponse | null;
  isBranchDetailLoading: boolean;
  branchDetailError: string | null;

  currentAgencyDetail: AgencyLedgerDetailResponse | null;
  isAgencyDetailLoading: boolean;
  agencyDetailError: string | null;

  currentSuspenseDetail: SuspenseLedgerDetailResponse | null;
  isSuspenseDetailLoading: boolean;
  suspenseDetailError: string | null;

  // ===== Company Ledger (whole-company consolidated statement) =====
  currentCompanyLedger: CompanyLedgerResponse | null;
  isCompanyLedgerLoading: boolean;
  companyLedgerError: string | null;

  // ===== GST Ledger Report =====
  currentGSTLedger: GSTLedgerResponse | null;
  isGSTLedgerLoading: boolean;
  gstLedgerError: string | null;
}

const initialState: LedgerState = {
  ledgers: [],
  isListLoading: false,
  listError: null,
  pagination: null,
  currentDetail: null,
  isDetailLoading: false,
  detailError: null,
  ledgerGroups: [],
  isGroupsLoading: false,
  groupsError: null,
  financialLedgers: [],
  financialView: null,
  suspenseData: null,
  isFinancialListLoading: false,
  financialListError: null,
  financialPagination: null,
  currentFinancialLedger: null,
  isFinancialDetailLoading: false,
  financialDetailError: null,
  currentFinancialStatement: null,
  isStatementLoading: false,
  statementError: null,
  currentBranchDetail: null,
  isBranchDetailLoading: false,
  branchDetailError: null,
  currentAgencyDetail: null,
  isAgencyDetailLoading: false,
  agencyDetailError: null,
  currentSuspenseDetail: null,
  isSuspenseDetailLoading: false,
  suspenseDetailError: null,

  currentCompanyLedger: null,
  isCompanyLedgerLoading: false,
  companyLedgerError: null,

  currentGSTLedger: null,
  isGSTLedgerLoading: false,
  gstLedgerError: null,
};

// ============== PRODUCT LEDGER THUNKS ==============

// GET /api/product-ledger
export const fetchAllProductLedgers = createAsyncThunk<
  ProductLedgerListResponse,
  { page?: number; limit?: number; search?: string; category?: string; isLowStock?: boolean } | undefined,
  { rejectValue: string }
>("ledger/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const response = await ledgerApi.getAll(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch product ledgers");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch product ledgers";
    return rejectWithValue(message);
  }
});

// GET /api/product-ledger/:productId/detail
export const fetchProductLedgerById = createAsyncThunk<
  ProductLedgerDetail,
  {
    productId: string;
    page?: number;
    limit?: number;
    movementType?: ProductLedgerMovementType;
    branchId?: string;
    startDate?: string;
    endDate?: string;
  },
  { rejectValue: string }
>("ledger/fetchById", async (params, { rejectWithValue }) => {
  try {
    const response = await ledgerApi.getById(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch product ledger details");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch product ledger details";
    return rejectWithValue(message);
  }
});

// ============== FINANCIAL LEDGER THUNKS ==============

// GET /api/ledgers/groups
export const fetchLedgerGroups = createAsyncThunk<
  LedgerGroupMaster[],
  void,
  { rejectValue: string }
>("ledger/fetchGroups", async (_, { rejectWithValue }) => {
  try {
    const response = await ledgerApi.getGroups();
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch ledger groups");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch ledger groups";
    return rejectWithValue(message);
  }
});

// GET /api/ledgers/get-all?view=BRANCH|AGENCY|SUSPENSE
export const fetchAllFinancialLedgers = createAsyncThunk<
  {
    rows: LedgerViewRow[];
    total: number;
    view: LedgerView;
    suspense: { summary: any; transactions: SuspenseTransactionRow[] } | null;
  },
  GetFinancialLedgersParams,
  { rejectValue: string }
>("ledger/fetchAllFinancial", async (params, { rejectWithValue }) => {
  try {
    const response = await ledgerApi.getAllLedgers(params);
    if (response.success && response.data) {
      return {
        rows: response.data.rows,
        total: response.data.total,
        view: params.view,
        suspense: response.data.suspense ?? null,
      };
    }
    return rejectWithValue(response.message || "Failed to fetch ledgers");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch ledgers";
    return rejectWithValue(message);
  }
});

// GET /api/ledgers/:ledgerId
export const fetchFinancialLedgerById = createAsyncThunk<
  FinancialLedgerDetail,
  string,
  { rejectValue: string }
>("ledger/fetchFinancialById", async (ledgerId, { rejectWithValue }) => {
  try {
    const response = await ledgerApi.getFinancialLedgerById(ledgerId);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch ledger details");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch ledger details";
    return rejectWithValue(message);
  }
});

// GET /api/ledgers/:ledgerId/statement
export const fetchLedgerStatement = createAsyncThunk<
  FinancialLedgerStatementResponse,
  { ledgerId: string; params?: GetLedgerStatementParams },
  { rejectValue: string }
>("ledger/fetchStatement", async ({ ledgerId, params }, { rejectWithValue }) => {
  try {
    const response = await ledgerApi.getLedgerStatement(ledgerId, params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch ledger statement");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch ledger statement";
    return rejectWithValue(message);
  }
});

// GET /api/ledgers/branch/:branchId - Branch-wise detail after View Details
// GET /api/ledgers/branch/:branchId?category=&startDate=&endDate=
export const fetchLedgerByBranchId = createAsyncThunk<
  BranchLedgerDetailResponse,
  {
    branchId: string;
    category?: "ACCOUNTING_LEDGER" | "CASH" | "GST" | "DEBTORS" | "CREDITORS";
    startDate?: string;
    endDate?: string;
  },
  { rejectValue: string }
>(
  "ledger/fetchByBranchId",
  async ({ branchId, category, startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await ledgerApi.getLedgerByBranchId(branchId, category, {
        startDate,
        endDate,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.message || "Failed to fetch branch ledgers");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch branch ledgers";
      return rejectWithValue(message);
    }
  }
);

// GET /api/ledgers/agency/:agencyId?category=&startDate=&endDate=
export const fetchLedgerByAgencyId = createAsyncThunk<
  AgencyLedgerDetailResponse,
  {
    agencyId: string;
    category?: "ACCOUNTING_LEDGER" | "CASH" | "DEBTORS" | "CREDITORS";
    startDate?: string;
    endDate?: string;
  },
  { rejectValue: string }
>(
  "ledger/fetchByAgencyId",
  async ({ agencyId, category, startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await ledgerApi.getLedgerByAgencyId(agencyId, category, {
        startDate,
        endDate,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.message || "Failed to fetch agency ledgers");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch agency ledgers";
      return rejectWithValue(message);
    }
  }
);

// GET /api/ledgers/suspense/:branchId - Suspense transactions after View Details
export const fetchLedgerBySuspenseId = createAsyncThunk<
  SuspenseLedgerDetailResponse,
  { branchId: string; category?: "ACCOUNTING_LEDGER" | "CASH" },
  { rejectValue: string }
>("ledger/fetchBySuspenseId", async ({ branchId, category }, { rejectWithValue }) => {
  try {
    const response = await ledgerApi.getLedgerBySuspenseId(branchId, category);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch suspense ledgers");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch suspense ledgers";
    return rejectWithValue(message);
  }
});

// GET /api/ledgers/company-ledger?branchId=&startDate=&endDate=&page=&limit=
// Whole-company consolidated ledger. startDate/endDate are optional ISO
// date strings (YYYY-MM-DD); the backend filters transactions on createdAt.
export const fetchCompanyLedger = createAsyncThunk<
  CompanyLedgerResponse,
  {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } | undefined,
  { rejectValue: string }
>("ledger/fetchCompanyLedger", async (params, { rejectWithValue }) => {
  try {
    const response = await ledgerApi.getCompanyLedger(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch company ledger");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch company ledger";
    return rejectWithValue(message);
  }
});

// GET /api/ledgers/gst-ledger?branchId=&startDate=&endDate=
// GST report — Input GST (purchases), Output GST (sales), and a
// Liability Summary (output - input per tax kind).
export const fetchGSTLedger = createAsyncThunk<
  GSTLedgerResponse,
  { branchId?: string; startDate?: string; endDate?: string } | undefined,
  { rejectValue: string }
>("ledger/fetchGSTLedger", async (params, { rejectWithValue }) => {
  try {
    const response = await ledgerApi.getGSTLedger(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch GST ledger");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch GST ledger";
    return rejectWithValue(message);
  }
});

const ledgerSlice = createSlice({
  name: "ledger",
  initialState,
  reducers: {
    clearLedgerError: (state) => {
      state.listError = null;
      state.detailError = null;
    },
    clearCurrentDetail: (state) => {
      state.currentDetail = null;
      state.detailError = null;
    },
    clearFinancialCurrentDetail: (state) => {
      state.currentFinancialLedger = null;
      state.financialDetailError = null;
      state.currentFinancialStatement = null;
      state.statementError = null;
      state.currentBranchDetail = null;
      state.branchDetailError = null;
      state.currentAgencyDetail = null;
      state.agencyDetailError = null;
      state.currentSuspenseDetail = null;
      state.suspenseDetailError = null;
      state.currentCompanyLedger = null;
      state.companyLedgerError = null;
      state.currentGSTLedger = null;
      state.gstLedgerError = null;
    },
    resetLedgerState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // ===== Product Ledger =====
      .addCase(fetchAllProductLedgers.pending, (state) => {
        state.isListLoading = true;
        state.listError = null;
      })
      .addCase(fetchAllProductLedgers.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.ledgers = action.payload.data || [];
        if (action.payload.meta) {
          state.pagination = action.payload.meta;
        }
      })
      .addCase(fetchAllProductLedgers.rejected, (state, action) => {
        state.isListLoading = false;
        state.listError = action.payload || "Failed to fetch product ledgers";
      })
      .addCase(fetchProductLedgerById.pending, (state) => {
        state.isDetailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchProductLedgerById.fulfilled, (state, action) => {
        state.isDetailLoading = false;
        state.currentDetail = action.payload;
      })
      .addCase(fetchProductLedgerById.rejected, (state, action) => {
        state.isDetailLoading = false;
        state.detailError = action.payload || "Failed to fetch product ledger details";
      })
      // ===== Ledger Groups =====
      .addCase(fetchLedgerGroups.pending, (state) => {
        state.isGroupsLoading = true;
        state.groupsError = null;
      })
      .addCase(fetchLedgerGroups.fulfilled, (state, action) => {
        state.isGroupsLoading = false;
        state.ledgerGroups = action.payload || [];
      })
      .addCase(fetchLedgerGroups.rejected, (state, action) => {
        state.isGroupsLoading = false;
        state.groupsError = action.payload || "Failed to fetch ledger groups";
      })
      // ===== Financial Ledger List =====
      .addCase(fetchAllFinancialLedgers.pending, (state) => {
        state.isFinancialListLoading = true;
        state.financialListError = null;
      })
      .addCase(fetchAllFinancialLedgers.fulfilled, (state, action) => {
        state.isFinancialListLoading = false;
        state.financialLedgers = action.payload.rows || [];
        state.financialView = action.payload.view;
        state.suspenseData = action.payload.suspense;
        state.financialPagination = {
          total: action.payload.total,
          page: 1,
          limit: action.payload.total || 25,
          totalPages: 1,
        };
      })
      .addCase(fetchAllFinancialLedgers.rejected, (state, action) => {
        state.isFinancialListLoading = false;
        state.financialListError = action.payload || "Failed to fetch ledgers";
      })
      // ===== Financial Ledger Detail =====
      .addCase(fetchFinancialLedgerById.pending, (state) => {
        state.isFinancialDetailLoading = true;
        state.financialDetailError = null;
      })
      .addCase(fetchFinancialLedgerById.fulfilled, (state, action) => {
        state.isFinancialDetailLoading = false;
        state.currentFinancialLedger = action.payload;
      })
      .addCase(fetchFinancialLedgerById.rejected, (state, action) => {
        state.isFinancialDetailLoading = false;
        state.financialDetailError = action.payload || "Failed to fetch ledger details";
      })
      // ===== Ledger Statement =====
      .addCase(fetchLedgerStatement.pending, (state) => {
        state.isStatementLoading = true;
        state.statementError = null;
      })
      .addCase(fetchLedgerStatement.fulfilled, (state, action) => {
        state.isStatementLoading = false;
        state.currentFinancialStatement = action.payload;
      })
      .addCase(fetchLedgerStatement.rejected, (state, action) => {
        state.isStatementLoading = false;
        state.statementError = action.payload || "Failed to fetch ledger statement";
      })
      // ===== Branch Detail =====
      .addCase(fetchLedgerByBranchId.pending, (state) => {
        state.isBranchDetailLoading = true;
        state.branchDetailError = null;
      })
      .addCase(fetchLedgerByBranchId.fulfilled, (state, action) => {
        state.isBranchDetailLoading = false;
        state.currentBranchDetail = action.payload;
      })
      .addCase(fetchLedgerByBranchId.rejected, (state, action) => {
        state.isBranchDetailLoading = false;
        state.branchDetailError = action.payload || "Failed to fetch branch ledgers";
      })
      // ===== Agency Detail =====
      .addCase(fetchLedgerByAgencyId.pending, (state) => {
        state.isAgencyDetailLoading = true;
        state.agencyDetailError = null;
      })
      .addCase(fetchLedgerByAgencyId.fulfilled, (state, action) => {
        state.isAgencyDetailLoading = false;
        state.currentAgencyDetail = action.payload;
      })
      .addCase(fetchLedgerByAgencyId.rejected, (state, action) => {
        state.isAgencyDetailLoading = false;
        state.agencyDetailError = action.payload || "Failed to fetch agency ledgers";
      })
      // ===== Suspense Detail =====
      .addCase(fetchLedgerBySuspenseId.pending, (state) => {
        state.isSuspenseDetailLoading = true;
        state.suspenseDetailError = null;
      })
      .addCase(fetchLedgerBySuspenseId.fulfilled, (state, action) => {
        state.isSuspenseDetailLoading = false;
        state.currentSuspenseDetail = action.payload;
      })
      .addCase(fetchLedgerBySuspenseId.rejected, (state, action) => {
        state.isSuspenseDetailLoading = false;
        state.suspenseDetailError = action.payload || "Failed to fetch suspense ledgers";
      })
      // ===== Company Ledger =====
      .addCase(fetchCompanyLedger.pending, (state) => {
        state.isCompanyLedgerLoading = true;
        state.companyLedgerError = null;
      })
      .addCase(fetchCompanyLedger.fulfilled, (state, action) => {
        state.isCompanyLedgerLoading = false;
        state.currentCompanyLedger = action.payload;
      })
      .addCase(fetchCompanyLedger.rejected, (state, action) => {
        state.isCompanyLedgerLoading = false;
        state.companyLedgerError = action.payload || "Failed to fetch company ledger";
      })
      // ===== GST Ledger =====
      .addCase(fetchGSTLedger.pending, (state) => {
        state.isGSTLedgerLoading = true;
        state.gstLedgerError = null;
      })
      .addCase(fetchGSTLedger.fulfilled, (state, action) => {
        state.isGSTLedgerLoading = false;
        state.currentGSTLedger = action.payload;
      })
      .addCase(fetchGSTLedger.rejected, (state, action) => {
        state.isGSTLedgerLoading = false;
        state.gstLedgerError = action.payload || "Failed to fetch GST ledger";
      });
  },
});

export const {
  clearLedgerError,
  clearCurrentDetail,
  clearFinancialCurrentDetail,
  resetLedgerState,
} = ledgerSlice.actions;
export default ledgerSlice.reducer;
