import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { inventoryApi } from "../services/inventory.service";
import { InventoryBatch, InventoryListResponse } from "../types/inventory";

export interface InventoryState {
  batches: InventoryBatch[];
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

const initialState: InventoryState = {
  batches: [],
  isLoading: false,
  error: null,
  pagination: null,
};

// GET /api/inventory/batches/all
export const fetchInventory = createAsyncThunk<
  { data: InventoryBatch[]; meta: any },
  { page?: number; limit?: number; branchId?: string; productId?: string; search?: string; isActive?: boolean } | undefined,
  { rejectValue: string }
>("inventory/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const response = await inventoryApi.getAll(params);
    if (response.success && response.data) {
      return response.data as { data: InventoryBatch[]; meta: any };
    }
    return rejectWithValue(response.message || "Failed to fetch inventory");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch inventory";
    return rejectWithValue(message);
  }
});

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    clearInventoryError: (state) => {
      state.error = null;
    },
    resetInventoryState: (state) => {
      state.batches = [];
      state.isLoading = false;
      state.error = null;
      state.pagination = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.batches = action.payload.data || [];
        if (action.payload.meta) {
          state.pagination = action.payload.meta;
        }
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch inventory";
      });
  },
});

export const { clearInventoryError, resetInventoryState } = inventorySlice.actions;
export default inventorySlice.reducer;