"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  DollarSign, ShoppingCart, CreditCard, Package, Users, AlertCircle,
  ArrowUpRight, ArrowDownRight, Building2, Plus, Eye, FileText, Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/layout";
import { mockDashboardStats, mockTransactions, mockActivities, mockBranches, mockInventoryItems } from "@/data/mockData";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";

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
      <Card>
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
            <div className={cn("p-2", color === "green" && "bg-green-50 text-green-600", color === "blue" && "bg-blue-50 text-blue-600", color === "purple" && "bg-purple-50 text-purple-600", color === "amber" && "bg-amber-50 text-amber-600", color === "red" && "bg-red-50 text-red-600")}>
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
  const typeColors = { sale: "bg-green-50 text-green-600", purchase: "bg-blue-50 text-blue-600", payment: "bg-purple-50 text-purple-600", return: "bg-amber-50 text-amber-600" };
  const icons = { sale: DollarSign, purchase: ShoppingCart, payment: CreditCard, return: Package };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn("p-2", typeColors[transaction.type])}>
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
      <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900"><span className="font-medium">{activity.user}</span> {activity.action} <span className="text-gray-600">{activity.target}</span></p>
        <p className="text-xs text-gray-400">{formatDateTime(activity.timestamp)}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const stats = mockDashboardStats;

  const quickActions = [
    { label: "Add User", icon: Plus, href: "/users/new" },
    { label: "Reports", icon: FileText, href: "/reports" },
    { label: "Settings", icon: Settings, href: "/settings" },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={itemVariants}>
        <PageHeader title="Dashboard" description="Welcome back, Sarah. Here&apos;s your overview." />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard title="Revenue" value={formatCurrency(stats.revenue.value)} change={stats.revenue.change} trend={stats.revenue.trend} icon={DollarSign} color="green" />
        <StatsCard title="Purchases" value={formatCurrency(stats.purchases.value)} change={stats.purchases.change} trend={stats.purchases.trend} icon={ShoppingCart} color="blue" />
        <StatsCard title="Sales" value={formatCurrency(stats.sales.value)} change={stats.sales.change} trend={stats.sales.trend} icon={CreditCard} color="purple" />
        <StatsCard title="Inventory" value={formatCurrency(stats.inventory.value)} change={Math.abs(stats.inventory.change)} trend={stats.inventory.trend} icon={Package} color="amber" />
        <StatsCard title="Outstanding" value={formatCurrency(stats.outstandingPayments.value)} change={Math.abs(stats.outstandingPayments.change)} trend={stats.outstandingPayments.trend} icon={AlertCircle} color="red" />
        <StatsCard title="Users" value={stats.activeUsers.value.toString()} change={stats.activeUsers.change} trend={stats.activeUsers.trend} icon={Users} color="blue" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="text-green-600 text-xs h-7">View All</Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                {mockTransactions.map((t) => <TransactionRow key={t.id} transaction={t} />)}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                {mockActivities.map((a) => <ActivityItem key={a.id} activity={a} />)}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Branches</CardTitle>
            <Button variant="ghost" size="sm" className="text-green-600 text-xs h-7">Manage</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockBranches.slice(0, 5).map((branch) => (
              <div key={branch.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-gray-100"><Building2 className="h-4 w-4 text-gray-600" /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{branch.name}</p>
                    <p className="text-xs text-gray-500">{branch.code}</p>
                  </div>
                </div>
                <Badge variant={branch.status === "active" ? "success" : "error"} dot>{branch.userCount} users</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Inventory Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockInventoryItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={cn("p-1.5", item.status === "healthy" && "bg-green-50", item.status === "low" && "bg-amber-50", item.status === "critical" && "bg-red-50")}>
                    <Package className={cn("h-4 w-4", item.status === "healthy" && "text-green-600", item.status === "low" && "text-amber-600", item.status === "critical" && "text-red-600")} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{item.currentStock.toLocaleString()}</p>
                  <Badge variant={item.status === "healthy" ? "success" : item.status === "low" ? "warning" : "error"} dot>{item.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, i) => (
              <Button key={i} variant="outline" className="h-16 flex flex-col gap-1">
                <action.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}