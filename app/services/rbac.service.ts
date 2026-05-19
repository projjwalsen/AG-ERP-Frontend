// RBAC API Service
import { apiFetch } from "./api";
import {
  Role,
  Permission,
  UserAccess,
  UpsertRolePayload,
  UpsertPermissionPayload,
  RolesListResponse,
  PermissionsListResponse,
} from "../types/rbac";

export const rbacApi = {
  // Roles
  async upsertRole(payload: UpsertRolePayload): Promise<{ success: boolean; message: string; data?: Role }> {
    return apiFetch<Role>("api/rbac/roles/upsert", {
      method: "POST",
      body: payload,
    });
  },

  async getRoles(): Promise<{ success: boolean; message: string; data?: RolesListResponse }> {
    return apiFetch<RolesListResponse>("api/rbac/roles/all");
  },

  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[]
  ): Promise<{ success: boolean; message: string }> {
    return apiFetch(`api/rbac/roles/${roleId}/permissions`, {
      method: "POST",
      body: { permissionIds },
    });
  },

  // Permissions
  async upsertPermission(
    payload: UpsertPermissionPayload
  ): Promise<{ success: boolean; message: string; data?: Permission }> {
    return apiFetch<Permission>("api/rbac/permissions/upsert", {
      method: "POST",
      body: payload,
    });
  },

  async getPermissions(): Promise<{ success: boolean; message: string; data?: PermissionsListResponse }> {
    return apiFetch<PermissionsListResponse>("api/rbac/permissions/all");
  },

  // User Role Assignment
  async assignRolesToUser(
    userId: string,
    roleIds: string[]
  ): Promise<{ success: boolean; message: string }> {
    return apiFetch(`api/rbac/users/${userId}/roles/assign`, {
      method: "POST",
      body: { roleIds },
    });
  },

  async unassignRoleFromUser(
    userId: string,
    roleId: string
  ): Promise<{ success: boolean; message: string }> {
    return apiFetch(`api/rbac/users/${userId}/roles/unassign`, {
      method: "DELETE",
      body: { roleId },
    });
  },

  async getUserAccess(userId: string): Promise<{ success: boolean; message: string; data?: UserAccess }> {
    return apiFetch<UserAccess>(`api/rbac/users/${userId}/access`);
  },
};