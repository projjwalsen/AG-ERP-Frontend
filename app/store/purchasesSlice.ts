import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { purchaseApi } from "../services/purchase.service";
import { Purchase, PurchasesListResponse } from "../types/purchase";

export interface CreatePurchasePayload {
  agencyId: string;
  branchId: string;
  invoiceNo: string;
  items: {
    productId: string;
    batchNo: string;
    quantity: number;
    unit: "KG" | "LTR";
    purchasePrice: number;
  }[];
  remarks?: string;
}

export interface ApprovePurchasePayload {
  purchaseId: string;
}

export interface RejectPurchasePayload {
  purchaseId: string;
  remarks: string;
}

export interface PurchasesState {
  purchases: Purchase[];
  currentPurchase: Purchase | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  } | null;
}

const initialState: PurchasesState = {
  purchases: [],
  currentPurchase: null,
  isLoading: false,
  error: null,
  pagination: null,
};

// GET /api/purchases/get-all
export const fetchAllPurchases = createAsyncThunk<
  PurchasesListResponse,
  { page?: number; limit?: number; status?: "PENDING" | "APPROVED" | "REJECTED"; branchId?: string } | undefined,
  { rejectValue: string }
>("purchases/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const response = await purchaseApi.getAll(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch purchases");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch purchases";
    return rejectWithValue(message);
  }
});

// GET /api/purchases/:purchaseId
export const fetchPurchaseById = createAsyncThunk<
  Purchase,
  string,
  { rejectValue: string }
>("purchases/fetchById", async (purchaseId, { rejectWithValue }) => {
  try {
    const response = await purchaseApi.getById(purchaseId);
    // Backend returns data directly as Purchase, not wrapped
    const purchase = response.data;
    if (response.success && purchase) {
      return purchase;
    }
    return rejectWithValue(response.message || "Failed to fetch purchase");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch purchase";
    return rejectWithValue(message);
  }
});

// POST /api/purchases/create
export const createPurchase = createAsyncThunk<
  Purchase,
  CreatePurchasePayload,
  { rejectValue: string }
>("purchases/create", async (payload, { rejectWithValue }) => {
  try {
    const response = await purchaseApi.create(payload);
    // Backend returns data directly as Purchase, not wrapped
    const purchase = response.data;
    if (response.success && purchase) {
      return purchase;
    }
    return rejectWithValue(response.message || "Failed to create purchase");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create purchase";
    return rejectWithValue(message);
  }
});

// PATCH /api/purchases/:purchaseId/approve
export interface ApprovePurchasePayload {
  purchaseId: string;
}

export const approvePurchase = createAsyncThunk<
  Purchase,
  ApprovePurchasePayload,
  { rejectValue: string }
>("purchases/approve", async (payload, { rejectWithValue }) => {
  try {
    const response = await purchaseApi.approve(payload.purchaseId);
    // Backend returns data directly as Purchase, not wrapped
    const purchase = response.data;
    if (response.success && purchase) {
      return purchase;
    }
    return rejectWithValue(response.message || "Failed to approve purchase");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to approve purchase";
    return rejectWithValue(message);
  }
});

// PATCH /api/purchases/:purchaseId/reject
export const rejectPurchase = createAsyncThunk<
  Purchase,
  RejectPurchasePayload,
  { rejectValue: string }
>("purchases/reject", async (payload, { rejectWithValue }) => {
  try {
    const response = await purchaseApi.reject(payload);
    // Backend returns data directly as Purchase, not wrapped
    const purchase = response.data;
    if (response.success && purchase) {
      return purchase;
    }
    return rejectWithValue(response.message || "Failed to reject purchase");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reject purchase";
    return rejectWithValue(message);
  }
});

const purchasesSlice = createSlice({
  name: "purchases",
  initialState,
  reducers: {
    clearPurchasesError: (state) => {
      state.error = null;
    },
    clearCurrentPurchase: (state) => {
      state.currentPurchase = null;
    },
    resetPurchasesState: (state) => {
      state.purchases = [];
      state.currentPurchase = null;
      state.isLoading = false;
      state.error = null;
      state.pagination = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAllPurchases
      .addCase(fetchAllPurchases.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllPurchases.fulfilled, (state, action) => {
        state.isLoading = false;
        state.purchases = action.payload.data || [];
        if (action.payload.meta) {
          state.pagination = action.payload.meta;
        }
      })
      .addCase(fetchAllPurchases.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch purchases";
      })
      // fetchPurchaseById
      .addCase(fetchPurchaseById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPurchase = action.payload;
      })
      .addCase(fetchPurchaseById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch purchase";
      })
      // createPurchase
      .addCase(createPurchase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPurchase.fulfilled, (state, action) => {
        state.isLoading = false;
        state.purchases.unshift(action.payload);
      })
      .addCase(createPurchase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to create purchase";
      })
      // approvePurchase
      .addCase(approvePurchase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(approvePurchase.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.purchases.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.purchases[index] = action.payload;
        }
      })
      .addCase(approvePurchase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to approve purchase";
      })
      // rejectPurchase
      .addCase(rejectPurchase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rejectPurchase.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.purchases.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.purchases[index] = action.payload;
        }
      })
      .addCase(rejectPurchase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to reject purchase";
      });
  },
});

export const { clearPurchasesError, clearCurrentPurchase, resetPurchasesState } = purchasesSlice.actions;
export default purchasesSlice.reducer;