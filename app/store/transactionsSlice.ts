import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  transactionApi,
  GetOutstandingParams,
} from "../services/transaction.service";
import {
  AgencyOutstanding,
  CreateTransactionPayload,
  GetTransactionsParams,
  PaginationMeta,
  Transaction,
  TransactionsListResponse,
  TransactionResponse,
  UpdateTransactionPayload,
} from "@/app/types/transaction";

export interface TransactionsState {
  transactions: Transaction[];
  currentTransaction: Transaction | null;
  /**
   * Outstanding for the *primary* agency (the one selected in the top
   * "Agency" field). Drives the primary AgencyBalanceStrip in the
   * new-transaction form and the authentication modal.
   */
  outstanding: AgencyOutstanding | null;
  /**
   * Outstanding for the *3rd party* agency (the counter-party on a
   * third-party transaction). Kept in a separate slot so its
   * AgencyBalanceStrip shows the counter-party's own sales/purchase
   * outstanding instead of the primary's. The same `/outstanding`
   * endpoint is hit — only the resolved `agencyId` differs.
   */
  thirdPartyOutstanding: AgencyOutstanding | null;
  /**
   * Server-side count of PENDING transactions, kept in a separate slot so the
   * list page can render the "Pending Authentication" stat card without
   * overwriting `transactions` (which would otherwise happen every time a
   * second fetchAllTransactions call was made purely to read meta.total).
   */
  pendingTotal: number | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
}

const initialState: TransactionsState = {
  transactions: [],
  currentTransaction: null,
  outstanding: null,
  thirdPartyOutstanding: null,
  pendingTotal: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  pagination: null,
};

// =================== HELPERS ===================

/**
 * Prisma's `Decimal` is JSON-serialized as a string. Cast at the network
 * boundary so the rest of the app can treat amounts as plain numbers.
 */
function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function castTransaction(t: Transaction): Transaction {
  return {
    ...t,
    amount: toNumber(t.amount as unknown),
  };
}

function castTransactions(list: Transaction[]): Transaction[] {
  return list.map(castTransaction);
}

function castOutstanding(o: AgencyOutstanding): AgencyOutstanding {
  return {
    ...o,
    salesOutstanding: toNumber(o.salesOutstanding as unknown),
    purchaseOutstanding: toNumber(o.purchaseOutstanding as unknown),
    netOutstanding: toNumber(o.netOutstanding as unknown),
  };
}

// =================== THUNKS ===================

// GET /api/transactions/all
export const fetchAllTransactions = createAsyncThunk<
  TransactionsListResponse,
  GetTransactionsParams | undefined,
  { rejectValue: string }
>("transactions/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const response = await transactionApi.getAll(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch transactions");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch transactions";
    return rejectWithValue(message);
  }
});

/**
 * Dedicated count-only fetch for the list page's "Pending Authentication"
 * stat card. Calls /api/transactions/all with status=PENDING, limit=1, and
 * stores only meta.total — does NOT touch `state.transactions` or
 * `state.pagination`. This avoids the previous bug where the list page's
 * second fetch would clobber the main list with a one-row pending response.
 */
export const fetchPendingTotal = createAsyncThunk<
  PaginationMeta,
  void,
  { rejectValue: string }
>("transactions/fetchPendingTotal", async (_, { rejectWithValue }) => {
  try {
    const response = await transactionApi.getAll({
      status: "PENDING",
      page: 1,
      limit: 1,
    });
    if (response.success && response.data) {
      return response.data.meta;
    }
    return rejectWithValue(
      response.message || "Failed to fetch pending count"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch pending count";
    return rejectWithValue(message);
  }
});

// GET /api/transactions/:id
export const fetchTransactionById = createAsyncThunk<
  TransactionResponse,
  string,
  { rejectValue: string }
>("transactions/fetchById", async (transactionId, { rejectWithValue }) => {
  try {
    const response = await transactionApi.getById(transactionId);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch transaction");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch transaction";
    return rejectWithValue(message);
  }
});

// POST /api/transactions/create
export const createTransaction = createAsyncThunk<
  TransactionResponse,
  CreateTransactionPayload,
  { rejectValue: string }
>("transactions/create", async (payload, { rejectWithValue }) => {
  try {
    const response = await transactionApi.create(payload);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to create transaction");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create transaction";
    return rejectWithValue(message);
  }
});

// PATCH /api/transactions/update/:id
export const updateTransaction = createAsyncThunk<
  TransactionResponse,
  { transactionId: string; payload: UpdateTransactionPayload },
  { rejectValue: string }
>(
  "transactions/update",
  async ({ transactionId, payload }, { rejectWithValue }) => {
    try {
      const response = await transactionApi.update(transactionId, payload);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.message || "Failed to update transaction");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update transaction";
      return rejectWithValue(message);
    }
  }
);

// PATCH /api/transactions/:id/approve
export const approveTransaction = createAsyncThunk<
  TransactionResponse,
  string,
  { rejectValue: string }
>("transactions/approve", async (transactionId, { rejectWithValue }) => {
  try {
    const response = await transactionApi.approve(transactionId);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to approve transaction");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to approve transaction";
    return rejectWithValue(message);
  }
});

// PATCH /api/transactions/:id/reject
export const rejectTransaction = createAsyncThunk<
  TransactionResponse,
  { transactionId: string; remarks: string },
  { rejectValue: string }
>("transactions/reject", async (payload, { rejectWithValue }) => {
  try {
    const response = await transactionApi.reject(payload);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to reject transaction");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to reject transaction";
    return rejectWithValue(message);
  }
});

// GET /api/transactions/outstanding
/**
 * Target slot for the fetched outstanding. `"primary"` writes to
 * `state.outstanding` (the default for top-of-form lookups), `"thirdParty"`
 * writes to `state.thirdPartyOutstanding` (the counter-party on a
 * third-party transaction). The same `/outstanding` endpoint is hit in
 * both cases — only the resolved `agencyId` and the slot the result lands
 * in differ.
 */
export type OutstandingTarget = "primary" | "thirdParty";

export const fetchOutstanding = createAsyncThunk<
  AgencyOutstanding,
  GetOutstandingParams & { target?: OutstandingTarget },
  { rejectValue: string }
>("transactions/fetchOutstanding", async (params, { rejectWithValue }) => {
  try {
    const response = await transactionApi.getOutstanding(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch outstanding");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch outstanding";
    return rejectWithValue(message);
  }
});

// =================== SLICE ===================

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    clearTransactionsError: (state) => {
      state.error = null;
    },
    clearCurrentTransaction: (state) => {
      state.currentTransaction = null;
    },
    clearOutstanding: (state) => {
      state.outstanding = null;
    },
    clearThirdPartyOutstanding: (state) => {
      state.thirdPartyOutstanding = null;
    },
    resetTransactionsState: (state) => {
      state.transactions = [];
      state.currentTransaction = null;
      state.outstanding = null;
      state.thirdPartyOutstanding = null;
      state.isLoading = false;
      state.isSubmitting = false;
      state.error = null;
      state.pagination = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAllTransactions
      .addCase(fetchAllTransactions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        // Cast every amount through toNumber so the rest of the app can do
        // arithmetic on it. The Prisma Decimal serializes as a JSON string
        // by default; this is the single point of normalization.
        state.transactions = castTransactions(action.payload.data || []);
        state.pagination = action.payload.meta;
      })
      .addCase(fetchAllTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch transactions";
      })
      // fetchPendingTotal — only writes the count, never touches the list.
      .addCase(fetchPendingTotal.fulfilled, (state, action) => {
        state.pendingTotal = action.payload?.total ?? 0;
      })
      .addCase(fetchPendingTotal.rejected, (state) => {
        // Non-critical: keep the previous value or null.
        state.pendingTotal = state.pendingTotal ?? 0;
      })
      // fetchTransactionById
      .addCase(fetchTransactionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactionById.fulfilled, (state, action) => {
        state.isLoading = false;
        // The thunk returns `response.data` from `apiFetch`, where
        // `response.data` is the `TransactionResponse` envelope from the
        // backend (`{ data: Transaction }`). The reducer unwraps one more
        // level. As a defensive fallback (in case the thunk return type
        // ever drifts), if `action.payload.data` is missing but the
        // payload itself looks like a Transaction, use it directly.
        const payload: any = action.payload;
        const txn =
          payload?.data && typeof payload.data === "object" && "id" in payload.data
            ? castTransaction(payload.data)
            : payload?.id
            ? castTransaction(payload)
            : null;
        state.currentTransaction = txn;
      })
      .addCase(fetchTransactionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch transaction";
      })
      // createTransaction
      .addCase(createTransaction.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.isSubmitting = false;
        if (action.payload.data) {
          state.transactions.unshift(castTransaction(action.payload.data));
        }
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload || "Failed to create transaction";
      })
      // updateTransaction
      .addCase(updateTransaction.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const updated = action.payload.data;
        if (!updated) return;
        const cast = castTransaction(updated);
        const idx = state.transactions.findIndex((t) => t.id === cast.id);
        if (idx !== -1) state.transactions[idx] = cast;
        if (state.currentTransaction?.id === cast.id) {
          state.currentTransaction = cast;
        }
      })
      .addCase(updateTransaction.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload || "Failed to update transaction";
      })
      // approveTransaction
      .addCase(approveTransaction.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(approveTransaction.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const updated = action.payload.data;
        if (!updated) return;
        const cast = castTransaction(updated);
        const idx = state.transactions.findIndex((t) => t.id === cast.id);
        if (idx !== -1) state.transactions[idx] = cast;
        if (state.currentTransaction?.id === cast.id) {
          state.currentTransaction = cast;
        }
        // The row left the pending queue — decrement the dedicated count
        // (and the table-pagination total, if present).
        if (state.pendingTotal !== null && state.pendingTotal > 0) {
          state.pendingTotal = state.pendingTotal - 1;
        }
        if (state.pagination && state.pagination.total > 0) {
          state.pagination.total = Math.max(0, state.pagination.total - 1);
        }
      })
      .addCase(approveTransaction.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload || "Failed to approve transaction";
      })
      // rejectTransaction
      .addCase(rejectTransaction.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(rejectTransaction.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const updated = action.payload.data;
        if (!updated) return;
        const cast = castTransaction(updated);
        const idx = state.transactions.findIndex((t) => t.id === cast.id);
        if (idx !== -1) state.transactions[idx] = cast;
        if (state.currentTransaction?.id === cast.id) {
          state.currentTransaction = cast;
        }
        if (state.pendingTotal !== null && state.pendingTotal > 0) {
          state.pendingTotal = state.pendingTotal - 1;
        }
        if (state.pagination && state.pagination.total > 0) {
          state.pagination.total = Math.max(0, state.pagination.total - 1);
        }
      })
      .addCase(rejectTransaction.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload || "Failed to reject transaction";
      })
      // fetchOutstanding
      .addCase(fetchOutstanding.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchOutstanding.fulfilled, (state, action) => {
        const cast = castOutstanding(action.payload);
        // Route the result to the right slot. `"primary"` is the default —
        // a 3rd-party refetch explicitly opts in via `meta.arg.target`.
        if (action.meta.arg.target === "thirdParty") {
          state.thirdPartyOutstanding = cast;
        } else {
          state.outstanding = cast;
        }
      })
      .addCase(fetchOutstanding.rejected, (state, action) => {
        state.error = action.payload || "Failed to fetch outstanding";
      });
  },
});

export const {
  clearTransactionsError,
  clearCurrentTransaction,
  clearOutstanding,
  clearThirdPartyOutstanding,
  resetTransactionsState,
} = transactionsSlice.actions;

export default transactionsSlice.reducer;
