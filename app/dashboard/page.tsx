"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  IndianRupee, ShoppingCart, CreditCard, Package, Users, AlertCircle,
  ArrowUpRight, ArrowDownRight, Plus, FileText, Settings, TrendingUp, Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/layout";
import { mockDashboardStats, mockTransactions, mockActivities } from "@/data/mockData";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { branchApi } from "@/app/services/branch.service";
import { Branch } from "@/app/types/branch";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function StatsCard({ title, value, change, trend, icon: Icon, color }: {
  title: string; value: string; change: number; trend: "up" | "down"; icon: React.ElementType; color: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
              <div className="flex items-center gap-1 mt-1.5">
                {trend === "up" ? <ArrowUpRight className="h-3 w-3 text-green-600" /> : <ArrowDownRight className="h-3 w-3 text-red-500" />}
                <span className={cn("text-xs font-medium", trend === "up" ? "text-green-600" : "text-red-500")}>{change}%</span>
                <span className="text-xs text-gray-400">vs last month</span>
              </div>
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

function TransactionRow({ transaction }: { transaction: (typeof mockTransactions)[0] }) {
  const statusColors = { completed: "success", pending: "warning", failed: "error" } as const;
  const typeColors = { sale: "bg-emerald-50 text-emerald-600", purchase: "bg-blue-50 text-blue-600", payment: "bg-purple-50 text-purple-600", return: "bg-amber-50 text-amber-600" };
  const icons = { sale: IndianRupee, purchase: ShoppingCart, payment: CreditCard, return: Package };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", typeColors[transaction.type])}>
          {React.createElement(icons[transaction.type], { className: "h-4 w-4" })}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{transaction.reference}</p>
          <p className="text-xs text-gray-500">{transaction.customer}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">{formatCurrency(transaction.amount)}</p>
        <Badge variant={statusColors[transaction.status]} dot className="mt-0.5">{transaction.status}</Badge>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: (typeof mockActivities)[0] }) {
  const initials = activity.user.split(" ").map((n: string) => n[0]).join("");
  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-center h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full">
        <span className="text-xs font-medium text-white">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900"><span className="font-medium">{activity.user}</span> {activity.action} <span className="text-gray-600">{activity.target}</span></p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(activity.timestamp)}</p>
      </div>
    </div>
  );
}

// Demo data for monthly revenue (used for All and as fallback for branches)
const allBranchesRevenueData = [
  { month: "Apr", revenue: 38 },
  { month: "May", revenue: 45 },
  { month: "Jun", revenue: 48 },
  { month: "Jul", revenue: 46 },
  { month: "Aug", revenue: 44 },
  { month: "Sep", revenue: 52 },
  { month: "Oct", revenue: 58 },
  { month: "Nov", revenue: 64 },
  { month: "Dec", revenue: 69 },
  { month: "Jan", revenue: 54 },
  { month: "Feb", revenue: 52 },
  { month: "Mar", revenue: 0 },
];

// Branch-wise Monthly Revenue Data (using same demo data for all branches)
const branchRevenueData: Record<string, { month: string; revenue: number }[]> = {
  all: allBranchesRevenueData,
};

// Stock Distribution Data
const stockDistributionData = [
  { name: "Healthy Stock", value: 65, color: "#10B981" },
  { name: "Low Stock", value: 25, color: "#F59E0B" },
  { name: "Critical", value: 10, color: "#EF4444" },
];

// Custom tooltip for KPI chart
function KPILegend() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-2.5 rounded-sm bg-gradient-to-r from-blue-500 to-blue-600" />
        <span className="text-xs text-gray-600">Revenue</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-2.5 rounded-sm bg-gray-200" />
        <span className="text-xs text-gray-600">Target</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const stats = mockDashboardStats;
  const [selectedBranch, setSelectedBranch] = React.useState("all");
  const [branches, setBranches] = React.useState<Branch[]>([]);

  const quickActions = [
    { label: "Add User", icon: Plus, href: "/users/new" },
    { label: "Reports", icon: FileText, href: "/reports" },
    { label: "Settings", icon: Settings, href: "/settings" },
  ];

  // Fetch branches for dropdown
  React.useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await branchApi.getActive();
      const branchesData = Array.isArray(response.data)
        ? response.data
        : response.data?.branches ?? [];
      setBranches(branchesData);
    } catch (err) {
      console.error("Failed to fetch branches");
    }
  };

  const currentData = branchRevenueData[selectedBranch] || allBranchesRevenueData;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5 p-6">
      <motion.div variants={itemVariants}>
        <PageHeader title="Dashboard" description="Welcome back. Here&apos;s your overview." />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard title="Revenue" value={formatCurrency(stats.revenue.value)} change={stats.revenue.change} trend={stats.revenue.trend} icon={IndianRupee} color="green" />
        <StatsCard title="Purchases" value={formatCurrency(stats.purchases.value)} change={stats.purchases.change} trend={stats.purchases.trend} icon={ShoppingCart} color="blue" />
        <StatsCard title="Sales" value={formatCurrency(stats.sales.value)} change={stats.sales.change} trend={stats.sales.trend} icon={CreditCard} color="purple" />
        <StatsCard title="Inventory" value={formatCurrency(stats.inventory.value)} change={Math.abs(stats.inventory.change)} trend={stats.inventory.trend} icon={Package} color="amber" />
        <StatsCard title="Outstanding" value={formatCurrency(stats.outstandingPayments.value)} change={Math.abs(stats.outstandingPayments.change)} trend={stats.outstandingPayments.trend} icon={AlertCircle} color="red" />
        <StatsCard title="Users" value={stats.activeUsers.value.toString()} change={stats.activeUsers.change} trend={stats.activeUsers.trend} icon={Users} color="blue" />
      </div>

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
                  <CardTitle className="text-sm font-semibold text-gray-900">Branch Wise Earning Graph </CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Revenue by Branch (In Lakhs)</p>
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barCategoryGap="35%">
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}L`} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const revenue = payload[0]?.value || 0;
                        return (
                          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3">
                            <p className="text-sm font-semibold text-white mb-1">{label}</p>
                            <p className="text-sm font-medium text-emerald-400">₹{revenue}L</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
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
                          const data = payload[0].payload;
                          return (
                            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl px-3 py-2">
                              <p className="text-xs text-gray-400">{data.name}</p>
                              <p className="text-sm font-semibold text-white">{data.value}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Legend below chart */}
            <div className="flex justify-center gap-6 mt-4">
              {stockDistributionData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.name}</span>
                  <span className="text-xs font-semibold text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-gray-900">Recent Transactions</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="text-emerald-600 text-xs h-7 hover:text-emerald-700 hover:bg-emerald-50">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {mockTransactions.map((t) => <TransactionRow key={t.id} transaction={t} />)}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Users className="h-4 w-4 text-amber-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-gray-900">Recent Activity</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {mockActivities.map((a) => <ActivityItem key={a.id} activity={a} />)}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
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
      </Card>
    </motion.div>
  );
}