"use client";

import * as React from "react";
import {
  ArrowLeft, Layers, RefreshCw, AlertTriangle, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchLedgerBySuspenseId,
  clearFinancialCurrentDetail,
} from "@/app/store/ledgerSlice";
import { formatCurrency } from "@/lib/utils";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function SuspenseLedgerDetailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <SuspenseLedgerDetailContent />
    </React.Suspense>
  );
}

function SuspenseLedgerDetailContent() {
  const params = useParams<{ branchId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();

  const branchId = params?.branchId;
  const category = searchParams?.get("category") || "ACCOUNTING_LEDGER";
  const entityName = searchParams?.get("name") || "Branch";

  const {
    currentSuspenseDetail,
    isSuspenseDetailLoading,
    suspenseDetailError,
  } = useAppSelector((state) => state.ledger);

  const fetchData = React.useCallback(async () => {
    if (!branchId) return;
    try {
      await dispatch(
        fetchLedgerBySuspenseId({
          branchId,
          category: category as any,
        })
      ).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch suspense ledgers", "error");
    }
  }, [dispatch, branchId, category, addToast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    return () => {
      dispatch(clearFinancialCurrentDetail());
    };
  }, [dispatch]);

  // Backend now returns an income/expense entry list (`entries[]`) with
  // totals under `summary` (totalTransactions / totalIncome /
  // totalExpense / closingBalance). The previous shape was a flat
  // `transactions[]` of branch-aggregated rows — that field is gone.
  const summary = currentSuspenseDetail?.summary || {};
  const entries = currentSuspenseDetail?.entries ?? [];
  const branch = currentSuspenseDetail?.branch;

  const totalTransactions = (summary.totalTransactions as number) ?? entries.length;
  const totalIncome = (summary.totalIncome as number) ?? 0;
  const totalExpense = (summary.totalExpense as number) ?? 0;
  const closingBalance = (summary.closingBalance as number) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/ledger/financial")}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="p-2 bg-orange-100 rounded-lg">
            <Layers className="h-5 w-5 text-orange-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {branch?.name || entityName}
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Suspense Ledger</span>
              <Badge variant="outline">{category}</Badge>
              {branch?.code && (
                <span className="font-mono text-xs">Code: {branch.code}</span>
              )}
              {branch?.gstin && (
                <span className="font-mono text-xs">GSTIN: {branch.gstin}</span>
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary cards — match the new response: count / income / expense / balance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Entries</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalTransactions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Income</p>
            <p className="text-xl font-bold text-green-700 mt-1">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Expense</p>
            <p className="text-xl font-bold text-amber-700 mt-1">
              {formatCurrency(totalExpense)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Closing Balance</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(closingBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Branch context */}
      {branch && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Branch Name</p>
                  <p className="font-medium text-gray-900">{branch.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Code</p>
                  <p className="font-mono text-gray-700">{branch.code}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">GSTIN</p>
                  <p className="font-mono text-gray-700">{branch.gstin ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Branch ID</p>
                  <p className="font-mono text-xs text-gray-500 truncate">{branchId}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries table — backend returns the income/expense entry shape
          (serialNo / date / voucherNo / description / income / expense /
          paymentMode / paymentType / transactionRefNo / remarks). */}
      <Card>
        <CardContent className="p-0">
          {isSuspenseDetailLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : suspenseDetailError ? (
            <div className="p-12 text-center">
              <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-600">{suspenseDetailError}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No suspense entries found for this branch</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Voucher No</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Income</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Expense</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transaction Ref</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e) => (
                    <tr
                      key={`${e.serialNo}-${e.voucherNo}-${e.date}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-500">{e.serialNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{e.date}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-700">{e.voucherNo}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {e.description || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                        {e.income
                          ? formatCurrency(Number(e.income))
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-amber-700">
                        {e.expense
                          ? formatCurrency(Number(e.expense))
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {e.paymentMode || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {e.paymentType || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {e.transactionRefNo ? (
                          <span className="font-mono text-xs text-gray-700">{e.transactionRefNo}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {e.remarks || <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ToastContainer />
    </div>
  );
}
