import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AuthService } from "../services/auth.service";
import { apiFetch } from "../services/api";
import {
  LoginPayload,
  AuthUser,
  AuthState,
  LoginResponse,
  ProfileResponse,
  UserAccessResponse,
  UserPermission,
  UserRole,
} from "../types/api";

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  permissions: [],
  roles: [],
};

export const login = createAsyncThunk<
  LoginResponse,
  LoginPayload,
  { rejectValue: string }
>("auth/login", async (payload, { rejectWithValue }) => {
  try {
    const response = await AuthService.login(payload);
    if (response.success && response.data?.user) {
      return response.data;
    }
    return rejectWithValue(response.message || "Login failed");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Login failed";
    return rejectWithValue(message);
  }
});

export const getProfile = createAsyncThunk<
  ProfileResponse,
  void,
  { rejectValue: string }
>("auth/getProfile", async (_, { rejectWithValue }) => {
  try {
    const response = await AuthService.getProfile();
    if (response.success && response.data?.profile) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch profile");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch profile";
    return rejectWithValue(message);
  }
});

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.logout();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Logout failed";
      return rejectWithValue(message);
    }
  }
);

export const fetchUserAccess = createAsyncThunk<
  UserAccessResponse,
  string,
  { rejectValue: string }
>("auth/fetchUserAccess", async (userId, { rejectWithValue }) => {
  try {
    const response = await apiFetch<{ result: { id: string; name: string; email: string; lastLoginAt: string; roles: UserRole[]; permissions: UserPermission[] } }>(`api/rbac/users/${userId}/access`);
    if (response.success && response.data?.result) {
      return { result: response.data.result };
    }
    return rejectWithValue(response.message || "Failed to fetch user access");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch user access";
    return rejectWithValue(message);
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setPermissions: (state, action: PayloadAction<UserPermission[]>) => {
      state.permissions = action.payload;
    },
    setRoles: (state, action: PayloadAction<UserRole[]>) => {
      state.roles = action.payload;
    },
    resetAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.permissions = [];
      state.roles = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Login failed";
        state.isAuthenticated = false;
      })
      .addCase(getProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.profile;
        state.isAuthenticated = true;
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch profile";
        state.isAuthenticated = false;
      })
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.permissions = [];
        state.roles = [];
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Logout failed";
      })
      .addCase(fetchUserAccess.fulfilled, (state, action) => {
        state.permissions = action.payload.result.permissions || [];
        state.roles = action.payload.result.roles || [];
      });
  },
});

export const { clearError, setUser, setPermissions, setRoles, resetAuth } = authSlice.actions;
export default authSlice.reducer;