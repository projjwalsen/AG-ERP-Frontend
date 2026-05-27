import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { transactionApi, GetTransactionsParams } from "../services/transaction.service";
import {
  Transaction,
  TransactionsListResponse,
  TransactionResponse,
  CreateTransactionPayload,
  ApproveTransactionPayload,
  RejectTransactionPayload,
} from "../types/transaction";

export interface TransactionsState {
  transactions: Transaction[];
  currentTransaction: Transaction | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
}

const initialState: TransactionsState = {
  transactions: [],
  currentTransaction: null,
  isLoading: false,
  error: null,
  pagination: null,
};

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
    const message = error instanceof Error ? error.message : "Failed to fetch transactions";
    return rejectWithValue(message);
  }
});

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
    const message = error instanceof Error ? error.message : "Failed to fetch transaction";
    return rejectWithValue(message);
  }
});

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
    const message = error instanceof Error ? error.message : "Failed to create transaction";
    return rejectWithValue(message);
  }
});

export const approveTransaction = createAsyncThunk<
  TransactionResponse,
  ApproveTransactionPayload,
  { rejectValue: string }
>("transactions/approve", async (payload, { rejectWithValue }) => {
  try {
    const response = await transactionApi.approve(payload);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to approve transaction");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to approve transaction";
    return rejectWithValue(message);
  }
});

export const rejectTransaction = createAsyncThunk<
  TransactionResponse,
  RejectTransactionPayload,
  { rejectValue: string }
>("transactions/reject", async (payload, { rejectWithValue }) => {
  try {
    const response = await transactionApi.reject(payload);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to reject transaction");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reject transaction";
    return rejectWithValue(message);
  }
});

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
    resetTransactionsState: (state) => {
      state.transactions = [];
      state.currentTransaction = null;
      state.isLoading = false;
      state.error = null;
      state.pagination = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllTransactions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions = action.payload.transactions;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchAllTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch transactions";
      })
      .addCase(fetchTransactionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactionById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTransaction = action.payload.transaction;
      })
      .addCase(fetchTransactionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch transaction";
      })
      .addCase(createTransaction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions.unshift(action.payload.transaction);
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to create transaction";
      })
      .addCase(approveTransaction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(approveTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.transactions.findIndex((t) => t.id === action.payload.transaction.id);
        if (index !== -1) {
          state.transactions[index] = action.payload.transaction;
        }
      })
      .addCase(approveTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to approve transaction";
      })
      .addCase(rejectTransaction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rejectTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.transactions.findIndex((t) => t.id === action.payload.transaction.id);
        if (index !== -1) {
          state.transactions[index] = action.payload.transaction;
        }
      })
      .addCase(rejectTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to reject transaction";
      });
  },
});

export const { clearTransactionsError, clearCurrentTransaction, resetTransactionsState } = transactionsSlice.actions;
export default transactionsSlice.reducer;