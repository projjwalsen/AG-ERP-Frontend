"use client";
import * as React from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Plus,
  Receipt,
  Search,
  RefreshCcw,
  Download,
  Calendar,
  FileText,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";
import { downloadFile } from "@/lib/download";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { agencyApi } from "@/app/services/agency.service";
import { branchApi } from "@/app/services/branch.service";
import { ImportButton } from "@/app/components/import/ImportButton";
import {
  fetchAllTransactions,
  fetchPendingTotal,
} from "@/app/store/transactionsSlice";
import {
  Agency,
  Branch,
  PaymentMode,
  Transaction,
  TransactionDirection,
  TransactionStatus,
} from "@/app/types/transaction";
import { TransactionTable } from "./components/TransactionTable";

// ============== STAT CARD ==============
function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  iconBg,
  iconColor,
  link,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  link?: { label: string; href: string };
}) {
  const Wrapper: any = link ? Link : (props: any) => <div {...props} />;
  return (
    <Wrapper
      {...(link ? { href: link.href } : {})}
      className="block transition-transform hover:-translate-y-0.5"
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow h-full">
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
              {link && (
                <p className="text-xs font-medium text-blue-600 mt-2 hover:underline">
                  {link.label} →
                </p>
              )}
            </div>
            <div
              className={`shrink-0 p-2.5 rounded-xl ${iconBg}`}
            >
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Wrapper>
  );
}

// ============== FILTER SELECT ==============
function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 px-3 text-sm border border-gray-200 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className || ""}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ============== TOP-LEVEL PAGE WRAPPER ==============
export default function TransactionsListPage() {
  // `useSearchParams` requires a Suspense boundary during static rendering.
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <TransactionsListContent />
    </React.Suspense>
  );
}

// ============== CONTENT (uses URL search params) ==============
function TransactionsListContent() {
  // Allow other pages (e.g. new-transaction) to land back on a specific
  // tab via ?tab=outward. Defaults to "inward" otherwise.
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams?.get("tab");
  const defaultTab = tabFromUrl === "outward" ? "outward" : "inward";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (value === "inward") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const query = params.toString();
    router.replace(query ? `/transactions?${query}` : "/transactions", {
      scroll: false,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 space-y-5">
      <PageHeader
        title="Transaction Management"
        description="Manage inward, outward, suspense, and authentication workflows"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Transactions" },
        ]}
      />

      <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-gray-100">
          <TabsTrigger value="inward" className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            Inward
          </TabsTrigger>
          <TabsTrigger value="outward" className="flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4" />
            Outward
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inward">
          <DirectionTab direction="INWARD" />
        </TabsContent>
        <TabsContent value="outward">
          <DirectionTab direction="OUTWARD" />
        </TabsContent>
      </Tabs>

      <ToastContainer />
    </div>
  );
}

// ============== PER-DIRECTION TAB ==============
/**
 * One self-contained list view per direction. The page header / tabs at the
 * top are shared; everything below is duplicated per tab so each tab shows
 * the full Inward or Outward workflow at a glance — mirroring how
 * `purchase-sales/page.tsx` renders Purchase and Sales as siblings.
 */
function DirectionTab({ direction }: { direction: TransactionDirection }) {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const transactions = useAppSelector((s) => s.transactions.transactions);
  const pagination = useAppSelector((s) => s.transactions.pagination);
  const isLoading = useAppSelector((s) => s.transactions.isLoading);
  const error = useAppSelector((s) => s.transactions.error);
  const pendingTotal = useAppSelector((s) => s.transactions.pendingTotal);
  const permissions = useAppSelector((s) => s.auth.permissions);

  const canView = hasModulePermission(permissions, "TRANSACTION", "VIEW");
  const canWrite = hasModulePermission(permissions, "TRANSACTION", "WRITE");
  const canApprove = hasModulePermission(permissions, "TRANSACTION", "APPROVE");

  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);

  const [search, setSearch] = React.useState<string>("");
  const [branchFilter, setBranchFilter] = React.useState<string>("");
  const [paymentModeFilter, setPaymentModeFilter] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [exporting, setExporting] = React.useState(false);
  const pageSize = 10;

  // Load agencies + branches for filter dropdowns on mount.
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [a, b] = await Promise.all([
          agencyApi.getAll({ limit: 200 }),
          branchApi.getActive(),
        ]);
        if (cancelled) return;
        if (a.success && a.data) setAgencies(a.data.agencies || []);
        if (b.success && b.data) setBranches(b.data.branches || []);
      } catch {
        // Filters are non-critical; we can still show the page.
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Push the direction + backend-supported filters to the API. The
  // direction is always pinned so each tab only sees its own rows.
  const fetchTransactions = React.useCallback(() => {
    const params: Parameters<typeof fetchAllTransactions>[0] = {
      page: currentPage,
      limit: pageSize,
      direction,
    };
    if (search.trim()) params.search = search.trim();
    if (branchFilter) params.branchId = branchFilter;
    if (statusFilter) params.status = statusFilter as TransactionStatus;
    dispatch(fetchAllTransactions(params));
  }, [dispatch, currentPage, search, branchFilter, statusFilter, direction]);

  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // The pending-total counter is global, not per direction — fetch it
  // once per tab mount so the badge in the action row stays current.
  React.useEffect(() => {
    if (!canView) return;
    dispatch(fetchPendingTotal());
  }, [dispatch, canView]);

  React.useEffect(() => {
    if (error) addToast(error, "error");
  }, [error, addToast]);

  // Client-side filters the backend doesn't expose.
  const filtered = React.useMemo(() => {
    let list = [...transactions];
    // Hard-filter by direction as a defence-in-depth measure in case the
    // backend returns stale rows from before the direction param was sent.
    list = list.filter((t) => t.direction === direction);
    if (paymentModeFilter)
      list = list.filter(
        (t) => t.paymentMode === (paymentModeFilter as PaymentMode)
      );
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((t) => new Date(t.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      list = list.filter((t) => new Date(t.createdAt).getTime() <= to);
    }
    return list;
  }, [transactions, paymentModeFilter, dateFrom, dateTo, direction]);

  const totalPages = pagination?.totalPages ?? 1;
  const total = pagination?.total ?? 0;

  const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);
  const pendingAmount = transactions
    .filter((t) => t.status === "PENDING")
    .reduce((s, t) => s + t.amount, 0);
  const suspenseAmount = transactions
    .filter((t) => t.suspenseAccount)
    .reduce((s, t) => s + t.amount, 0);
  const suspenseCount = transactions.filter((t) => t.suspenseAccount).length;
  const directionCount = transactions.filter((t) => t.direction === direction)
    .length;

  const isInward = direction === "INWARD";
  const DirectionIcon = isInward ? ArrowDownToLine : ArrowUpFromLine;
  const directionLabel = isInward ? "Inward" : "Outward";
  const directionColor = isInward
    ? { iconBg: "bg-emerald-50", iconColor: "text-emerald-600" }
    : { iconBg: "bg-violet-50", iconColor: "text-violet-600" };
  const newButtonLabel = isInward
    ? "New Inward Transaction"
    : "New Outward Transaction";

  const handleView = (txn: Transaction) => {
    if (typeof window !== "undefined") {
      window.location.href = `/transactions/${txn.id}`;
    }
  };
  const handleEdit = (txn: Transaction) => {
    if (typeof window !== "undefined") {
      window.location.href = `/transactions/${txn.id}/edit`;
    }
  };
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Stream the filtered transactions list as an .xlsx file. Mirrors the
  // filters applied to fetchTransactions — minus pagination, so the export
  // contains the full matching dataset.
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadFile(
        `api/transactions/all?${new URLSearchParams({
          export: "true",
          direction,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(branchFilter ? { branchId: branchFilter } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        }).toString()}`,
        `transactions_${direction.toLowerCase()}.xlsx`
      );
      addToast(`${directionLabel} transactions exported successfully`, "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export transactions", "error");
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setBranchFilter("");
    setPaymentModeFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters =
    !!search ||
    !!branchFilter ||
    !!paymentModeFilter ||
    !!statusFilter ||
    !!dateFrom ||
    !!dateTo;

  if (!canView) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
            <Lock className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">
            You do not have permission to view transactions
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Ask your administrator to grant the{" "}
            <code className="font-mono text-[11px]">TRANSACTION:VIEW</code>{" "}
            permission.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Per-tab action row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DirectionIcon className="h-5 w-5" />
            {directionLabel} Transactions
          </h2>
          <p className="text-sm text-gray-500">
            {isInward
              ? "Receipts from clients — money coming in"
              : "Payments to vendors — money going out"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={fetchTransactions}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          {canApprove && (
            <Link href="/transactions/pending">
              <Button variant="outline" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending Queue
                {(pendingTotal ?? 0) > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center px-1.5 h-5 min-w-5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">
                    {pendingTotal}
                  </span>
                )}
              </Button>
            </Link>
          )}
          {canWrite && (
            <>
              <ImportButton
                registerType="PURCHASE"
                label="Import"
                variant="outline"
                onCompleted={() => fetchTransactions()}
              />
              <Link href={`/transactions/new?direction=${direction}`}>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {newButtonLabel}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={`${directionLabel} Total`}
          value={total}
          hint={`${formatCurrency(totalAmount)} on this page`}
          icon={Receipt}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Pending Authentication"
          value={pendingTotal ?? 0}
          hint={`${formatCurrency(pendingAmount)} on this page`}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          link={
            canApprove
              ? { label: "Review queue", href: "/transactions/pending" }
              : undefined
          }
        />
        <StatCard
          title={`${directionLabel} Count`}
          value={directionCount}
          hint="On this page"
          icon={DirectionIcon}
          iconBg={directionColor.iconBg}
          iconColor={directionColor.iconColor}
        />
        <StatCard
          title="Suspense Entries"
          value={suspenseCount}
          hint={`${formatCurrency(suspenseAmount)} on this page`}
          icon={AlertCircle}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Filters Bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search ${directionLabel.toLowerCase()} transactions…`}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <FilterSelect
              value={branchFilter}
              onChange={(v) => {
                setBranchFilter(v);
                setCurrentPage(1);
              }}
              placeholder="All Branches"
              options={branches.map((b) => ({ label: b.name, value: b.id }))}
              className="w-44"
            />
            <FilterSelect
              value={paymentModeFilter}
              onChange={(v) => setPaymentModeFilter(v)}
              placeholder="All Payment Modes"
              options={[
                { label: "Online", value: "ONLINE" },
                { label: "Offline", value: "OFFLINE" },
              ]}
              className="w-44"
            />
            <FilterSelect
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
              placeholder="All Status"
              options={[
                { label: "Pending Authentication", value: "PENDING" },
                { label: "Authenticated", value: "APPROVED" },
                { label: "Rejected", value: "REJECTED" },
              ]}
              className="w-52"
            />
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36 h-9"
              />
              <span className="text-xs text-gray-400">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36 h-9"
              />
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500"
              >
                Clear
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} loading={exporting}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <TransactionTable
          transactions={filtered}
          agencies={agencies}
          branches={branches}
          onView={handleView}
          onEdit={handleEdit}
          onPrint={handlePrint}
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          limit={pageSize}
          onPageChange={setCurrentPage}
          canEdit={canWrite}
        />
      )}

      {/* Quick reference footer */}
      <Card className="border-0 shadow-sm bg-blue-50/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 shrink-0">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {total} {directionLabel.toLowerCase()} transaction
                {total !== 1 ? "s" : ""} on the server
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                {" - "}
                {Math.min(currentPage * pageSize, filtered.length)} of{" "}
                {filtered.length} on this page. Vouchers awaiting authentication
                are routed to the manager queue.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
