import { apiFetch } from "./api";
import {
  CreateUserPayload,
  UpdateUserPayload,
  UpdateUserStatusPayload,
  UsersListResponse,
  UserResponse,
  ApiResponse,
} from "../types/api";

export interface GetUsersParams {
  search?: string;
  branch?: string;
}

export const UserService = {
  createUser: async (
    payload: CreateUserPayload
  ): Promise<ApiResponse<UserResponse>> => {
    return apiFetch<UserResponse>("/api/users/create", {
      method: "POST",
      body: payload,
    });
  },

  getAllUsers: async (params?: GetUsersParams): Promise<ApiResponse<UsersListResponse>> => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append("search", params.search);
    if (params?.branch) queryParams.append("branch", params.branch);

    const query = queryParams.toString();
    const url = query ? `/api/users/all?${query}` : "/api/users/all";
    return apiFetch<UsersListResponse>(url);
  },

  getUserById: async (userId: string): Promise<ApiResponse<UserResponse>> => {
    return apiFetch<UserResponse>(`/api/users/${userId}`);
  },

  updateUser: async (
    userId: string,
    payload: UpdateUserPayload
  ): Promise<ApiResponse<UserResponse>> => {
    return apiFetch<UserResponse>(`/api/users/update/${userId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  updateUserStatus: async (
    userId: string,
    payload: UpdateUserStatusPayload
  ): Promise<ApiResponse<UserResponse>> => {
    return apiFetch<UserResponse>(`/api/users/update-status/${userId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  resetPassword: async (
    userId: string,
    newPassword: string
  ): Promise<ApiResponse> => {
    return apiFetch(`/api/users/reset-password/${userId}`, {
      method: "PATCH",
      body: { newPassword },
    });
  },
};