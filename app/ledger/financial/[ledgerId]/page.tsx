"use client";

import * as React from "react";
import {
  ArrowLeft, Wallet, AlertTriangle, RefreshCw, FileText, Building2,
  Calendar, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchFinancialLedgerById,
  fetchLedgerStatement,
  clearFinancialCurrentDetail,
} from "@/app/store/ledgerSlice";
import { FinancialLedgerType } from "@/app/types/ledger";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";

const CATEGORY_COLORS: Record<FinancialLedgerType, string> = {
  CUSTOMER: "bg-blue-100 text-blue-700",
  VENDOR: "bg-purple-100 text-purple-700",
  BANK: "bg-indigo-100 text-indigo-700",
  CASH: "bg-emerald-100 text-emerald-700",
  GST: "bg-amber-100 text-amber-700",
  SALES: "bg-green-100 text-green-700",
  PURCHASE: "bg-rose-100 text-rose-700",
  PRODUCT: "bg-teal-100 text-teal-700",
  SUSPENSE: "bg-orange-100 text-orange-700",
};

export default function FinancialLedgerDetailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <FinancialLedgerDetailContent />
    </React.Suspense>
  );
}

function FinancialLedgerDetailContent() {
  const params = useParams<{ ledgerId: string }>();
  const ledgerId = params?.ledgerId;
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();

  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const {
    currentFinancialLedger,
    isFinancialDetailLoading,
    financialDetailError,
    currentFinancialStatement,
    isStatementLoading,
  } = useAppSelector((state) => state.ledger);

  const fetchStatement = React.useCallback(
    (page: number) => {
      if (!ledgerId) return;
      dispatch(
        fetchLedgerStatement({
          ledgerId,
          params: {
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            limit: 50,
            page,
          },
        })
      ).catch(() => {});
    },
    [ledgerId, startDate, endDate, dispatch]
  );

  // Load detail + initial statement on mount
  React.useEffect(() => {
    if (!ledgerId) return;
    dispatch(fetchFinancialLedgerById(ledgerId))
      .unwrap()
      .catch((err: any) => addToast(err || "Failed to fetch ledger details", "error"));
    fetchStatement(1);
    return () => {
      dispatch(clearFinancialCurrentDetail());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerId]);

  // Reload statement when dates change
  React.useEffect(() => {
    if (!ledgerId) return;
    fetchStatement(1);
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, ledgerId]);

  // Pagination
  React.useEffect(() => {
    if (!ledgerId) return;
    fetchStatement(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  if (isFinancialDetailLoading && !currentFinancialLedger) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <ToastContainer />
      </div>
    );
  }

  if (financialDetailError && !currentFinancialLedger) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mb-4">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => router.push("/ledger/financial")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Financial Ledger
          </Button>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Failed to load ledger
            </h3>
            <p className="text-sm text-gray-500 mb-4">{financialDetailError}</p>
            <Button onClick={() => ledgerId && dispatch(fetchFinancialLedgerById(ledgerId))}>
              Try Again
            </Button>
          </CardContent>
        </Card>
        <ToastContainer />
      </div>
    );
  }

  if (!currentFinancialLedger) {
    return null;
  }

  const { ledger, balances, outstanding, statistics } = currentFinancialLedger;
  const statement = currentFinancialStatement;
  const entries = statement?.entries ?? [];
  const meta = statement?.meta;
  const summary = statement?.summary;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="gap-2 mb-3 -ml-2"
          onClick={() => router.push("/ledger/financial")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Financial Ledger
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Wallet className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{ledger.name || "Ledger"}</h1>
              <p className="text-sm text-gray-500">
                <span className="font-mono">{ledger.code || "—"}</span> ·{" "}
                {ledger.group?.name || "—"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (ledgerId) {
                dispatch(fetchFinancialLedgerById(ledgerId)).unwrap().catch(() => {});
                fetchStatement(currentPage);
              }
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Category</p>
            <Badge
              variant="outline"
              className={`mt-1 ${CATEGORY_COLORS[ledger.category as FinancialLedgerType] || ""}`}
            >
              {ledger.category}
            </Badge>
            <p className="text-xs text-gray-400 mt-2">{ledger.nature} nature</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Opening Balance</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(balances.openingBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{balances.balanceType}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Debit</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {formatCurrency(balances.debit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Closing Balance</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(balances.closingBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{balances.balanceType}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detail metadata */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Ledger Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Detail
              label="Group"
              value={
                <div>
                  <div>{ledger.group.name}</div>
                  <div className="text-[10px] font-mono text-gray-400">{ledger.group.code}</div>
                </div>
              }
            />
            <Detail
              label="Branch"
              value={
                ledger.branch ? (
                  <div>
                    <div>{ledger.branch.name}</div>
                    <div className="text-[10px] font-mono text-gray-400">{ledger.branch.code}</div>
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )
              }
            />
            <Detail
              label="Agency"
              value={ledger.agency?.name || <span className="text-gray-400">—</span>}
            />
            <Detail
              label="Voucher Count"
              value={<span className="font-medium">{statistics.voucherCount}</span>}
            />
            <Detail
              label="GSTIN"
              value={ledger.gstin || <span className="text-gray-400">—</span>}
              mono
            />
            <Detail
              label="PAN"
              value={ledger.pan || <span className="text-gray-400">—</span>}
              mono
            />
            <Detail
              label="Credit Limit"
              value={
                ledger.creditLimit
                  ? formatCurrency(ledger.creditLimit)
                  : <span className="text-gray-400">—</span>
              }
            />
            <Detail
              label="GST Applicable"
              value={ledger.gstApplicable ? "Yes" : "No"}
            />
            <Detail
              label="Status"
              value={
                ledger.isActive ? (
                  <Badge variant="success" dot>Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )
              }
            />
            <Detail
              label="Current Balance"
              value={
                <span className="font-medium">
                  {formatCurrency(balances.currentBalance)}
                </span>
              }
            />
            <Detail
              label="Total Credit"
              value={
                <span className="font-medium text-amber-700">
                  {formatCurrency(balances.credit)}
                </span>
              }
            />
            <Detail
              label="Outstanding"
              value={
                outstanding ? (
                  outstanding.type === "RECEIVABLE" ? (
                    <span className="text-red-600 font-medium">
                      {formatCurrency(outstanding.amount)} Receivable
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">
                      {formatCurrency(outstanding.amount)} Payable
                    </span>
                  )
                ) : (
                  <span className="text-gray-400">—</span>
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Statement section */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Statement</h3>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => fetchStatement(currentPage)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {/* Date filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Period summary */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-md">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Period Opening</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(summary.openingBalance)}
                </p>
                <p className="text-[10px] text-gray-400">{summary.openingBalanceType}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Period Debit</p>
                <p className="text-sm font-semibold text-green-700">
                  {formatCurrency(summary.totalDebit)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Period Credit</p>
                <p className="text-sm font-semibold text-amber-700">
                  {formatCurrency(summary.totalCredit)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Period Closing</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(summary.closingBalance)}
                </p>
                <p className="text-[10px] text-gray-400">{summary.closingBalanceType}</p>
              </div>
            </div>
          )}

          {/* Statement table */}
          {isStatementLoading && !statement ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : entries.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">
                        Voucher No
                      </th>
                      <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">
                        Counter Ledger(s)
                      </th>
                      <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">
                        Narration
                      </th>
                      <th className="text-right px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">
                        Debit
                      </th>
                      <th className="text-right px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">
                        Credit
                      </th>
                      <th className="text-right px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">
                        Running Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entries.map((entry: any, idx: number) => (
                      <tr key={entry.id ?? `opening-${idx}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-700">
                          {entry.voucherNo || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {entry.voucherType || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {entry.counterLedgers?.length > 0
                            ? entry.counterLedgers.map((c: any) => c.name).join(", ")
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td
                          className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate"
                          title={entry.narration || ""}
                        >
                          {entry.narration || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-medium text-green-700">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-medium text-amber-700">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900 whitespace-nowrap">
                          {formatCurrency(entry.runningBalance)}
                          <span className="ml-1 text-[10px] text-gray-400">
                            {entry.balanceType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Showing {((meta.page - 1) * meta.limit) + 1} to{" "}
                    {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={meta.page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {meta.page} of {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}
                      disabled={meta.page >= meta.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              No statement entries for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      <ToastContainer />
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`text-sm mt-1 ${mono ? "font-mono" : ""} text-gray-900`}>{value}</p>
    </div>
  );
}