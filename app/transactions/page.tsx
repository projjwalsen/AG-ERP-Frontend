"use client";
import * as React from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  IndianRupee,
  Plus,
  Receipt,
  Search,
  Wallet,
  RefreshCcw,
  Download,
  Calendar,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout";
import { formatCurrency } from "@/lib/utils";
import {
  mockTransactions,
  mockAgencies,
  mockBranches,
  getMockStats,
  mockInvoices,
} from "@/lib/mock-data/transactions";
import { Transaction } from "./types/transaction";
import { TransactionTable } from "./components/TransactionTable";
import { StatusBadge } from "./components/StatusBadge";

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

// ============== MAIN PAGE ==============
export default function TransactionsListPage() {
  const stats = getMockStats();
  const [loading, setLoading] = React.useState<boolean>(true);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);

  const [search, setSearch] = React.useState<string>("");
  const [branchFilter, setBranchFilter] = React.useState<string>("");
  const [typeFilter, setTypeFilter] = React.useState<string>("");
  const [paymentModeFilter, setPaymentModeFilter] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const pageSize = 8;

  // Simulate initial data load
  React.useEffect(() => {
    const t = setTimeout(() => {
      setTransactions(mockTransactions);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Filter logic
  const filtered = React.useMemo(() => {
    let list = [...transactions];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.voucherNo.toLowerCase().includes(q) ||
          t.createdByName.toLowerCase().includes(q) ||
          t.invoiceId?.toLowerCase().includes(q) ||
          mockAgencies
            .find((a) => a.id === t.agencyId)
            ?.name.toLowerCase()
            .includes(q)
      );
    }
    if (branchFilter) list = list.filter((t) => t.branchId === branchFilter);
    if (typeFilter) list = list.filter((t) => t.type === typeFilter);
    if (paymentModeFilter)
      list = list.filter((t) => t.payment.mode === paymentModeFilter);
    if (statusFilter) list = list.filter((t) => t.status === statusFilter);
    if (dateFrom) list = list.filter((t) => t.voucherDate >= dateFrom);
    if (dateTo) list = list.filter((t) => t.voucherDate <= dateTo);
    return list;
  }, [
    transactions,
    search,
    branchFilter,
    typeFilter,
    paymentModeFilter,
    statusFilter,
    dateFrom,
    dateTo,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    branchFilter,
    typeFilter,
    paymentModeFilter,
    statusFilter,
    dateFrom,
    dateTo,
  ]);

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
  const handlePrint = (txn: Transaction) => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const clearFilters = () => {
    setSearch("");
    setBranchFilter("");
    setTypeFilter("");
    setPaymentModeFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters =
    !!search ||
    !!branchFilter ||
    !!typeFilter ||
    !!paymentModeFilter ||
    !!statusFilter ||
    !!dateFrom ||
    !!dateTo;

  // Stats values
  const totalAmount = mockTransactions.reduce((s, t) => s + t.amount, 0);
  const pendingAmount = mockTransactions
    .filter((t) => t.status === "PENDING_AUTHENTICATION")
    .reduce((s, t) => s + t.amount, 0);
  const suspenseAmount = mockTransactions
    .filter((t) => t.isSuspense)
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Transaction Management"
        description="Manage inward, outward, suspense, and authentication workflows"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Transactions" },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            <Link href="/transactions/pending">
              <Button variant="outline" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending Queue
                {stats.pendingAuthentication > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center px-1.5 h-5 min-w-5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">
                    {stats.pendingAuthentication}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/transactions/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Transaction
              </Button>
            </Link>
          </>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions}
          hint={`${formatCurrency(totalAmount)} total value`}
          icon={Receipt}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Pending Authentication"
          value={stats.pendingAuthentication}
          hint={`${formatCurrency(pendingAmount)} pending`}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          link={{ label: "Review queue", href: "/transactions/pending" }}
        />
        <StatCard
          title="Inward Payments"
          value={stats.inwardPayments}
          hint="Receiving entries"
          icon={ArrowDownToLine}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Outward Payments"
          value={stats.outwardPayments}
          hint="Paying entries"
          icon={ArrowUpFromLine}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
        <StatCard
          title="Suspense Entries"
          value={stats.suspenseEntries}
          hint={`${formatCurrency(suspenseAmount)} routed`}
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
                placeholder="Search by voucher, agency, invoice, or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <FilterSelect
              value={branchFilter}
              onChange={setBranchFilter}
              placeholder="All Branches"
              options={mockBranches.map((b) => ({ label: b.name, value: b.id }))}
              className="w-44"
            />
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              placeholder="All Types"
              options={[
                { label: "Inward", value: "INWARD" },
                { label: "Outward", value: "OUTWARD" },
              ]}
              className="w-36"
            />
            <FilterSelect
              value={paymentModeFilter}
              onChange={setPaymentModeFilter}
              placeholder="All Payment Modes"
              options={[
                { label: "Online", value: "ONLINE" },
                { label: "Offline Cash", value: "OFFLINE_CASH" },
              ]}
              className="w-44"
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Status"
              options={[
                { label: "Draft", value: "DRAFT" },
                {
                  label: "Pending Authentication",
                  value: "PENDING_AUTHENTICATION",
                },
                { label: "Authenticated", value: "AUTHENTICATED" },
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
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <TransactionTable
          transactions={paged}
          agencies={mockAgencies}
          branches={mockBranches}
          onView={handleView}
          onEdit={handleEdit}
          onPrint={handlePrint}
          currentPage={currentPage}
          totalPages={totalPages}
          total={filtered.length}
          limit={pageSize}
          onPageChange={setCurrentPage}
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
                {filtered.length} transaction
                {filtered.length !== 1 ? "s" : ""} match the current filters
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Showing {paged.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                {" - "}
                {Math.min(currentPage * pageSize, filtered.length)} of{" "}
                {filtered.length}. Vouchers awaiting authentication are routed
                to the manager queue.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
