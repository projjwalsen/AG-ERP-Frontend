import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  CreateDebitCreditNotePayload,
  debitCreditNoteApi,
  GetDebitCreditNotesParams,
  GetDebitCreditNoteInvoicesParams,
} from "../services/debitCreditNote.service";
import {
  DebitCreditNote,
  DebitCreditNoteSelectableInvoice,
  DebitCreditNotesListResponse,
} from "../types/debitCreditNote";

export interface DebitCreditNotesState {
  notes: DebitCreditNote[];
  invoices: DebitCreditNoteSelectableInvoice[];
  currentNote: DebitCreditNote | null;
  isLoading: boolean;
  invoicesLoading: boolean;
  createLoading: boolean;
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

const initialState: DebitCreditNotesState = {
  notes: [],
  invoices: [],
  currentNote: null,
  isLoading: false,
  invoicesLoading: false,
  createLoading: false,
  error: null,
  pagination: null,
};

export const fetchAllDebitCreditNotes = createAsyncThunk<
  DebitCreditNotesListResponse,
  GetDebitCreditNotesParams | undefined,
  { rejectValue: string }
>("debitCreditNotes/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const response = await debitCreditNoteApi.getAll(params);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch debit/credit notes");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch debit/credit notes";
    return rejectWithValue(message);
  }
});

export const fetchDebitCreditNoteInvoices = createAsyncThunk<
  DebitCreditNoteSelectableInvoice[],
  GetDebitCreditNoteInvoicesParams,
  { rejectValue: string }
>("debitCreditNotes/fetchInvoices", async (params, { rejectWithValue }) => {
  try {
    const response = await debitCreditNoteApi.getInvoices(params);
    if (response.success && response.data) {
      return response.data.invoices || [];
    }
    return rejectWithValue(response.message || "Failed to fetch invoices");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch invoices";
    return rejectWithValue(message);
  }
});

export const createDebitCreditNote = createAsyncThunk<
  DebitCreditNote,
  CreateDebitCreditNotePayload,
  { rejectValue: string }
>("debitCreditNotes/create", async (payload, { rejectWithValue }) => {
  try {
    const response = await debitCreditNoteApi.create(payload);
    const note = response.data;
    if (response.success && note) {
      return note;
    }
    return rejectWithValue(response.message || "Failed to create debit/credit note");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create debit/credit note";
    return rejectWithValue(message);
  }
});

export const fetchDebitCreditNoteById = createAsyncThunk<
  DebitCreditNote,
  string,
  { rejectValue: string }
>("debitCreditNotes/fetchById", async (noteId, { rejectWithValue }) => {
  try {
    const response = await debitCreditNoteApi.getById(noteId);
    const note = response.data;
    if (response.success && note) {
      return note;
    }
    return rejectWithValue(response.message || "Failed to fetch debit/credit note");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch debit/credit note";
    return rejectWithValue(message);
  }
});

export const approveDebitCreditNote = createAsyncThunk<
  DebitCreditNote,
  { noteId: string },
  { rejectValue: string }
>("debitCreditNotes/approve", async (payload, { rejectWithValue }) => {
  try {
    const response = await debitCreditNoteApi.approve(payload.noteId);
    const note = response.data;
    if (response.success && note) {
      return note;
    }
    return rejectWithValue(response.message || "Failed to approve debit/credit note");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to approve debit/credit note";
    return rejectWithValue(message);
  }
});

export const rejectDebitCreditNote = createAsyncThunk<
  DebitCreditNote,
  { noteId: string; remarks?: string },
  { rejectValue: string }
>("debitCreditNotes/reject", async (payload, { rejectWithValue }) => {
  try {
    const response = await debitCreditNoteApi.reject(payload);
    const note = response.data;
    if (response.success && note) {
      return note;
    }
    return rejectWithValue(response.message || "Failed to reject debit/credit note");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reject debit/credit note";
    return rejectWithValue(message);
  }
});

const debitCreditNotesSlice = createSlice({
  name: "debitCreditNotes",
  initialState,
  reducers: {
    clearDebitCreditNotesError: (state) => {
      state.error = null;
    },
    clearCurrentDebitCreditNote: (state) => {
      state.currentNote = null;
    },
    resetDebitCreditNotesState: (state) => {
      state.notes = [];
      state.invoices = [];
      state.currentNote = null;
      state.isLoading = false;
      state.invoicesLoading = false;
      state.createLoading = false;
      state.error = null;
      state.pagination = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllDebitCreditNotes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllDebitCreditNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = action.payload.data || [];
        state.pagination = action.payload.meta;
      })
      .addCase(fetchAllDebitCreditNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch debit/credit notes";
      })
      .addCase(fetchDebitCreditNoteInvoices.pending, (state) => {
        state.invoicesLoading = true;
        state.error = null;
      })
      .addCase(fetchDebitCreditNoteInvoices.fulfilled, (state, action) => {
        state.invoicesLoading = false;
        state.invoices = action.payload;
      })
      .addCase(fetchDebitCreditNoteInvoices.rejected, (state, action) => {
        state.invoicesLoading = false;
        state.invoices = [];
        state.error = action.payload || "Failed to fetch invoices";
      })
      .addCase(createDebitCreditNote.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createDebitCreditNote.fulfilled, (state, action) => {
        state.createLoading = false;
        state.currentNote = action.payload;
        state.notes = [action.payload, ...state.notes];
      })
      .addCase(createDebitCreditNote.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload || "Failed to create debit/credit note";
      })
      .addCase(fetchDebitCreditNoteById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDebitCreditNoteById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentNote = action.payload;
      })
      .addCase(fetchDebitCreditNoteById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch debit/credit note";
      })
      .addCase(approveDebitCreditNote.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(approveDebitCreditNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = state.notes.filter((note) => note.id !== action.payload.id);
        if (state.pagination) {
          state.pagination.total = Math.max(0, state.pagination.total - 1);
        }
      })
      .addCase(approveDebitCreditNote.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to approve debit/credit note";
      })
      .addCase(rejectDebitCreditNote.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rejectDebitCreditNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = state.notes.filter((note) => note.id !== action.payload.id);
        if (state.pagination) {
          state.pagination.total = Math.max(0, state.pagination.total - 1);
        }
      })
      .addCase(rejectDebitCreditNote.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to reject debit/credit note";
      });
  },
});

export const {
  clearDebitCreditNotesError,
  clearCurrentDebitCreditNote,
  resetDebitCreditNotesState,
} = debitCreditNotesSlice.actions;

export default debitCreditNotesSlice.reducer;
