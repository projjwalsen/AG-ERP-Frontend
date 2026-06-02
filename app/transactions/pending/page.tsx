"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Calendar,
  FileText,
  Eye,
  Search,
  RefreshCcw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  mockTransactions,
  mockAgencies,
  mockBranches,
  mockInvoices,
} from "@/lib/mock-data/transactions";
import { Transaction } from "../types/transaction";
import { StatusBadge } from "../components/StatusBadge";
import { AuthenticationModal } from "../components/AuthenticationModal";
import { RejectionModal } from "../components/RejectionModal";

// ============== STAT CARD ==============
function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  iconBg,
  iconColor,
  borderColor,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borderColor?: string;
}) {
  return (
    <Card
      className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
        borderColor || ""
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1.5 truncate">
              {value}
            </p>
            {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
          </div>
          <div className={`shrink-0 p-2.5 rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PendingAuthenticationPage() {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [pendingList, setPendingList] = React.useState<Transaction[]>([]);
  const [search, setSearch] = React.useState<string>("");
  const [branchFilter, setBranchFilter] = React.useState<string>("");
  const [typeFilter, setTypeFilter] = React.useState<string>("");

  const [authOpen, setAuthOpen] = React.useState<boolean>(false);
  const [rejectOpen, setRejectOpen] = React.useState<boolean>(false);
  const [activeTxn, setActiveTxn] = React.useState<Transaction | null>(null);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [toast, setToast] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setPendingList(
        mockTransactions.filter((t) => t.status === "PENDING_AUTHENTICATION")
      );
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, []);

  const filtered = React.useMemo(() => {
    let list = [...pendingList];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.voucherNo.toLowerCase().includes(q) ||
          t.createdByName.toLowerCase().includes(q) ||
          t.remarks?.toLowerCase().includes(q) ||
          mockAgencies
            .find((a) => a.id === t.agencyId)
            ?.name.toLowerCase()
            .includes(q)
      );
    }
    if (branchFilter) list = list.filter((t) => t.branchId === branchFilter);
    if (typeFilter) list = list.filter((t) => t.type === typeFilter);
    return list;
  }, [pendingList, search, branchFilter, typeFilter]);

  const stats = React.useMemo(() => {
    const total = pendingList.length;
    const totalAmount = pendingList.reduce((s, t) => s + t.amount, 0);
    const today = "2026-05-31"; // Match MOCK_TODAY
    const todayCount = pendingList.filter((t) => t.voucherDate === today).length;
    const suspense = pendingList.filter((t) => t.isSuspense).length;
    return {
      total,
      totalAmount,
      todayCount,
      suspense,
    };
  }, [pendingList]);

  const openAuthenticate = (txn: Transaction) => {
    setActiveTxn(txn);
    setAuthOpen(true);
  };

  const openReject = (txn: Transaction) => {
    setActiveTxn(txn);
    setRejectOpen(true);
  };

  const handleAuthenticate = () => {
    setActionLoading(true);
    setTimeout(() => {
      setActionLoading(false);
      setAuthOpen(false);
      setPendingList((prev) => prev.filter((t) => t.id !== activeTxn?.id));
      setActiveTxn(null);
      setToast({
        type: "success",
        message: `Voucher ${activeTxn?.voucherNo} authenticated successfully.`,
      });
    }, 600);
  };

  const handleReject = (reason: string) => {
    setActionLoading(true);
    setTimeout(() => {
      setActionLoading(false);
      setRejectOpen(false);
      setPendingList((prev) => prev.filter((t) => t.id !== activeTxn?.id));
      setActiveTxn(null);
      setToast({
        type: "success",
        message: `Voucher rejected with reason: ${reason.slice(0, 40)}${
          reason.length > 40 ? "..." : ""
        }`,
      });
    }, 600);
  };

  // Auto-dismiss toast
  React.useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const activeAgency = activeTxn
    ? mockAgencies.find((a) => a.id === activeTxn.agencyId)
    : null;
  const activeBranch = activeTxn
    ? mockBranches.find((b) => b.id === activeTxn.branchId)
    : null;
  const activeInvoice = activeTxn
    ? mockInvoices.find((i) => i.id === activeTxn.invoiceId)
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/transactions">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Transactions
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Pending Authentication Queue"
        description="Review and authenticate vouchers awaiting manager approval"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Transactions", href: "/transactions" },
          { label: "Pending" },
        ]}
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pending"
          value={stats.total}
          hint="Vouchers in queue"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Total Amount"
          value={formatCurrency(stats.totalAmount)}
          hint="Awaiting authentication"
          icon={IndianRupee}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Today Pending"
          value={stats.todayCount}
          hint="Submitted today"
          icon={Calendar}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Suspense Transactions"
          value={stats.suspense}
          hint="Routed to GST Suspense"
          icon={AlertTriangle}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by voucher, agency, or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Branches</option>
              {mockBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="INWARD">Inward</option>
              <option value="OUTWARD">Outward</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">All caught up!</p>
              <p className="text-xs text-gray-500 mt-1">
                No vouchers pending authentication.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Voucher No
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Agency
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Entered By
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Branch
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((txn) => {
                    const agency = mockAgencies.find(
                      (a) => a.id === txn.agencyId
                    );
                    const branch = mockBranches.find(
                      (b) => b.id === txn.branchId
                    );
                    return (
                      <tr
                        key={txn.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/transactions/${txn.id}`}
                            className="font-mono text-sm font-medium text-blue-600 hover:underline"
                          >
                            {txn.voucherNo}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDate(txn.voucherDate)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {txn.isSuspense ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              Suspense
                            </span>
                          ) : (
                            agency?.name || "-"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              txn.type === "INWARD"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {txn.type === "INWARD" ? "Inward" : "Outward"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(txn.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {txn.createdByName}
                          <p className="text-[11px] text-gray-400">
                            {formatDateTime(txn.createdAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {branch?.code || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={txn.status} size="sm" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/transactions/${txn.id}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openAuthenticate(txn)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Authenticate"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openReject(txn)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info footer */}
      <Card className="border-0 shadow-sm bg-amber-50/40">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 shrink-0">
              <FileText className="h-4 w-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">
                Manager Review Required
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Carefully verify the UTR, voucher amount, and invoice
                reference before authenticating. Rejected vouchers are routed
                back to the originator with a clear reason for audit
                compliance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authenticate Modal */}
      <AuthenticationModal
        open={authOpen}
        onOpenChange={(o) => {
          setAuthOpen(o);
          if (!o) setActiveTxn(null);
        }}
        transaction={activeTxn}
        agency={activeAgency || null}
        invoice={activeInvoice || null}
        branch={activeBranch || null}
        onConfirm={handleAuthenticate}
        loading={actionLoading}
      />

      {/* Reject Modal */}
      <RejectionModal
        open={rejectOpen}
        onOpenChange={(o) => {
          setRejectOpen(o);
          if (!o) setActiveTxn(null);
        }}
        transaction={activeTxn}
        onConfirm={handleReject}
        loading={actionLoading}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
