import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { dashboardApi } from "../services/dashboard.service";
import {
  DashboardKPI,
  DashboardKPIParams,
} from "../types/dashboard";

export interface DashboardState {
  kpi: DashboardKPI | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  kpi: null,
  isLoading: false,
  error: null,
};

// GET /api/dashboard/kpi
export const fetchDashboardKPI = createAsyncThunk<
  DashboardKPI,
  DashboardKPIParams | undefined,
  { rejectValue: string }
>("dashboard/fetchKPI", async (params, { rejectWithValue }) => {
  try {
    const response = await dashboardApi.getKPI(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch dashboard KPIs");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch dashboard KPIs";
    return rejectWithValue(message);
  }
});

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboardError: (state) => {
      state.error = null;
    },
    resetDashboardState: (state) => {
      state.kpi = null;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardKPI.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardKPI.fulfilled, (state, action) => {
        state.isLoading = false;
        state.kpi = action.payload;
      })
      .addCase(fetchDashboardKPI.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch dashboard KPIs";
      });
  },
});

export const { clearDashboardError, resetDashboardState } = dashboardSlice.actions;
export default dashboardSlice.reducer;
