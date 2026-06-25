import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { reportApi } from "@/app/services/report.service";
import {
  OutstandingReportResponse,
  GetOutstandingReportParams,
  DayBookResponse,
  GetDayBookParams,
  GSTR1ReportResponse,
  GetGSTR1Params,
  SuspenseReportResponse,
  GetSuspenseParams,
  InventoryReportResponse,
  GetInventoryParams,
} from "@/app/types/report";

// =====================================================================
// STATE
// =====================================================================


export interface ReportsState {
  outstanding: {
    data: OutstandingReportResponse | null;
    isLoading: boolean;
    error: string | null;
  };
  dayBook: {
    data: DayBookResponse | null;
    isLoading: boolean;
    error: string | null;
  };
  gstr1: {
    data: GSTR1ReportResponse | null;
    isLoading: boolean;
    error: string | null;
  };
  suspense: {
    data: SuspenseReportResponse | null;
    isLoading: boolean;
    error: string | null;
  };
  inventory: {
    data: InventoryReportResponse | null;
    isLoading: boolean;
    error: string | null;
  };
}

const initialState: ReportsState = {
  outstanding: { data: null, isLoading: false, error: null },
  dayBook: { data: null, isLoading: false, error: null },
  gstr1: { data: null, isLoading: false, error: null },
  suspense: { data: null, isLoading: false, error: null },
  inventory: { data: null, isLoading: false, error: null },
};

// =====================================================================
// HELPERS
// =====================================================================

/**
 * Prisma's `Decimal` is JSON-serialized as a string. The reports service
 * returns raw values from the backend, so every numeric field that came
 * from Prisma needs to be normalized at the slice boundary. Doing it
 * here (instead of in the service) keeps the service close to the wire
 * format and keeps the rest of the app free of `String -> number`
 * bookkeeping.
 */
function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function castOutstanding(
  r: OutstandingReportResponse
): OutstandingReportResponse {
  return {
    ...r,
    summary: {
      totalAgencies: r.summary?.totalAgencies ?? 0,
      totalOutstanding: toNumber(r.summary?.totalOutstanding),
    },
    rows: (r.rows || []).map((row) => ({
      ...row,
      openingBalance: toNumber(row.openingBalance),
      debit: toNumber(row.debit),
      credit: toNumber(row.credit),
      total_outstanding: toNumber(row.total_outstanding),
    })),
  };
}

function castDayBook(r: DayBookResponse): DayBookResponse {
  return {
    ...r,
    summary: {
      totalTransactions: r.summary?.totalTransactions ?? 0,
      totalReceipts: toNumber(r.summary?.totalReceipts),
      totalPayments: toNumber(r.summary?.totalPayments),
      netCashFlow: toNumber(r.summary?.netCashFlow),
    },
    entries: (r.entries || []).map((e) => ({
      ...e,
      debit: toNumber(e.debit),
      credit: toNumber(e.credit),
      allocations: (e.allocations || []).map((a) => ({
        ...a,
        allocatedAmount: toNumber(a.allocatedAmount),
      })),
    })),
  };
}

function castGSTR1(r: GSTR1ReportResponse): GSTR1ReportResponse {
  return {
    ...r,
    summary: {
      totalInvoices: r.summary?.totalInvoices ?? 0,
      b2bInvoices: r.summary?.b2bInvoices ?? 0,
      b2cInvoices: r.summary?.b2cInvoices ?? 0,
      totalTaxableValue: toNumber(r.summary?.totalTaxableValue),
      totalCGST: toNumber(r.summary?.totalCGST),
      totalSGST: toNumber(r.summary?.totalSGST),
      totalIGST: toNumber(r.summary?.totalIGST),
      totalGST: toNumber(r.summary?.totalGST),
      totalInvoiceValue: toNumber(r.summary?.totalInvoiceValue),
    },
    rows: (r.rows || []).map((row) => ({
      ...row,
      taxable_value: toNumber(row.taxable_value),
      cgst_rate_amount: toNumber(row.cgst_rate_amount),
      sgst_rate_amount: toNumber(row.sgst_rate_amount),
      igst_rate_amount: toNumber(row.igst_rate_amount),
      invoice_total: toNumber(row.invoice_total),
    })),
  };
}

function castSuspense(r: SuspenseReportResponse): SuspenseReportResponse {
  return {
    ...r,
    summary: {
      totalSuspenseEntries: r.summary?.totalSuspenseEntries ?? 0,
      pendingAuthentication: r.summary?.pendingAuthentication ?? 0,
      authenticated: r.summary?.authenticated ?? 0,
      totalAmount: toNumber(r.summary?.totalAmount),
    },
    rows: (r.rows || []).map((row) => ({
      ...row,
      amount_received: toNumber(row.amount_received),
    })),
  };
}

function castInventory(r: InventoryReportResponse): InventoryReportResponse {
  return {
    ...r,
    summary: {
      totalProducts: r.summary?.totalProducts ?? 0,
      totalBatches: r.summary?.totalBatches ?? 0,
      totalStockKG: toNumber(r.summary?.totalStockKG),
      totalStockLTR: toNumber(r.summary?.totalStockLTR),
    },
    rows: (r.rows || []).map((row) => ({
      ...row,
      stockKG: toNumber(row.stockKG),
      stockLTR: toNumber(row.stockLTR),
    })),
  };
}

// =====================================================================
// THUNKS
// =====================================================================

export const fetchOutstandingReport = createAsyncThunk<
  OutstandingReportResponse,
  GetOutstandingReportParams | undefined,
  { rejectValue: string }
>("reports/fetchOutstanding", async (params, { rejectWithValue }) => {
  try {
    const response = await reportApi.getOutstandingReport(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch AP/AR report");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch AP/AR report";
    return rejectWithValue(message);
  }
});

export const fetchBranchDayBook = createAsyncThunk<
  DayBookResponse,
  GetDayBookParams,
  { rejectValue: string }
>("reports/fetchDayBook", async (params, { rejectWithValue }) => {
  try {
    const response = await reportApi.getBranchDayBook(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch day book");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch day book";
    return rejectWithValue(message);
  }
});

export const fetchGSTR1Report = createAsyncThunk<
  GSTR1ReportResponse,
  GetGSTR1Params | undefined,
  { rejectValue: string }
>("reports/fetchGSTR1", async (params, { rejectWithValue }) => {
  try {
    const response = await reportApi.getGSTR1Report(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch GSTR-1 report");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch GSTR-1 report";
    return rejectWithValue(message);
  }
});

export const fetchGSTSuspenseLog = createAsyncThunk<
  SuspenseReportResponse,
  GetSuspenseParams | undefined,
  { rejectValue: string }
>("reports/fetchSuspense", async (params, { rejectWithValue }) => {
  try {
    const response = await reportApi.getGSTSuspenseLog(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch suspense log");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch suspense log";
    return rejectWithValue(message);
  }
});

export const fetchStockInventoryReport = createAsyncThunk<
  InventoryReportResponse,
  GetInventoryParams | undefined,
  { rejectValue: string }
>("reports/fetchInventory", async (params, { rejectWithValue }) => {
  try {
    const response = await reportApi.getStockInventoryReport(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch inventory report");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch inventory report";
    return rejectWithValue(message);
  }
});

// =====================================================================
// SLICE
// =====================================================================

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    clearOutstandingReport: (state) => {
      state.outstanding = { data: null, isLoading: false, error: null };
    },
    clearDayBook: (state) => {
      state.dayBook = { data: null, isLoading: false, error: null };
    },
    clearGSTR1Report: (state) => {
      state.gstr1 = { data: null, isLoading: false, error: null };
    },
    clearSuspenseLog: (state) => {
      state.suspense = { data: null, isLoading: false, error: null };
    },
    clearInventoryReport: (state) => {
      state.inventory = { data: null, isLoading: false, error: null };
    },
    resetReportsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // ----- Outstanding -----
      .addCase(fetchOutstandingReport.pending, (state) => {
        state.outstanding.isLoading = true;
        state.outstanding.error = null;
      })
      .addCase(fetchOutstandingReport.fulfilled, (state, action) => {
        state.outstanding.isLoading = false;
        state.outstanding.data = castOutstanding(action.payload);
      })
      .addCase(fetchOutstandingReport.rejected, (state, action) => {
        state.outstanding.isLoading = false;
        state.outstanding.error =
          action.payload || "Failed to fetch AP/AR report";
      })
      // ----- Day Book -----
      .addCase(fetchBranchDayBook.pending, (state) => {
        state.dayBook.isLoading = true;
        state.dayBook.error = null;
      })
      .addCase(fetchBranchDayBook.fulfilled, (state, action) => {
        state.dayBook.isLoading = false;
        state.dayBook.data = castDayBook(action.payload);
      })
      .addCase(fetchBranchDayBook.rejected, (state, action) => {
        state.dayBook.isLoading = false;
        state.dayBook.error = action.payload || "Failed to fetch day book";
      })
      // ----- GSTR-1 -----
      .addCase(fetchGSTR1Report.pending, (state) => {
        state.gstr1.isLoading = true;
        state.gstr1.error = null;
      })
      .addCase(fetchGSTR1Report.fulfilled, (state, action) => {
        state.gstr1.isLoading = false;
        state.gstr1.data = castGSTR1(action.payload);
      })
      .addCase(fetchGSTR1Report.rejected, (state, action) => {
        state.gstr1.isLoading = false;
        state.gstr1.error = action.payload || "Failed to fetch GSTR-1 report";
      })
      // ----- Suspense -----
      .addCase(fetchGSTSuspenseLog.pending, (state) => {
        state.suspense.isLoading = true;
        state.suspense.error = null;
      })
      .addCase(fetchGSTSuspenseLog.fulfilled, (state, action) => {
        state.suspense.isLoading = false;
        state.suspense.data = castSuspense(action.payload);
      })
      .addCase(fetchGSTSuspenseLog.rejected, (state, action) => {
        state.suspense.isLoading = false;
        state.suspense.error = action.payload || "Failed to fetch suspense log";
      })
      // ----- Inventory -----
      .addCase(fetchStockInventoryReport.pending, (state) => {
        state.inventory.isLoading = true;
        state.inventory.error = null;
      })
      .addCase(fetchStockInventoryReport.fulfilled, (state, action) => {
        state.inventory.isLoading = false;
        state.inventory.data = castInventory(action.payload);
      })
      .addCase(fetchStockInventoryReport.rejected, (state, action) => {
        state.inventory.isLoading = false;
        state.inventory.error =
          action.payload || "Failed to fetch inventory report";
      });
  },
});

export const {
  clearOutstandingReport,
  clearDayBook,
  clearGSTR1Report,
  clearSuspenseLog,
  clearInventoryReport,
  resetReportsState,
} = reportsSlice.actions;

export default reportsSlice.reducer;
