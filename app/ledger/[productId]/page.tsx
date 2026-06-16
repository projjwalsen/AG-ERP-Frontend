"use client";

import * as React from "react";
import {
  ArrowLeft, BookOpen, Package, AlertTriangle, RefreshCw, Search,
  TrendingUp, TrendingDown, Building2, Hash, Calendar, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchProductLedgerById, clearCurrentDetail } from "@/app/store/ledgerSlice";
import { ProductLedgerEntry, ProductLedgerMovementType } from "@/app/types/ledger";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";

const movementTypeColors: Record<string, { bg: string; text: string }> = {
  OPENING_BALANCE: { bg: "bg-blue-100", text: "text-blue-700" },
  PURCHASE: { bg: "bg-green-100", text: "text-green-700" },
  SALE: { bg: "bg-amber-100", text: "text-amber-700" },
  ADJUSTMENT_IN: { bg: "bg-emerald-100", text: "text-emerald-700" },
  ADJUSTMENT_OUT: { bg: "bg-orange-100", text: "text-orange-700" },
  RETURN_IN: { bg: "bg-teal-100", text: "text-teal-700" },
  RETURN_OUT: { bg: "bg-pink-100", text: "text-pink-700" },
  DAMAGE: { bg: "bg-red-100", text: "text-red-700" },
  TRANSFER_IN: { bg: "bg-indigo-100", text: "text-indigo-700" },
  TRANSFER_OUT: { bg: "bg-purple-100", text: "text-purple-700" },
};

const movementTypeLabels: Record<string, string> = {
  OPENING_BALANCE: "Opening Balance",
  PURCHASE: "Purchase",
  SALE: "Sale",
  ADJUSTMENT_IN: "Adjustment In",
  ADJUSTMENT_OUT: "Adjustment Out",
  RETURN_IN: "Return In",
  RETURN_OUT: "Return Out",
  DAMAGE: "Damage",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
};

export default function ProductLedgerDetailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ProductLedgerDetailContent />
    </React.Suspense>
  );
}

function ProductLedgerDetailContent() {
  const params = useParams<{ productId: string }>();
  const productId = params?.productId;
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { currentDetail, isDetailLoading, detailError } = useAppSelector((state) => state.ledger);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [movementTypeFilter, setMovementTypeFilter] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    if (productId) {
      fetchDetail(currentPage, movementTypeFilter);
    }
    return () => {
      dispatch(clearCurrentDetail());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, movementTypeFilter]);

  React.useEffect(() => {
    if (productId) {
      fetchDetail(currentPage, movementTypeFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchDetail = async (
    page: number,
    movementType?: string
  ) => {
    if (!productId) return;
    try {
      const params: any = { productId, page, limit: 10 };
      if (movementType) params.movementType = movementType as ProductLedgerMovementType;
      await dispatch(fetchProductLedgerById(params)).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch product ledger details", "error");
    }
  };

  const filteredMovements = React.useMemo(() => {
    if (!currentDetail?.movements?.entries) return [];
    if (!searchTerm) return currentDetail.movements.entries;
    const term = searchTerm.toLowerCase();
    return currentDetail.movements.entries.filter(
      (m) =>
        m.invoiceNo?.toLowerCase().includes(term) ||
        m.batchNo?.toLowerCase().includes(term) ||
        m.branch?.name?.toLowerCase().includes(term) ||
        m.agency?.name?.toLowerCase().includes(term) ||
        m.remarks?.toLowerCase().includes(term) ||
        (movementTypeLabels[m.movementType] || "").toLowerCase().includes(term)
    );
  }, [currentDetail, searchTerm]);

  if (isDetailLoading && !currentDetail) {
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

  if (detailError && !currentDetail) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mb-4">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => router.push("/ledger")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Ledger
          </Button>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">Failed to load ledger</h3>
            <p className="text-sm text-gray-500 mb-4">{detailError}</p>
            <Button onClick={() => fetchDetail(currentPage, movementTypeFilter)}>
              Try Again
            </Button>
          </CardContent>
        </Card>
        <ToastContainer />
      </div>
    );
  }

  if (!currentDetail) {
    return null;
  }

  const { product, ledger, stock, branchStock, movements } = currentDetail;
  const meta = movements?.meta;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="gap-2 mb-3 -ml-2"
          onClick={() => router.push("/ledger")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ledger
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name || "Product"}</h1>
              <p className="text-sm text-gray-500">
                {product.sku || "—"} · Ledger {ledger?.code || "—"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fetchDetail(currentPage, movementTypeFilter)}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Product & Stock summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Global Stock (KG)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stock.globalStockKG.toLocaleString(undefined, { maximumFractionDigits: 3 })}
            </p>
            <p className="text-xs text-gray-400 mt-1">across {branchStock.length || 0} branch(es)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Global Stock (LTR)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stock.globalStockLTR.toLocaleString(undefined, { maximumFractionDigits: 3 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Min Stock</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {product.minimumStockKG
                ? product.minimumStockKG.toLocaleString(undefined, { maximumFractionDigits: 3 })
                : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">{product.baseUnit || "KG"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Sell Price</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(product.sellPricePerUnit || 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">per {product.baseUnit || "unit"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Product metadata */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                <Hash className="h-3 w-3" /> SKU
              </p>
              <p className="font-mono text-sm mt-1">{product.sku || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                <Package className="h-3 w-3" /> Category
              </p>
              <p className="text-sm mt-1">{product.category || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Base Unit
              </p>
              <p className="text-sm mt-1">{product.baseUnit || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                <Calendar className="h-3 w-3" /> GST
              </p>
              <p className="text-sm mt-1">{product.applicableGST || 0}%</p>
            </div>
            {stock.isLowStock && (
              <div className="col-span-2 md:col-span-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>This product is below its minimum stock threshold.</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Branch stock breakdown */}
      {branchStock.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Branch-wise Stock</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Stock (KG)</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Stock (LTR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {branchStock.map((b) => (
                    <tr key={b.branchId}>
                      <td className="py-2 text-sm font-medium">{b.branchName}</td>
                      <td className="py-2 text-sm font-mono text-gray-600">{b.branchCode}</td>
                      <td className="py-2 text-sm text-right">
                        {b.currentStockKG.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                      </td>
                      <td className="py-2 text-sm text-right">
                        {b.currentStockLTR.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search movements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={movementTypeFilter}
          onChange={(e) => {
            setMovementTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Movement Types</option>
          {Object.entries(movementTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Movements table */}
      {isDetailLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredMovements.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Direction</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty (KG)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty (LTR)</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Party</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMovements.map((m) => (
                    <MovementRow key={m.id} movement={m} />
                  ))}
                </tbody>
              </table>
            </div>

            {meta && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No movement history found</p>
          </CardContent>
        </Card>
      )}

      <ToastContainer />
    </div>
  );
}

function MovementRow({ movement }: { movement: ProductLedgerEntry }) {
  const directionColor =
    movement.direction === "DEBIT"
      ? "text-green-600 bg-green-100"
      : "text-amber-600 bg-amber-100";
  const DirectionIcon = movement.direction === "DEBIT" ? TrendingUp : TrendingDown;
  const typeColor =
    movementTypeColors[movement.movementType] || { bg: "bg-gray-100", text: "text-gray-700" };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
        {formatDateTime(movement.entryDate)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor.bg} ${typeColor.text}`}
        >
          {movementTypeLabels[movement.movementType] || movement.movementType}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${directionColor}`}
        >
          <DirectionIcon className="h-3 w-3" />
          {movement.direction}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium">
        {movement.quantityKG.toLocaleString(undefined, { maximumFractionDigits: 3 })}
      </td>
      <td className="px-4 py-3 text-right text-sm">
        {movement.quantityLTR
          ? movement.quantityLTR.toLocaleString(undefined, { maximumFractionDigits: 3 })
          : "-"}
      </td>
      <td className="px-4 py-3 text-sm">
        {movement.branch ? (
          <div>
            <div className="font-medium">{movement.branch.name}</div>
            <div className="text-xs text-gray-400 font-mono">{movement.branch.code}</div>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        {movement.agency ? movement.agency.name : <span className="text-gray-400">-</span>}
      </td>
      <td className="px-4 py-3 text-sm font-mono text-gray-600">
        {movement.invoiceNo || <span className="text-gray-400">-</span>}
      </td>
      <td className="px-4 py-3 text-sm font-mono text-gray-600">
        {movement.batchNo || <span className="text-gray-400">-</span>}
      </td>
      <td className="px-4 py-3 text-right text-sm">
        {movement.unitCost ? formatCurrency(movement.unitCost) : <span className="text-gray-400">-</span>}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
        {movement.totalCost ? formatCurrency(movement.totalCost) : <span className="text-gray-400">-</span>}
      </td>
    </tr>
  );
}
