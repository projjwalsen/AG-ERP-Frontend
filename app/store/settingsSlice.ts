import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { settingApi } from "../services/setting.service";
import {
  Settings,
  SettingsResponse,
  UpdateSettingsPayload,
} from "../types/setting";

export interface SettingsState {
  settings: Settings | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
};

// GET /api/settings/get-all
export const fetchSettings = createAsyncThunk<
  SettingsResponse,
  void,
  { rejectValue: string }
>("settings/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const response = await settingApi.getAll();
    console.info("[settings] GET /api/settings/get-all response", response);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch settings");
  } catch (error: unknown) {
    console.error("[settings] GET /api/settings/get-all threw", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch settings";
    return rejectWithValue(message);
  }
});

// PATCH /api/settings/update
export const updateSettings = createAsyncThunk<
  SettingsResponse,
  UpdateSettingsPayload,
  { rejectValue: string }
>("settings/update", async (payload, { rejectWithValue }) => {
  try {
    console.info("[settings] PATCH /api/settings/update payload", payload);
    const response = await settingApi.update(payload);
    console.info("[settings] PATCH /api/settings/update response", response);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to update settings");
  } catch (error: unknown) {
    console.error("[settings] PATCH /api/settings/update threw", error);
    const message =
      error instanceof Error ? error.message : "Failed to update settings";
    return rejectWithValue(message);
  }
});

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    clearSettingsError: (state) => {
      state.error = null;
    },
    resetSettingsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchSettings
      .addCase(fetchSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.settings = action.payload.data;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch settings";
      })
      // updateSettings
      .addCase(updateSettings.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.isSubmitting = false;
        // The backend returns the updated row, so replace the cached
        // settings with the freshest values from the server.
        if (action.payload?.data) {
          state.settings = action.payload.data;
        }
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload || "Failed to update settings";
      });
  },
});

export const { clearSettingsError, resetSettingsState } =
  settingsSlice.actions;
export default settingsSlice.reducer;
