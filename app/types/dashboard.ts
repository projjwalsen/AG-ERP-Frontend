// Dashboard Types — matches backend contract
// (AG-ERP-Backend/src/modules/dashboard/kpi.service.ts)
//
// GET /api/dashboard/kpi
// Response envelope: { success, message, data: DashboardKPI }.

export interface DashboardSummary {
  revenue: number;
  purchases: number;
  sales: number;
  inventoryValues: number;
  outstanding: number;
  users: number;
}

export interface BranchMonthlyRevenuePoint {
  month: string;
  year: number;
  revenue: number;
}

export interface BranchMonthlyRevenue {
  branchId: string;
  branchName: string;
  monthlyRevenue: BranchMonthlyRevenuePoint[];
}

export interface StockDistribution {
  healthy: number;
  low: number;
  critical: number;
}

export interface RecentKpiTransaction {
  transactionNo: string;
  agency?: string;
  branch: string;
  amount: number;
  direction: "INWARD" | "OUTWARD";
  paymentMode: string | null;
  createdAt: string;
}

export interface DashboardKPI {
  summary: DashboardSummary;
  branchMonthlyRevenue: BranchMonthlyRevenue[];
  stockDistribution: StockDistribution;
  recentTransactions: RecentKpiTransaction[];
}

export interface DashboardKPIResponse {
  data: DashboardKPI;
}

export interface DashboardKPIParams {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}
