"use client";

import * as React from "react";
import {
  BookOpen, Wallet, Search, RefreshCw, Eye, Package, AlertTriangle, Hourglass, Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchAllProductLedgers } from "@/app/store/ledgerSlice";
import { ProductLedgerListItem } from "@/app/types/ledger";
import { formatCurrency } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

export default function LedgerPage() {
  // `useSearchParams` requires a Suspense boundary during static rendering.
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LedgerContent />
    </React.Suspense>
  );
}

function LedgerContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab");
  const defaultTab = tabFromUrl === "financial" ? "financial" : "product";
  const router = useRouter();

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (value === "product") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const query = params.toString();
    router.replace(query ? `/ledger?${query}` : "/ledger", { scroll: false });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>
        <p className="text-gray-500 mt-1">
          View product stock movements and financial ledgers
        </p>
      </div>

      <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6 bg-gray-100">
          <TabsTrigger value="product" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Product Ledger
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Financial Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="product">
          <ProductLedgerTab />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialLedgerTab />
        </TabsContent>
      </Tabs>

      <ToastContainer />
    </div>
  );
}

// ============== PRODUCT LEDGER TAB ==============
function ProductLedgerTab() {
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { ledgers, isListLoading, pagination } = useAppSelector((state) => state.ledger);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    fetchLedgers(currentPage);
  }, [currentPage]);

  const fetchLedgers = async (page = currentPage) => {
    try {
      const params: any = { page, limit: 10 };
      await dispatch(fetchAllProductLedgers(params)).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch product ledgers", "error");
    }
  };

  const filteredLedgers = React.useMemo(() => {
    if (!searchTerm) return ledgers;
    const term = searchTerm.toLowerCase();
    return ledgers.filter(
      (l) =>
        l.productName?.toLowerCase().includes(term) ||
        l.productSKU?.toLowerCase().includes(term) ||
        l.code?.toLowerCase().includes(term)
    );
  }, [ledgers, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Product Ledgers</h2>
          <p className="text-sm text-gray-500">
            Track stock movement, opening balance and current stock per product
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by product name, SKU or ledger code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLedgers(currentPage)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isListLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredLedgers.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ledger Code</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock (KG)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock (LTR)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sell Price</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLedgers.map((ledger) => (
                    <LedgerRow
                      key={ledger.id}
                      ledger={ledger}
                      canView={true}
                      onView={() => router.push(`/ledger/${ledger.productId}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No product ledgers found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LedgerRow({
  ledger,
  canView,
  onView,
}: {
  ledger: ProductLedgerListItem;
  canView: boolean;
  onView: () => void;
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <span className="font-mono text-sm font-medium">{ledger.code || "-"}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Package className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div>
            <span className="text-sm font-medium">{ledger.productName || "-"}</span>
            <p className="text-xs text-gray-400 font-mono">{ledger.productSKU || "-"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {ledger.productCategory || "-"}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium">
          {ledger.globalStockKG.toLocaleString(undefined, { maximumFractionDigits: 3 })}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium">
          {ledger.globalStockLTR.toLocaleString(undefined, { maximumFractionDigits: 3 })}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-gray-600">
          {ledger.minimumStockKG
            ? ledger.minimumStockKG.toLocaleString(undefined, { maximumFractionDigits: 3 })
            : "-"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium text-green-600">
          {formatCurrency(ledger.sellPricePerUnit || 0)}
        </span>
      </td>
      <td className="px-4 py-3">
        {ledger.isLowStock ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle className="h-3 w-3" />
            Low Stock
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            In Stock
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {canView && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={onView}
          >
            <Eye className="h-4 w-4" />
            View Details
          </Button>
        )}
      </td>
    </tr>
  );
}

// ============== FINANCIAL LEDGER TAB (UPCOMING) ==============
function FinancialLedgerTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Financial Ledger</h2>
          <p className="text-sm text-gray-500">Track monetary flows and account balances</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
            <Hourglass className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Coming Soon</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            The financial ledger is currently under development. It will surface receivables,
            payables and account-level movements here.
          </p>
          <div className="mt-4 inline-flex items-center gap-1 text-xs text-gray-400">
            <Coins className="h-3 w-3" />
            Financial Ledger module
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
