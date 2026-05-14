import { apiFetch } from "./api";
import {
  CreateUserPayload,
  UpdateUserPayload,
  UpdateUserStatusPayload,
  UsersListResponse,
  UserResponse,
  ApiResponse,
} from "../types/api";

export const UserService = {
  createUser: async (
    payload: CreateUserPayload
  ): Promise<ApiResponse<UserResponse>> => {
    return apiFetch<UserResponse>("/api/users/create", {
      method: "POST",
      body: payload,
    });
  },

  getAllUsers: async (): Promise<ApiResponse<UsersListResponse>> => {
    return apiFetch<UsersListResponse>("/api/users/all");
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
};