import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ledgerApi } from "../services/ledger.service";
import {
  ProductLedgerListItem,
  ProductLedgerListResponse,
  ProductLedgerDetail,
  ProductLedgerMovementType,
} from "../types/ledger";

export interface LedgerState {
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
}

const initialState: LedgerState = {
  ledgers: [],
  isListLoading: false,
  listError: null,
  pagination: null,
  currentDetail: null,
  isDetailLoading: false,
  detailError: null,
};

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
  { productId: string; page?: number; limit?: number; movementType?: ProductLedgerMovementType; branchId?: string },
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
    resetLedgerState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchAllProductLedgers
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
      // fetchProductLedgerById
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
      });
  },
});

export const { clearLedgerError, clearCurrentDetail, resetLedgerState } = ledgerSlice.actions;
export default ledgerSlice.reducer;
