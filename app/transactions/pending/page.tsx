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
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { branchApi } from "@/app/services/branch.service";
import {
  approveTransaction,
  fetchAllTransactions,
  rejectTransaction,
} from "@/app/store/transactionsSlice";
import {
  Branch,
  Transaction,
  TransactionDirection,
} from "@/app/types/transaction";
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
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
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
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const transactions = useAppSelector((s) => s.transactions.transactions);
  const pagination = useAppSelector((s) => s.transactions.pagination);
  const isLoading = useAppSelector((s) => s.transactions.isLoading);
  const isSubmitting = useAppSelector((s) => s.transactions.isSubmitting);
  const error = useAppSelector((s) => s.transactions.error);
  const permissions = useAppSelector((s) => s.auth.permissions);

  const canView = hasModulePermission(permissions, "TRANSACTION", "VIEW");
  const canApprove = hasModulePermission(
    permissions,
    "TRANSACTION",
    "APPROVE"
  );

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [search, setSearch] = React.useState<string>("");
  const [branchFilter, setBranchFilter] = React.useState<string>("");
  const [directionFilter, setDirectionFilter] = React.useState<string>("");

  const [authOpen, setAuthOpen] = React.useState<boolean>(false);
  const [rejectOpen, setRejectOpen] = React.useState<boolean>(false);
  const [activeTxn, setActiveTxn] = React.useState<Transaction | null>(null);

  // Load branches for the filter dropdown.
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const b = await branchApi.getActive();
        if (cancelled) return;
        if (b.success && b.data) setBranches(b.data.branches || []);
      } catch {
        // Filter is non-critical.
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetchQueue = React.useCallback(() => {
    const params: Parameters<typeof fetchAllTransactions>[0] = {
      status: "PENDING",
      page: 1,
      limit: 100,
    };
    if (search.trim()) params.search = search.trim();
    if (branchFilter) params.branchId = branchFilter;
    if (directionFilter)
      params.direction = directionFilter as TransactionDirection;
    dispatch(fetchAllTransactions(params));
  }, [dispatch, search, branchFilter, directionFilter]);

  React.useEffect(() => {
    refetchQueue();
  }, [refetchQueue]);

  // Surface the slice error.
  React.useEffect(() => {
    if (error) addToast(error, "error");
  }, [error, addToast]);

  // Stat cards derive from the in-memory list (current page only).
  const stats = React.useMemo(() => {
    const total = transactions.length;
    const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const todayCount = transactions.filter((t) =>
      t.createdAt.startsWith(todayPrefix)
    ).length;
    const suspenseCount = transactions.filter((t) => t.suspenseAccount).length;
    return { total, totalAmount, todayCount, suspenseCount };
  }, [transactions]);

  const openAuthenticate = (txn: Transaction) => {
    setActiveTxn(txn);
    setAuthOpen(true);
  };

  const openReject = (txn: Transaction) => {
    setActiveTxn(txn);
    setRejectOpen(true);
  };

  const handleAuthenticate = async () => {
    if (!activeTxn) return;
    try {
      const result = await dispatch(approveTransaction(activeTxn.id)).unwrap();
      addToast(
        `Voucher ${result.data?.transactionNo ?? activeTxn.transactionNo} authenticated successfully`,
        "success"
      );
      setAuthOpen(false);
      setActiveTxn(null);
      refetchQueue();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to authenticate transaction";
      addToast(message, "error");
    }
  };

  const handleReject = async (reason: string) => {
    if (!activeTxn) return;
    try {
      const result = await dispatch(
        rejectTransaction({ transactionId: activeTxn.id, remarks: reason })
      ).unwrap();
      addToast(
        `Voucher ${result.data?.transactionNo ?? activeTxn.transactionNo} rejected`,
        "success"
      );
      setRejectOpen(false);
      setActiveTxn(null);
      refetchQueue();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to reject transaction";
      addToast(message, "error");
    }
  };

  if (!canView) {
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
        />
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              You do not have permission to view the pending queue
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ask your administrator to grant the{" "}
              <code className="font-mono text-[11px]">TRANSACTION:VIEW</code>{" "}
              permission.
            </p>
          </CardContent>
        </Card>
        <ToastContainer />
      </div>
    );
  }

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
            onClick={refetchQueue}
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
          value={pagination?.total ?? stats.total}
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
          hint="On this page"
          icon={Calendar}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Suspense Transactions"
          value={stats.suspenseCount}
          hint="Routed to suspense"
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
                placeholder="Search by transaction no, ref no, or user…"
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
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
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
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
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
                  {transactions.map((txn) => {
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
                            {txn.transactionNo}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDate(txn.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {txn.suspenseAccount ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              Suspense
                            </span>
                          ) : (
                            txn.agency?.name || "-"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              txn.direction === "INWARD"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {txn.direction === "INWARD" ? "Inward" : "Outward"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(txn.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {txn.createdBy?.name || "-"}
                          <p className="text-[11px] text-gray-400">
                            {formatDateTime(txn.createdAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {txn.branch?.code || "-"}
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
                            {canApprove && (
                              <>
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
                              </>
                            )}
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
              <p className="text-xs text-amber-800/80 mt-1">
                Carefully verify the transaction reference, voucher amount, and
                agency before authenticating. Rejected vouchers are routed back
                to the originator with a clear reason for audit compliance.
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
        onConfirm={handleAuthenticate}
        loading={isSubmitting}
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
        loading={isSubmitting}
      />

      <ToastContainer />
    </div>
  );
}
