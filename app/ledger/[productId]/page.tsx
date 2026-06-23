"use client";

import * as React from "react";
import {
  ArrowLeft, BookOpen, AlertTriangle, RefreshCw, Package, Calendar, Building2, Hash,
  Download, Filter as FilterIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchProductLedgerById, clearCurrentDetail } from "@/app/store/ledgerSlice";
import { ProductLedgerEntry, ProductLedgerMovementType } from "@/app/types/ledger";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { useParams, useRouter } from "next/navigation";
import { branchApi } from "@/app/services/branch.service";
import { Branch } from "@/app/types/branch";

// Movement types that represent stock IN (Credit) — "Received from {agency}"
const CREDIT_MOVEMENTS: ProductLedgerMovementType[] = [
  "PURCHASE",
  "RETURN_IN",
  "ADJUSTMENT_IN",
  "TRANSFER_IN",
  "OPENING_BALANCE",
];

// Movement types that represent stock OUT (Debit) — "Issued to {agency}"
const DEBIT_MOVEMENTS: ProductLedgerMovementType[] = [
  "SALE",
  "RETURN_OUT",
  "ADJUSTMENT_OUT",
  "DAMAGE",
  "TRANSFER_OUT",
];

function isCreditMovement(m: ProductLedgerMovementType): boolean {
  return CREDIT_MOVEMENTS.includes(m);
}

function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

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
  const { user } = useAppSelector((state) => state.auth);
  const { currentDetail, isDetailLoading, detailError } = useAppSelector((state) => state.ledger);

  // Draft filter state (what user is editing); applied state (what's sent to API)
  const [branchId, setBranchId] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [appliedBranchId, setAppliedBranchId] = React.useState<string>("");
  const [appliedStartDate, setAppliedStartDate] = React.useState<string>("");
  const [appliedEndDate, setAppliedEndDate] = React.useState<string>("");

  const [currentPage, setCurrentPage] = React.useState(1);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [exporting, setExporting] = React.useState(false);

  const isAllBranchAccess = user?.branchAccessType === "ALL";
  const isFixedBranch = user?.branchAccessType === "SELECTED" && !!user?.branchId;

  // For fixed-branch users, lock to their branch
  const effectiveBranchId = React.useMemo(() => {
    if (isFixedBranch) return user!.branchId!;
    return appliedBranchId || undefined;
  }, [isFixedBranch, appliedBranchId, user]);

  // Load branches for ALL-access users
  React.useEffect(() => {
    if (!isAllBranchAccess) return;
    let active = true;
    branchApi
      .getActive()
      .then((res) => {
        if (!active) return;
        if (res.success && res.data?.branches) {
          setBranches(res.data.branches);
        }
      })
      .catch(() => {
        /* swallow — branch dropdown simply stays empty */
      });
    return () => {
      active = false;
    };
  }, [isAllBranchAccess]);

  const fetchDetail = React.useCallback(
    async (page: number) => {
      if (!productId) return;
      try {
        const params: any = { productId, page, limit: 25 };
        if (effectiveBranchId) params.branchId = effectiveBranchId;
        if (appliedStartDate) params.startDate = appliedStartDate;
        if (appliedEndDate) params.endDate = appliedEndDate;
        await dispatch(fetchProductLedgerById(params)).unwrap();
      } catch (err: any) {
        addToast(err || "Failed to fetch product ledger details", "error");
      }
    },
    [productId, effectiveBranchId, appliedStartDate, appliedEndDate, dispatch, addToast]
  );

  React.useEffect(() => {
    if (productId) {
      fetchDetail(currentPage);
    }
    return () => {
      dispatch(clearCurrentDetail());
    };
  }, [productId, effectiveBranchId, appliedStartDate, appliedEndDate, fetchDetail, dispatch]);

  React.useEffect(() => {
    if (productId) {
      fetchDetail(currentPage);
    }
  }, [currentPage, productId, fetchDetail]);

  // Apply button: commit draft filters -> applied filters, then refetch.
  const applyFilters = () => {
    setAppliedBranchId(branchId);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setBranchId("");
    setStartDate("");
    setEndDate("");
    setAppliedBranchId("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setCurrentPage(1);
  };

  const handleExport = async () => {
    if (!productId) return;
    setExporting(true);
    try {
      // Stream the product's full movement history as an .xlsx file.
      // `?export=true` switches the backend to xlsx streaming mode instead
      // of returning JSON. `downloadFile` fetches + triggers the browser
      // download — using the service's `exportProductLedgerDetail` here
      // would only return the blob without saving it (see `lib/download.ts`).
      const params = new URLSearchParams();
      params.append("export", "true");
      if (effectiveBranchId) params.append("branchId", effectiveBranchId);
      if (appliedStartDate) params.append("startDate", appliedStartDate);
      if (appliedEndDate) params.append("endDate", appliedEndDate);
      await downloadFile(
        `api/product-ledger/${productId}/detail?${params.toString()}`,
        `product_movements_${productId}.xlsx`
      );
      addToast("Product ledger exported successfully", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export product ledger", "error");
    } finally {
      setExporting(false);
    }
  };

  if (isDetailLoading && !currentDetail) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-14 w-full" />
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
            <Button onClick={() => fetchDetail(currentPage)}>
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
  const entries = movements?.entries ?? [];
  const openingStockKG = stock.openingStockKG ?? 0;
  const closingStockKG = stock.closingStockKG ?? stock.globalStockKG ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                <span className="font-mono">{product.sku || "—"}</span> · Product Ledger
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fetchDetail(currentPage)}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              loading={exporting}
              disabled={!entries.length && !closingStockKG}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
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
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Branch</label>
            {isAllBranchAccess ? (
              <Select
                value={branchId || "__all__"}
                onValueChange={(value) => setBranchId(value === "__all__" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-200 bg-gray-50 text-gray-700">
                <Building2 className="h-3.5 w-3.5 text-gray-500" />
                <span className="truncate">{user?.branchId ?? "Your branch"}</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Start Date</label>
            <Input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">End Date</label>
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              onClick={applyFilters}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <FilterIcon className="h-3.5 w-3.5" />
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Movements table — exactly 8 columns */}
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
      ) : entries.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Received From / Issued To<br />
                      
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Delivery Note / Issued No<br />
                      
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Batch No</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Expiry Date<br />
                      
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Quantity Received<br />
                      
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Quantity Issued<br />
                      
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Opening stock row */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {appliedStartDate ? formatDate(appliedStartDate) : "—"}
                    </td>
                    <td className="px-4 py-3" colSpan={5}>
                      <span className="text-sm font-medium text-gray-700 italic">Opening Stock</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-400">—</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatQty(openingStockKG)}
                      <span className="ml-1 text-[10px] text-gray-400 font-normal">{product.baseUnit || "KG"}</span>
                    </td>
                  </tr>
                  {entries.map((m, idx) => (
                    <MovementTableRow key={m.id ?? `opening-${idx}`} movement={m} />
                  ))}
                  {/* Closing stock row */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {appliedEndDate ? formatDate(appliedEndDate) : "—"}
                    </td>
                    <td className="px-4 py-3" colSpan={5}>
                      <span className="text-sm font-medium text-gray-700 italic">Closing Stock</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-400">—</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatQty(closingStockKG)}
                      <span className="ml-1 text-[10px] text-gray-400 font-normal">{product.baseUnit || "KG"}</span>
                    </td>
                  </tr>
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
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No movement history found</p>
          </CardContent>
        </Card>
      )}

      <ToastContainer />
    </div>
  );
}

function MovementTableRow({ movement }: { movement: ProductLedgerEntry }) {
  const agencyName = movement.agency?.name;
  const verb =
    movement.direction === "CREDIT"
      ? "Received from"
      : movement.direction === "DEBIT"
      ? "Issued to"
      : null;

  // For Opening Stock rows where direction is null and movementType is OPENING/OPENING_BALANCE
  let partyCell: React.ReactNode;
  if (movement.movementType === "OPENING" as unknown as ProductLedgerMovementType || (movement.id === null && movement.direction === null)) {
    partyCell = <span className="text-gray-400 text-xs italic">Opening Stock</span>;
  } else if (agencyName && verb) {
    partyCell = (
      <div>
        <span className="text-xs text-gray-500">{verb}</span>
        <p className="text-sm font-medium text-gray-900">{agencyName}</p>
      </div>
    );
  } else if (agencyName) {
    partyCell = <span className="text-sm font-medium text-gray-900">{agencyName}</span>;
  } else {
    partyCell = <span className="text-gray-400">—</span>;
  }

  // Credit/Debit columns
  const isCredit = movement.direction === "CREDIT";
  const isDebit = movement.direction === "DEBIT";

  const creditQty = isCredit
    ? movement.unit === "LTR" && movement.quantityLTR
      ? formatQty(movement.quantityLTR)
      : formatQty(movement.quantityKG)
    : "—";

  const debitQty = isDebit
    ? movement.unit === "LTR" && movement.quantityLTR
      ? formatQty(movement.quantityLTR)
      : formatQty(movement.quantityKG)
    : "—";

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
        {movement.id ? formatDate(movement.entryDate) : formatDate(movement.entryDate)}
        <p className="text-[10px] text-gray-400">{formatDateTime(movement.entryDate).split(",").pop()?.trim()}</p>
      </td>
      <td className="px-4 py-3">{partyCell}</td>
      <td className="px-4 py-3 text-sm font-mono text-gray-700">
        {movement.invoiceNo || <span className="text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3 text-sm font-mono text-gray-700">
        {movement.batchNo || <span className="text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400 italic">
        —
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-green-700 whitespace-nowrap">
        {creditQty}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-amber-700 whitespace-nowrap">
        {debitQty}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
        {formatQty(movement.runningStockKG)}
        <span className="ml-1 text-[10px] text-gray-400 font-normal">{movement.unit || "KG"}</span>
      </td>
    </tr>
  );
}