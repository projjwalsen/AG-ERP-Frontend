export type UserStatus = "active" | "inactive" | "pending" | "suspended";

export type UserRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "accountant"
  | "inventory_manager"
  | "sales_rep"
  | "viewer";

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatar?: string;
  status: UserStatus;
  roles: UserRole[];
  branchId: string;
  branchName: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  phone?: string;
  department?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  location: string;
  manager: string;
  status: "active" | "inactive";
  userCount: number;
  createdAt: Date;
}

export interface Role {
  id: string;
  name: UserRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  userCount: number;
}

export interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface DashboardStats {
  revenue: {
    value: number;
    change: number;
    trend: "up" | "down";
  };
  purchases: {
    value: number;
    change: number;
    trend: "up" | "down";
  };
  sales: {
    value: number;
    change: number;
    trend: "up" | "down";
  };
  inventory: {
    value: number;
    change: number;
    trend: "up" | "down";
  };
  outstandingPayments: {
    value: number;
    change: number;
    trend: "up" | "down";
  };
  activeUsers: {
    value: number;
    change: number;
    trend: "up" | "down";
  };
}

export interface Transaction {
  id: string;
  type: "purchase" | "sale" | "payment" | "return";
  reference: string;
  amount: number;
  customer: string;
  date: Date;
  status: "completed" | "pending" | "failed";
  branch: string;
}

export interface Activity {
  id: string;
  user: string;
  userAvatar?: string;
  action: string;
  target: string;
  timestamp: Date;
  type: "create" | "update" | "delete" | "login" | "logout" | "export" | "import";
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  isRead: boolean;
  timestamp: Date;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export interface Payment {
  id: string;
  invoiceNumber: string;
  customer: string;
  amount: number;
  dueDate: Date;
  status: "paid" | "pending" | "overdue";
  method: "bank_transfer" | "cash" | "check" | "card";
}

export interface SalesReport {
  month: string;
  revenue: number;
  target: number;
  achieved: number;
}

export interface InventoryItem {
  id: string;
  productName: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  status: "healthy" | "low" | "critical";
  lastRestocked: Date;
}