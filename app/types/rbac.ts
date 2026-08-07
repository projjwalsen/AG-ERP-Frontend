// RBAC Types

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  key: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserAccess {
  id: string;
  name: string;
  email: string;
  lastLoginAt?: string;
  roles: { id: string; name: string; code: string }[];
  permissions: Permission[];
}

export interface UpsertRolePayload {
  id?: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface UpsertPermissionPayload {
  id?: string;
  module: string;
  action: string;
  description?: string;
}

export interface AssignPermissionsPayload {
  permissionIds: string[];
}

export interface AssignRolesPayload {
  roleIds: string[];
}

export interface UnassignRolePayload {
  roleId: string;
}

export interface RolesListResponse {
  roles: Role[];
}

export interface PermissionsListResponse {
  permissions: Permission[];
}

// Available modules for the system
export const AVAILABLE_MODULES = [
  { value: "USER", label: "User Management" },
  { value: "ROLE", label: "Role Management" },
  { value: "BRANCH", label: "Branch Management" },
  { value: "AGENCY", label: "Agency Management" },
  { value: "PRODUCT", label: "Product Management" },
  { value: "PURCHASE", label: "Purchase Management" },
  { value: "SALE", label: "Sale Management" },
  { value: "TRANSACTION", label: "Transaction Management" },
  { value: "LEDGER", label: "Ledger Management" },
  { value: "JOURNAL", label: "Journal Management" },
  { value: "DRCR_NOTE", label: "Debit/Credit Note Management" },
  { value: "OUTSTANDING_REPORT", label: "Outstanding Report" },
  { value: "GSTR1", label: "GSTR-1 Report" },
  { value: "DAY_BOOK", label: "Day Book Report" },
  { value: "TRIAL_BALANCE", label: "Trial Balance Report" },
  { value: "GST_SUSPENSE_LOG", label: "GST Suspense Log" },
  { value: "STOCK_INVENTORY", label: "Stock Inventory Report" },
  { value: "PERMISSION", label: "Permission Management" },
  { value: "AUDIT", label: "Audit Logs" },
  { value: "SETTING", label: "Settings" },
] as const;

// Available actions for permissions
export const AVAILABLE_ACTIONS = [
  { value: "CREATE", label: "Create" },
  { value: "READ", label: "Read" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "VIEW", label: "View" },
  { value: "WRITE", label: "Write" },
  { value: "APPROVE", label: "Approve" },
  { value: "EXPORT", label: "Export" },
  { value: "IMPORT", label: "Import" },
] as const;

// Permission check types
export type PermissionKey =
  | "ROLE:CREATE"
  | "ROLE:VIEW"
  | "ROLE:UPDATE"
  | "ROLE:DELETE"
  | "ROLE:ASSIGN_PERMISSION"
  | "PERMISSION:CREATE"
  | "PERMISSION:VIEW"
  | "PERMISSION:UPDATE"
  | "PERMISSION:DELETE"
  | "USER:VIEW"
  | "USER:CREATE"
  | "USER:UPDATE"
  | "USER:DELETE"
  | "USER:ASSIGN_ROLE";

export interface RBACStats {
  totalRoles: number;
  totalPermissions: number;
  activeRoles: number;
  defaultRoles: number;
  customRoles: number;
}