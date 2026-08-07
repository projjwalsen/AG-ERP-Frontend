import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  CreatePurchaseOrderPayload,
  GetPurchaseOrdersParams,
  purchaseOrderApi,
  RejectPurchaseOrderPayload,
} from "../services/purchase-order.service";
import {
  PurchaseOrder,
  PurchaseOrdersListResponse,
  PurchaseOrdersPaginationMeta,
} from "../types/purchase-order";

export interface PurchaseOrdersState {
  purchaseOrders: PurchaseOrder[];
  currentPurchaseOrder: PurchaseOrder | null;
  isLoading: boolean;
  error: string | null;
  pagination: PurchaseOrdersPaginationMeta | null;
}

const initialState: PurchaseOrdersState = {
  purchaseOrders: [],
  currentPurchaseOrder: null,
  isLoading: false,
  error: null,
  pagination: null,
};

export const fetchAllPurchaseOrders = createAsyncThunk<
  PurchaseOrdersListResponse,
  GetPurchaseOrdersParams | undefined,
  { rejectValue: string }
>("purchaseOrders/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const response = await purchaseOrderApi.getAll(params);
    if (response.success && response.data) return response.data;
    return rejectWithValue(response.message || "Failed to fetch purchase orders");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch purchase orders";
    return rejectWithValue(message);
  }
});

export const fetchPurchaseOrderById = createAsyncThunk<
  PurchaseOrder,
  string,
  { rejectValue: string }
>("purchaseOrders/fetchById", async (purchaseOrderId, { rejectWithValue }) => {
  try {
    const response = await purchaseOrderApi.getById(purchaseOrderId);
    if (response.success && response.data) return response.data;
    return rejectWithValue(response.message || "Failed to fetch purchase order");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch purchase order";
    return rejectWithValue(message);
  }
});

export const createPurchaseOrder = createAsyncThunk<
  PurchaseOrder,
  CreatePurchaseOrderPayload,
  { rejectValue: string }
>("purchaseOrders/create", async (payload, { rejectWithValue }) => {
  try {
    const response = await purchaseOrderApi.create(payload);
    if (response.success && response.data) return response.data;
    return rejectWithValue(response.message || "Failed to create purchase order");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create purchase order";
    return rejectWithValue(message);
  }
});

export const approvePurchaseOrder = createAsyncThunk<
  PurchaseOrder,
  string,
  { rejectValue: string }
>("purchaseOrders/approve", async (purchaseOrderId, { rejectWithValue }) => {
  try {
    const response = await purchaseOrderApi.approve(purchaseOrderId);
    if (response.success && response.data) return response.data;
    return rejectWithValue(response.message || "Failed to approve purchase order");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to approve purchase order";
    return rejectWithValue(message);
  }
});

export const rejectPurchaseOrder = createAsyncThunk<
  PurchaseOrder,
  RejectPurchaseOrderPayload,
  { rejectValue: string }
>("purchaseOrders/reject", async (payload, { rejectWithValue }) => {
  try {
    const response = await purchaseOrderApi.reject(payload);
    if (response.success && response.data) return response.data;
    return rejectWithValue(response.message || "Failed to reject purchase order");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reject purchase order";
    return rejectWithValue(message);
  }
});

const purchaseOrdersSlice = createSlice({
  name: "purchaseOrders",
  initialState,
  reducers: {
    clearPurchaseOrdersError: (state) => {
      state.error = null;
    },
    clearCurrentPurchaseOrder: (state) => {
      state.currentPurchaseOrder = null;
    },
    resetPurchaseOrdersState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllPurchaseOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllPurchaseOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.purchaseOrders = action.payload.data || [];
        state.pagination = action.payload.meta || null;
      })
      .addCase(fetchAllPurchaseOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch purchase orders";
      })
      .addCase(fetchPurchaseOrderById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseOrderById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPurchaseOrder = action.payload;
      })
      .addCase(fetchPurchaseOrderById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch purchase order";
      })
      .addCase(createPurchaseOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPurchaseOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.purchaseOrders.unshift(action.payload);
      })
      .addCase(createPurchaseOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to create purchase order";
      })
      .addCase(approvePurchaseOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(approvePurchaseOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.purchaseOrders = state.purchaseOrders.filter((po) => po.id !== action.payload.id);
        if (state.pagination) state.pagination.total = Math.max(0, state.pagination.total - 1);
      })
      .addCase(approvePurchaseOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to approve purchase order";
      })
      .addCase(rejectPurchaseOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rejectPurchaseOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.purchaseOrders = state.purchaseOrders.filter((po) => po.id !== action.payload.id);
        if (state.pagination) state.pagination.total = Math.max(0, state.pagination.total - 1);
      })
      .addCase(rejectPurchaseOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to reject purchase order";
      });
  },
});

export const {
  clearPurchaseOrdersError,
  clearCurrentPurchaseOrder,
  resetPurchaseOrdersState,
} = purchaseOrdersSlice.actions;
export default purchaseOrdersSlice.reducer;
