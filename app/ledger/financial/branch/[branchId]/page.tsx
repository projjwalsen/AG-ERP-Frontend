"use client";

import * as React from "react";
import {
  ArrowLeft, Building2, RefreshCw, BookOpen, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchLedgerByBranchId,
  clearFinancialCurrentDetail,
} from "@/app/store/ledgerSlice";
import { FinancialLedgerType } from "@/app/types/ledger";
import { formatCurrency } from "@/lib/utils";
import { useParams, useRouter, useSearchParams } from "next/navigation";

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

export default function BranchLedgerDetailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <BranchLedgerDetailContent />
    </React.Suspense>
  );
}

function BranchLedgerDetailContent() {
  const params = useParams<{ branchId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();

  const branchId = params?.branchId;
  const category = searchParams?.get("category") || "ACCOUNTING_LEDGER";
  const entityName = searchParams?.get("name") || "Branch";

  const {
    currentBranchDetail,
    isBranchDetailLoading,
    branchDetailError,
  } = useAppSelector((state) => state.ledger);

  const fetchData = React.useCallback(async () => {
    if (!branchId) return;
    try {
      await dispatch(
        fetchLedgerByBranchId({
          branchId,
          category: category as any,
        })
      ).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch branch ledgers", "error");
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

  const summary = currentBranchDetail?.summary || {};
  const ledgers = currentBranchDetail?.ledgers || [];
  const branch = currentBranchDetail?.branch;
  const totalDebit = (summary.totalDebit as number) ?? 0;
  const totalCredit = (summary.totalCredit as number) ?? 0;
  const totalBalance = (summary.totalBalance as number) ?? 0;
  const totalLedgers = (summary.totalLedgers as number) ?? ledgers.length;

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
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {branch?.name || entityName}
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Branch-wise Ledgers</span>
              <Badge variant="outline">{category}</Badge>
              {branch?.code && (
                <span className="font-mono text-xs">Code: {branch.code}</span>
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
            <p className="text-xs text-gray-500 uppercase">Total Ledgers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalLedgers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Debit</p>
            <p className="text-xl font-bold text-green-700 mt-1">
              {formatCurrency(totalDebit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Credit</p>
            <p className="text-xl font-bold text-amber-700 mt-1">
              {formatCurrency(totalCredit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Balance</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(totalBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ledgers table */}
      <Card>
        <CardContent className="p-0">
          {isBranchDetailLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : branchDetailError ? (
            <div className="p-12 text-center">
              <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-600">{branchDetailError}</p>
            </div>
          ) : ledgers.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No ledgers found for this category</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agency</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Opening</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Debit</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Credit</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Closing</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledgers.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium">{l.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{l.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={CATEGORY_COLORS[l.category] || ""}>
                          {l.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {l.agency?.name ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {formatCurrency(l.openingBalance)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                        {formatCurrency(l.debit)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-amber-700">
                        {formatCurrency(l.credit)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(l.closingBalance)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={l.balanceType === "DR" ? "info" : "purple"}>
                          {l.balanceType}
                        </Badge>
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
