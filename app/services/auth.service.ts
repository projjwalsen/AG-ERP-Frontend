import { apiFetch } from "./api";
import {
  LoginPayload,
  SignupPayload,
  LoginResponse,
  ProfileResponse,
  ApiResponse,
} from "../types/api";

export const AuthService = {
  login: async (payload: LoginPayload): Promise<ApiResponse<LoginResponse>> => {
    return apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  signup: async (payload: SignupPayload): Promise<ApiResponse<LoginResponse>> => {
    return apiFetch<LoginResponse>("/api/auth/signup", {
      method: "POST",
      body: payload,
    });
  },

  getProfile: async (): Promise<ApiResponse<ProfileResponse>> => {
    return apiFetch<ProfileResponse>("/api/auth/profile");
  },

  logout: async (): Promise<ApiResponse> => {
    return apiFetch("/api/auth/logout", {
      method: "POST",
    });
  },
};