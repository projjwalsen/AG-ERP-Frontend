"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  IndianRupee, ShoppingCart, CreditCard, Package, Users, AlertCircle,
  ArrowUpRight, ArrowDownRight, Plus, FileText, Settings, TrendingUp, Building2,
  ArrowDownLeft, ArrowUpRight as ArrowUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/layout";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { branchApi } from "@/app/services/branch.service";
import { Branch } from "@/app/types/branch";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchDashboardKPI } from "@/app/store/dashboardSlice";
import {
  BranchMonthlyRevenue,
  RecentKpiTransaction,
} from "@/app/types/dashboard";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function StatsCard({ title, value, icon: Icon, color }: {
  title: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={cn("p-2.5 rounded-xl", color === "green" && "bg-emerald-50 text-emerald-600", color === "blue" && "bg-blue-50 text-blue-600", color === "purple" && "bg-purple-50 text-purple-600", color === "amber" && "bg-amber-50 text-amber-600", color === "red" && "bg-red-50 text-red-600")}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TransactionRow({ transaction }: { transaction: RecentKpiTransaction }) {
  const isInward = transaction.direction === "INWARD";
  const icon = isInward ? ArrowDownLeft : ArrowUp;
  const color = isInward ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600";

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("p-2 rounded-lg shrink-0", color)}>
          {React.createElement(icon, { className: "h-4 w-4" })}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{transaction.agency || "—"}</p>
          <p className="text-xs text-gray-500 truncate">
            {transaction.branch} · {transaction.transactionNo}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <p className="text-sm font-semibold text-gray-900">{formatCurrency(transaction.amount)}</p>
        <div className="flex items-center justify-end gap-1.5 mt-0.5">
          <Badge variant={isInward ? "success" : "info"} className="text-[10px]">
            {transaction.direction}
          </Badge>
          {transaction.paymentMode && (
            <span className="text-[10px] text-gray-500">{transaction.paymentMode}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Format month label for tooltip: "Jun 2026"
function formatMonthLabel(month: string, year: number) {
  return `${month} ${year}`;
}

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { kpi, isLoading, error } = useAppSelector((state) => state.dashboard);
  const [selectedBranch, setSelectedBranch] = React.useState("all");
  const [branches, setBranches] = React.useState<Branch[]>([]);

  const quickActions = [
    { label: "Add User", icon: Plus, href: "/users/new" },
    { label: "Reports", icon: FileText, href: "/reports" },
    { label: "Settings", icon: Settings, href: "/settings" },
  ];

  // Fetch branches for dropdown (used by chart filter)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await branchApi.getActive();
        const branchesData = Array.isArray(response.data)
          ? response.data
          : response.data?.branches ?? [];
        if (!cancelled) setBranches(branchesData);
      } catch (err) {
        console.error("Failed to fetch branches");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch dashboard KPIs. Re-fetch when the user picks a different branch.
  React.useEffect(() => {
    dispatch(
      fetchDashboardKPI(
        selectedBranch === "all" ? undefined : { branchId: selectedBranch }
      )
    );
  }, [dispatch, selectedBranch]);

  // Bar chart data — either the selected branch's monthlyRevenue, or the
  // aggregated sum across all branches (grouped by month) for "All".
  const chartData: { month: string; revenue: number }[] = React.useMemo(() => {
    if (!kpi) return [];
    if (selectedBranch === "all") {
      // Aggregate by month label across branches.
      const totals = new Map<string, number>();
      kpi.branchMonthlyRevenue.forEach((b) => {
        b.monthlyRevenue.forEach((p) => {
          const key = formatMonthLabel(p.month, p.year);
          totals.set(key, (totals.get(key) || 0) + p.revenue);
        });
      });
      return Array.from(totals.entries()).map(([month, revenue]) => ({
        month,
        revenue,
      }));
    }
    const branch: BranchMonthlyRevenue | undefined =
      kpi.branchMonthlyRevenue.find((b) => b.branchId === selectedBranch);
    if (!branch) return [];
    return branch.monthlyRevenue.map((p) => ({
      month: formatMonthLabel(p.month, p.year),
      revenue: p.revenue,
    }));
  }, [kpi, selectedBranch]);

  // Stock distribution donut data — counts from API.
  const stockDistributionData = React.useMemo(() => {
    if (!kpi) return [];
    const { healthy, low, critical } = kpi.stockDistribution;
    const total = healthy + low + critical;
    if (total <= 0) {
      return [
        { name: "Healthy Stock", value: 0, color: "#10B981", count: healthy },
        { name: "Low Stock", value: 0, color: "#F59E0B", count: low },
        { name: "Critical", value: 0, color: "#EF4444", count: critical },
      ];
    }
    return [
      { name: "Healthy Stock", value: Math.round((healthy / total) * 100), color: "#10B981", count: healthy },
      { name: "Low Stock", value: Math.round((low / total) * 100), color: "#F59E0B", count: low },
      { name: "Critical", value: Math.round((critical / total) * 100), color: "#EF4444", count: critical },
    ];
  }, [kpi]);

  const summary = kpi?.summary;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5 p-6">
      <motion.div variants={itemVariants}>
        <PageHeader title="Dashboard" description="Welcome back. Here&apos;s your overview." />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Revenue"
          value={summary ? formatCurrency(summary.revenue) : "—"}
          icon={IndianRupee}
          color="green"
        />
        <StatsCard
          title="Purchases"
          value={summary ? formatCurrency(summary.purchases) : "—"}
          icon={ShoppingCart}
          color="blue"
        />
        <StatsCard
          title="Sales"
          value={summary ? formatCurrency(summary.sales) : "—"}
          icon={CreditCard}
          color="purple"
        />
        <StatsCard
          title="Inventory"
          value={summary ? formatCurrency(summary.inventoryValues) : "—"}
          icon={Package}
          color="amber"
        />
        <StatsCard
          title="Outstanding"
          value={summary ? formatCurrency(summary.outstanding) : "—"}
          icon={AlertCircle}
          color="red"
        />
        <StatsCard
          title="Users"
          value={summary ? summary.users.toString() : "—"}
          icon={Users}
          color="blue"
        />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Charts Section - Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Revenue Bar Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-900">Branch Wise Earning Graph</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Revenue by Branch</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64">
              {isLoading && chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  Loading revenue…
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No revenue data for the selected period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="35%">
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => {
                        // Show in lakhs (L) when the max is large enough, else raw.
                        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
                        return `₹${value}`;
                      }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const revenue = payload[0]?.value || 0;
                          return (
                            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3">
                              <p className="text-sm font-semibold text-white mb-1">{label}</p>
                              <p className="text-sm font-medium text-emerald-400">{formatCurrency(Number(revenue))}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Distribution Donut Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Package className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-900">Stock Distribution</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Inventory status overview</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <div className="w-48 h-48 mx-auto">
                {isLoading && stockDistributionData.every((d) => d.value === 0) ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    Loading…
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stockDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as { name: string; value: number; count: number };
                            return (
                              <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl px-3 py-2">
                                <p className="text-xs text-gray-400">{data.name}</p>
                                <p className="text-sm font-semibold text-white">{data.value}%</p>
                                <p className="text-[11px] text-gray-300">{data.count} item(s)</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            {/* Legend below chart */}
            <div className="flex justify-center gap-6 mt-4">
              {stockDistributionData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.name}</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {item.count} ({item.value}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                </div>
                <CardTitle className="text-sm font-semibold text-gray-900">Recent Transactions</CardTitle>
              </div>
              <Link href="/transactions">
                <Button variant="ghost" size="sm" className="text-emerald-600 text-xs h-7 hover:text-emerald-700 hover:bg-emerald-50">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
              {isLoading && (!kpi || kpi.recentTransactions.length === 0) ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400 py-8">
                  Loading transactions…
                </div>
              ) : !kpi || kpi.recentTransactions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400 py-8">
                  No recent transactions
                </div>
              ) : (
                kpi.recentTransactions.map((t, idx) => (
                  <TransactionRow key={`${t.transactionNo}-${idx}`} transaction={t} />
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      {/* <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Settings className="h-4 w-4 text-gray-600" />
            </div>
            <CardTitle className="text-sm font-semibold text-gray-900">Quick Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, i) => (
              <Button key={i} variant="outline" className="h-14 flex flex-col gap-1.5 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                <action.icon className="h-5 w-5 text-gray-600" />
                <span className="text-xs font-medium text-gray-700">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card> */}
    </motion.div>
  );
}
