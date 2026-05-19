export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  branchAccessType?: "ALL" | "SELECTED";
  branchId?: string;
  status?: "ACTIVE" | "SUSPENDED";
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: "ACTIVE" | "SUSPENDED";
  branchAccessType?: "ALL" | "SELECTED";
  branchId?: string | null;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  branchAccessType?: "ALL" | "SELECTED";
  branchId?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  branchAccessType?: "ALL" | "SELECTED";
  branchId?: string;
}

export interface UpdateUserStatusPayload {
  status: "ACTIVE" | "SUSPENDED";
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UsersState {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface ProfileResponse {
  profile: AuthUser;
}

export interface UsersListResponse {
  users: User[];
}

export interface UserResponse {
  user: User;
}