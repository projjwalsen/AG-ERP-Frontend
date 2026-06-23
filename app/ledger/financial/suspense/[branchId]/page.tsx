"use client";

import * as React from "react";
import {
  ArrowLeft, Layers, RefreshCw, AlertTriangle, Building2,
  ArrowUpRight, ArrowDownLeft,
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

  const summary = currentSuspenseDetail?.summary || {};
  const transactions = currentSuspenseDetail?.transactions || [];
  const branch = currentSuspenseDetail?.branch;

  const totalTransactions = (summary.totalTransactions as number) ?? transactions.length;
  const totalInward = (summary.totalInward as number) ?? 0;
  const totalOutward = (summary.totalOutward as number) ?? 0;
  const cashTransactions = (summary.cashTransactions as number) ?? 0;

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
              <span>Suspense Transactions</span>
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalTransactions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Inward</p>
            <p className="text-xl font-bold text-green-700 mt-1">
              {formatCurrency(totalInward)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Outward</p>
            <p className="text-xl font-bold text-amber-700 mt-1">
              {formatCurrency(totalOutward)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Cash Transactions</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{cashTransactions}</p>
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

      {/* Transactions table */}
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
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No suspense transactions found for this category</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transaction No</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Direction</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Remarks</th>
                    
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-700">{t.transactionNo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={t.direction === "INWARD" ? "success" : "warning"}
                          className="gap-1"
                        >
                          {t.direction === "INWARD" ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {t.direction}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(Number(t.amount) || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {t.paymentMode ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {t.paymentType ?? "—"}
                      </td>
                     
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {t.remarks ?? <span className="text-gray-400">—</span>}
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
