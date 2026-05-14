import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { UserService } from "../services/user.service";
import {
  User,
  UsersState,
  CreateUserPayload,
  UpdateUserPayload,
  UpdateUserStatusPayload,
  UsersListResponse,
  UserResponse,
} from "../types/api";

const initialState: UsersState = {
  users: [],
  currentUser: null,
  isLoading: false,
  error: null,
};

export const fetchAllUsers = createAsyncThunk<
  UsersListResponse,
  void,
  { rejectValue: string }
>("users/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const response = await UserService.getAllUsers();
    if (response.success && response.data?.users) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch users");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch users";
    return rejectWithValue(message);
  }
});

export const fetchUserById = createAsyncThunk<
  UserResponse,
  string,
  { rejectValue: string }
>("users/fetchById", async (userId, { rejectWithValue }) => {
  try {
    const response = await UserService.getUserById(userId);
    if (response.success && response.data?.user) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to fetch user");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch user";
    return rejectWithValue(message);
  }
});

export const createUser = createAsyncThunk<
  UserResponse,
  CreateUserPayload,
  { rejectValue: string }
>("users/create", async (payload, { rejectWithValue }) => {
  try {
    const response = await UserService.createUser(payload);
    if (response.success && response.data?.user) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to create user");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    return rejectWithValue(message);
  }
});

export const updateUser = createAsyncThunk<
  UserResponse,
  { userId: string; payload: UpdateUserPayload },
  { rejectValue: string }
>("users/update", async ({ userId, payload }, { rejectWithValue }) => {
  try {
    const response = await UserService.updateUser(userId, payload);
    if (response.success && response.data?.user) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to update user");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update user";
    return rejectWithValue(message);
  }
});

export const updateUserStatus = createAsyncThunk<
  UserResponse,
  { userId: string; payload: UpdateUserStatusPayload },
  { rejectValue: string }
>("users/updateStatus", async ({ userId, payload }, { rejectWithValue }) => {
  try {
    const response = await UserService.updateUserStatus(userId, payload);
    if (response.success && response.data?.user) {
      return response.data;
    }
    return rejectWithValue(response.message || "Failed to update user status");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update user status";
    return rejectWithValue(message);
  }
});

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearUsersError: (state) => {
      state.error = null;
    },
    clearCurrentUser: (state) => {
      state.currentUser = null;
    },
    resetUsersState: (state) => {
      state.users = [];
      state.currentUser = null;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload.users;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch users";
      })
      .addCase(fetchUserById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentUser = action.payload.user;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch user";
      })
      .addCase(createUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users.push(action.payload.user);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to create user";
      })
      .addCase(updateUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.users.findIndex((u) => u.id === action.payload.user.id);
        if (index !== -1) {
          state.users[index] = action.payload.user;
        }
        state.currentUser = action.payload.user;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to update user";
      })
      .addCase(updateUserStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.users.findIndex((u) => u.id === action.payload.user.id);
        if (index !== -1) {
          state.users[index] = action.payload.user;
        }
        if (state.currentUser?.id === action.payload.user.id) {
          state.currentUser = action.payload.user;
        }
      })
      .addCase(updateUserStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to update user status";
      });
  },
});

export const { clearUsersError, clearCurrentUser, resetUsersState } = usersSlice.actions;
export default usersSlice.reducer;