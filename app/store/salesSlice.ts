import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { salesApi } from "../services/sales.service";
import { Sales, SalesListResponse } from "../types/sales";

export interface CreateSalesPayload {
  agencyId: string;
  branchId: string;
  items: {
    productId: string;
    batchId: string;
    quantity: number;
    unit: "KG" | "LTR";
  }[];
  remarks?: string;
}

export interface ApproveSalesPayload {
  saleId: string;
  remarks?: string;
}

export interface RejectSalesPayload {
  saleId: string;
  remarks: string;
}

export interface SalesState {
  sales: Sales[];
  currentSale: Sales | null;
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

const initialState: SalesState = {
  sales: [],
  currentSale: null,
  isLoading: false,
  error: null,
  pagination: null,
};

// GET /api/sales/get-all
export const fetchAllSales = createAsyncThunk<
  SalesListResponse,
  { page?: number; limit?: number; status?: "PENDING" | "APPROVED" | "REJECTED"; branchId?: string } | undefined,
  { rejectValue: string }
>("sales/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const response = await salesApi.getAll(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch sales");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch sales";
    return rejectWithValue(message);
  }
});

// GET /api/sales/:saleId
export const fetchSaleById = createAsyncThunk<
  Sales,
  string,
  { rejectValue: string }
>("sales/fetchById", async (saleId, { rejectWithValue }) => {
  try {
    const response = await salesApi.getById(saleId);
    // Backend returns data directly as Sales, not wrapped
    const sale = response.data;
    if (response.success && sale) {
      return sale;
    }
    return rejectWithValue(response.message || "Failed to fetch sale");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch sale";
    return rejectWithValue(message);
  }
});

// POST /api/sales/create
export const createSale = createAsyncThunk<
  Sales,
  CreateSalesPayload,
  { rejectValue: string }
>("sales/create", async (payload, { rejectWithValue }) => {
  try {
    const response = await salesApi.create(payload);
    // Backend returns data directly as Sales, not wrapped
    const sale = response.data;
    if (response.success && sale) {
      return sale;
    }
    return rejectWithValue(response.message || "Failed to create sale");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create sale";
    return rejectWithValue(message);
  }
});

// PATCH /api/sales/:saleId/approve
export const approveSale = createAsyncThunk<
  Sales,
  { saleId: string; remarks?: string },
  { rejectValue: string }
>("sales/approve", async (payload, { rejectWithValue }) => {
  try {
    const response = await salesApi.approve(payload);
    // Backend returns data directly as Sales, not wrapped
    const sale = response.data;
    if (response.success && sale) {
      return sale;
    }
    return rejectWithValue(response.message || "Failed to approve sale");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to approve sale";
    return rejectWithValue(message);
  }
});

// PATCH /api/sales/:saleId/reject
export const rejectSale = createAsyncThunk<
  Sales,
  { saleId: string; remarks: string },
  { rejectValue: string }
>("sales/reject", async (payload, { rejectWithValue }) => {
  try {
    const response = await salesApi.reject(payload);
    // Backend returns data directly as Sales, not wrapped
    const sale = response.data;
    if (response.success && sale) {
      return sale;
    }
    return rejectWithValue(response.message || "Failed to reject sale");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reject sale";
    return rejectWithValue(message);
  }
});

const salesSlice = createSlice({
  name: "sales",
  initialState,
  reducers: {
    clearSalesError: (state) => {
      state.error = null;
    },
    clearCurrentSale: (state) => {
      state.currentSale = null;
    },
    resetSalesState: (state) => {
      state.sales = [];
      state.currentSale = null;
      state.isLoading = false;
      state.error = null;
      state.pagination = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAllSales
      .addCase(fetchAllSales.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllSales.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sales = action.payload.data || [];
        if (action.payload.meta) {
          state.pagination = action.payload.meta;
        }
      })
      .addCase(fetchAllSales.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch sales";
      })
      // fetchSaleById
      .addCase(fetchSaleById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSaleById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSale = action.payload;
      })
      .addCase(fetchSaleById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch sale";
      })
      // createSale
      .addCase(createSale.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSale.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sales.unshift(action.payload);
      })
      .addCase(createSale.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to create sale";
      })
      // approveSale
      .addCase(approveSale.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(approveSale.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.sales.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.sales[index] = action.payload;
        }
      })
      .addCase(approveSale.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to approve sale";
      })
      // rejectSale
      .addCase(rejectSale.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rejectSale.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.sales.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.sales[index] = action.payload;
        }
      })
      .addCase(rejectSale.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to reject sale";
      });
  },
});

export const { clearSalesError, clearCurrentSale, resetSalesState } = salesSlice.actions;
export default salesSlice.reducer;