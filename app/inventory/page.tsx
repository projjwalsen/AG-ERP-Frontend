"use client";

import * as React from "react";
import { Package, Plus, Search, Edit, Eye, MoreHorizontal, Scale, IndianRupee, Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppSelector } from "@/app/store/hooks";
import { productApi, UpdateProductPayload } from "@/app/services/product.service";
import {
  importProductMaster,
  ProductImportProgress,
} from "@/app/services/import.service";
import { hasModulePermission } from "@/lib/usePermissions";
import { downloadFile } from "@/lib/download";
import { Product } from "@/app/types/product";
import { useRouter } from "next/navigation";

const categoryOptions = [
  "ALL",
] as const;

const unitOptions = ["KG", "LTR"] as const;

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
        <p className="text-gray-500 mt-1">
          Manage products, pricing, and stock settings
        </p>
      </div>

      <ProductsTab />
      <ToastContainer />
    </div>
  );
}

function ProductsTab() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<{ total: number; totalPages: number; page: number; limit: number } | null>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [exporting, setExporting] = React.useState(false);
  // Product-master import — see ImportModal below. `progress` is null
  // until the server emits its first SSE chunk; `final` is set when
  // the `event: completed` block arrives.
  const [importOpen, setImportOpen] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importProgress, setImportProgress] =
    React.useState<ProductImportProgress | null>(null);
  const [importFinal, setImportFinal] = React.useState<{
    total: number;
    processed: number;
    success: number;
    failed: number;
    errors: ProductImportProgress["errors"];
  } | null>(null);
  const [importError, setImportError] = React.useState<string | null>(null);
  const importAbortRef = React.useRef<AbortController | null>(null);
  const { permissions } = useAppSelector((state) => state.auth);

  const canView = hasModulePermission(permissions, "PRODUCT", "VIEW");
  const canWrite = hasModulePermission(permissions, "PRODUCT", "WRITE");

  React.useEffect(() => {
    if (canView) {
      fetchProducts(currentPage, searchTerm, selectedCategory);
    }
  }, [canView, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
    if (canView) {
      fetchProducts(1, searchTerm, selectedCategory);
    }
  }, [searchTerm, selectedCategory]);

  const fetchProducts = async (page: number = 1, search?: string, category?: string) => {
    setLoading(true);
    try {
      const response = await productApi.getAll({ page, limit: 10, search, category });
      const productsData = response.data?.products ?? [];
      setProducts(productsData);
      if (response.data && typeof response.data === "object" && "pagination" in response.data) {
        setPagination((response.data as any).pagination);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = React.useMemo(() => {
    return products.filter((product) => {
      const name = product.name || "";
      const sku = product.sku || "";
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             sku.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [products, searchTerm]);

  const handleCreate = () => {
    router.push("/inventory/new");
  };

  const handleEditSuccess = () => {
    window.location.reload();
  };

  const handleEdit = (product: Product) => {
    router.push(`/inventory/${product.id}/edit`);
  };

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const newStatus = product.isActive ? false : true;
      const response = await productApi.updateStatus(product.id, newStatus);
      if (response.success) {
        addToast(`Product ${newStatus ? "activated" : "deactivated"} successfully`, "success");
        fetchProducts(currentPage, searchTerm, selectedCategory);
      } else {
        addToast(response.message || "Failed to update status", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to update status", "error");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadFile(
        `api/products/all-list?${new URLSearchParams({
          export: "true",
          ...(searchTerm ? { search: searchTerm } : {}),
          ...(selectedCategory ? { category: selectedCategory } : {}),
        }).toString()}`,
        "products.xlsx"
      );
      addToast("Products exported successfully", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export products", "error");
    } finally {
      setExporting(false);
    }
  };

  const openImport = () => {
    // Reset previous run state before opening.
    setImportProgress(null);
    setImportFinal(null);
    setImportError(null);
    setImportOpen(true);
  };

  const closeImport = () => {
    if (importing) {
      // Cancel an in-flight stream when the user closes the modal.
      importAbortRef.current?.abort();
    }
    setImportOpen(false);
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setImportProgress(null);
    setImportFinal(null);
    setImportError(null);

    const controller = new AbortController();
    importAbortRef.current = controller;

    try {
      await importProductMaster(file, {
        signal: controller.signal,
        onProgress: (p) => setImportProgress(p),
        onComplete: (r) => {
          setImportFinal(r);
          setImporting(false);
          importAbortRef.current = null;
          addToast(
            r.failed > 0
              ? `Imported ${r.success}/${r.total} products (${r.failed} failed)`
              : `Imported ${r.success} products successfully`,
            r.failed > 0 ? "error" : "success"
          );
          // Refresh the product list so the new rows show up.
          fetchProducts(currentPage, searchTerm, selectedCategory);
        },
        onError: (err) => {
          setImportError(err.message || "Import failed");
          setImporting(false);
          importAbortRef.current = null;
        },
      });
    } catch (err: any) {
      // AbortedError surfaces when the user closes the modal — silent.
      if (err?.name !== "AbortError") {
        setImportError(err?.message || "Import failed");
        addToast(err?.message || "Import failed", "error");
      }
      setImporting(false);
      importAbortRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All Products</h2>
          <p className="text-sm text-gray-500">Manage product information and status</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={openImport}
            >
              <Upload className="h-4 w-4" />
              Import Products
            </Button>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {/* <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div> */}
        {(searchTerm || selectedCategory) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("");
            }}
          >
            Clear
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleExport}
          loading={exporting}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredProducts.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unit (KG)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Opening Stock</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Package className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            {product.sku && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                SKU: <span className="font-mono">{product.sku}</span>
                              </p>
                            )}
                            {product.description && (
                              <p className="text-xs text-gray-500 truncate max-w-xs">{product.description}</p>
                            )}
                            {product.disclaimer && (
                              <p className="text-xs text-amber-600 truncate max-w-xs mt-0.5">
                                ⚠ {product.disclaimer.length > 10
                                  ? `${product.disclaimer.slice(0, 10)}..`
                                  : product.disclaimer}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Scale className="h-3.5 w-3.5 text-gray-400" />
                          KG
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-900 tabular-nums">
                          {product.openingStockKG != null
                            ? Number(product.openingStockKG).toLocaleString()
                            : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {product.sellPricePerUnit.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={product.isActive ? "success" : "error"} className={product.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {canView && (
                              <DropdownMenuItem onClick={() => handleView(product)}>
                                <Eye className="mr-2 h-4 w-4" />View
                              </DropdownMenuItem>
                            )}
                            {canWrite && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(product)}>
                                  <Edit className="mr-2 h-4 w-4" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleStatus(product)} className={product.isActive ? "text-red-600" : "text-green-600"}>
                                  {product.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
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
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No products found</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Add First Product
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedProduct && (
        <ViewProductModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          product={selectedProduct}
        />
      )}

      <ImportProductsModal
        open={importOpen}
        onClose={closeImport}
        importing={importing}
        progress={importProgress}
        final={importFinal}
        error={importError}
        onFileSelected={handleImportFile}
      />
    </div>
  );
}

// ============================================================================
// Import products from Excel — drives POST /api/migration/product.
//
// The backend streams `data: { total, processed, success, failed,
// percentage, errors }` SSE chunks while it imports. The modal shows a
// live progress bar and a final summary (success / failed counts +
// per-row errors).
// ============================================================================

function ImportProductsModal({
  open,
  onClose,
  importing,
  progress,
  final,
  error,
  onFileSelected,
}: {
  open: boolean;
  onClose: () => void;
  importing: boolean;
  progress: ProductImportProgress | null;
  final: {
    total: number;
    processed: number;
    success: number;
    failed: number;
    errors: ProductImportProgress["errors"];
  } | null;
  error: string | null;
  onFileSelected: (file: File) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = React.useState<string>("");

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    onFileSelected(file);
    // Reset the input so the same file can be picked again later.
    e.target.value = "";
  };

  // Reset the picked filename whenever the modal closes.
  React.useEffect(() => {
    if (!open) setFileName("");
  }, [open]);

  // Derived values for the UI. While a stream is in flight the
  // percentage comes from the server; once `final` arrives we lock it
  // at 100%.
  const totalRows = progress?.total ?? final?.total ?? 0;
  const processedRows = progress?.processed ?? final?.processed ?? 0;
  const successRows = progress?.success ?? final?.success ?? 0;
  const failedRows = progress?.failed ?? final?.failed ?? 0;
  const percentage =
    final != null
      ? 100
      : Math.min(100, Math.max(0, progress?.percentage ?? 0));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Import Product Master
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload an Excel workbook (.xlsx / .xls) of product master rows.
            The importer streams per-row progress as it processes the
            file.
          </p>

          {!importing && !final && !error && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handleChooseFile}
              >
                <Upload className="h-4 w-4" />
                {fileName ? `Re-pick file (${fileName})` : "Choose Excel file"}
              </Button>
            </div>
          )}

          {(importing || progress) && !final && !error && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {importing
                    ? `Importing… ${processedRows}/${totalRows || "?"}`
                    : "Preparing…"}
                </span>
                <span>{percentage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-emerald-50 px-2 py-1.5">
                  <p className="text-emerald-700 font-semibold">
                    {successRows}
                  </p>
                  <p className="text-[11px] text-emerald-600">Imported</p>
                </div>
                <div className="rounded-md bg-rose-50 px-2 py-1.5">
                  <p className="text-rose-700 font-semibold">{failedRows}</p>
                  <p className="text-[11px] text-rose-600">Failed</p>
                </div>
                <div className="rounded-md bg-gray-100 px-2 py-1.5">
                  <p className="text-gray-700 font-semibold">{totalRows}</p>
                  <p className="text-[11px] text-gray-500">Total</p>
                </div>
              </div>
            </div>
          )}

          {error && !final && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
              <div className="flex items-start gap-2 text-sm text-rose-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Import failed</p>
                  <p className="text-xs text-rose-600 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}

          {final && (
            <div className="space-y-3">
              <div
                className={
                  "rounded-md border p-3 " +
                  (final.failed > 0
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50")
                }
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    className={
                      "h-4 w-4 mt-0.5 shrink-0 " +
                      (final.failed > 0
                        ? "text-amber-600"
                        : "text-emerald-600")
                    }
                  />
                  <div className="text-sm">
                    <p
                      className={
                        "font-semibold " +
                        (final.failed > 0
                          ? "text-amber-700"
                          : "text-emerald-700")
                      }
                    >
                      {final.failed > 0
                        ? `Imported ${final.success} of ${final.total} products`
                        : `Imported ${final.success} products successfully`}
                    </p>
                    {final.failed > 0 && (
                      <p className="text-xs text-amber-700 mt-0.5">
                        {final.failed} row(s) failed — see errors below.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-emerald-50 px-2 py-1.5">
                  <p className="text-emerald-700 font-semibold">
                    {final.success}
                  </p>
                  <p className="text-[11px] text-emerald-600">Imported</p>
                </div>
                <div className="rounded-md bg-rose-50 px-2 py-1.5">
                  <p className="text-rose-700 font-semibold">{final.failed}</p>
                  <p className="text-[11px] text-rose-600">Failed</p>
                </div>
                <div className="rounded-md bg-gray-100 px-2 py-1.5">
                  <p className="text-gray-700 font-semibold">{final.total}</p>
                  <p className="text-[11px] text-gray-500">Total</p>
                </div>
              </div>

              {final.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border border-rose-100 bg-rose-50/50">
                  <ul className="divide-y divide-rose-100">
                    {final.errors.slice(0, 20).map((e, i) => (
                      <li
                        key={i}
                        className="px-3 py-2 text-xs text-rose-700"
                      >
                        <span className="font-mono">
                          {e.row ? `Row ${e.row}` : "Row ?"}
                          {e.sku ? ` • SKU ${e.sku}` : ""}
                          {e.name ? ` • ${e.name}` : ""}
                        </span>
                        <span className="block text-rose-600 mt-0.5">
                          {e.message}
                        </span>
                      </li>
                    ))}
                    {final.errors.length > 20 && (
                      <li className="px-3 py-2 text-xs text-rose-700 italic">
                        +{final.errors.length - 20} more row(s) failed
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={importing}
          >
            {final || error ? "Close" : "Cancel"}
          </Button>
          {!final && !error && !importing && (
            <Button
              type="button"
              className="gap-2"
              onClick={handleChooseFile}
            >
              <Upload className="h-4 w-4" />
              Choose Excel file
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditProductModal({
  open,
  onClose,
  onSuccess,
  product,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product;
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [form, setForm] = React.useState<UpdateProductPayload>({});

  React.useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku,
        // Always send "ALL" on edit so backend listing keeps matching
        // the row regardless of the active category filter.
        category: "ALL",
        description: product.description || "",
        disclaimer: product.disclaimer || "",
        hsnNo: product.hsnNo || "",
        applicableGST: product.applicableGST,
        baseUnit: product.baseUnit,
        density: product.density,
        operationalUnit: product.operationalUnit,
        minimumStockKG: product.minimumStockKG,
        sellPricePerUnit: product.sellPricePerUnit,
      });
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.category) {
      addToast("Name, SKU, and category are required", "error");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmUpdate = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const response = await productApi.update(product.id, form);
      if (response.success) {
        addToast("Product updated successfully", "success");
        onSuccess();
      } else {
        addToast(response.message || "Failed to update product", "error");
        setLoading(false);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to update product", "error");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Edit Product
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Product Name *</Label>
              <Input
                id="edit-name"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU *</Label>
              <Input
                id="edit-sku"
                value={form.sku || ""}
                onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                className="font-mono uppercase"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category is no longer user-selectable. Every edit payload
                sends the "ALL" enum so the row continues to match
                backend listing for any active category. */}
            <input type="hidden" name="edit-category" value={form.category ?? "ALL"} />
            <div className="space-y-2">
              <Label htmlFor="edit-hsnNo">HSN Number</Label>
              <Input
                id="edit-hsnNo"
                value={form.hsnNo || ""}
                onChange={(e) => setForm({ ...form, hsnNo: e.target.value })}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-disclaimer">Disclaimer</Label>
            <Input
              id="edit-disclaimer"
              value={form.disclaimer || ""}
              onChange={(e) => setForm({ ...form, disclaimer: e.target.value })}
              placeholder="e.g., Keep away from direct sunlight"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-applicableGST">GST %</Label>
              <Input
                id="edit-applicableGST"
                type="number"
                value={form.applicableGST ?? ""}
                onChange={(e) => setForm({ ...form, applicableGST: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sellPricePerUnit">Sell Price *</Label>
              <Input
                id="edit-sellPricePerUnit"
                type="number"
                value={form.sellPricePerUnit || ""}
                onChange={(e) => setForm({ ...form, sellPricePerUnit: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-baseUnit">Base Unit *</Label>
              <select
                id="edit-baseUnit"
                value={form.baseUnit || ""}
                onChange={(e) => setForm({ ...form, baseUnit: e.target.value as "KG" | "LTR" })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-operationalUnit">Operational Unit *</Label>
              <select
                id="edit-operationalUnit"
                value={form.operationalUnit || ""}
                onChange={(e) => setForm({ ...form, operationalUnit: e.target.value as "KG" | "LTR" })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-density">Density (kg/L)</Label>
            <Input
              id="edit-density"
              type="number"
              step="0.01"
              value={form.density ?? ""}
              onChange={(e) => setForm({ ...form, density: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-minimumStockKG">Minimum Stock (KG)</Label>
            <Input
              id="edit-minimumStockKG"
              type="number"
              value={form.minimumStockKG ?? ""}
              onChange={(e) => setForm({ ...form, minimumStockKG: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          {showConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="max-w-sm w-full mx-4">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Confirm Update</h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to update product <span className="font-semibold text-gray-900">{form.name}</span>?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                    <Button onClick={handleConfirmUpdate} loading={loading}>Yes, Update</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Update Product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ViewProductModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: Product;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Product Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Product Name</p>
              <p className="font-medium text-gray-900">{product.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">SKU</p>
              <p className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded inline-block">{product.sku}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Category</p>
              <Badge variant="outline">{product.category}</Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Status</p>
              <Badge variant={product.isActive ? "success" : "error"} className={product.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                {product.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          {product.description && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Description</p>
              <p className="text-sm text-gray-700">{product.description}</p>
            </div>
          )}

          {product.disclaimer && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Disclaimer</p>
              <p className="text-sm text-amber-700">{product.disclaimer}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">HSN Number</p>
              <p className="text-sm text-gray-700">{product.hsnNo || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">GST %</p>
              <p className="text-sm text-gray-700">{product.applicableGST ?? "-"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase mb-2">Units & Pricing</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Base Unit:</span>
                <span className="text-sm font-medium">{product.baseUnit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Operational Unit:</span>
                <span className="text-sm font-medium">{product.operationalUnit}</span>
              </div>
              {product.density && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Density:</span>
                  <span className="text-sm font-medium">{product.density} kg/L</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm text-gray-600">Sell Price:</span>
                <span className="text-sm font-medium text-green-600">
                  {product.sellPricePerUnit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {product.minimumStockKG && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Minimum Stock</p>
              <p className="text-sm text-gray-700">{product.minimumStockKG} KG</p>
            </div>
          )}

          {product.openingStockKG != null && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Opening Stock</p>
              <p className="text-sm font-medium text-gray-900">
                {Number(product.openingStockKG).toLocaleString()} {product.baseUnit}
              </p>
            </div>
          )}

          {(product.productType === "MANUFACTURED" || product.productType === "BOTH") && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-2">Composition</p>
              {product.recipeOutputs && product.recipeOutputs.length > 0 ? (
                <div className="space-y-2">
                  {product.recipeOutputs.map((recipe) => (
                    <div key={recipe.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          Output {recipe.outputQuantity} {recipe.outputUnit}
                        </p>
                        {recipe.status && (
                          <Badge variant="outline" className="text-xs">
                            {recipe.status}
                          </Badge>
                        )}
                      </div>
                      {recipe.remarks && (
                        <p className="text-xs text-gray-500 mt-1">{recipe.remarks}</p>
                      )}
                      {recipe.items?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {recipe.items.map((item, index) => (
                            <div key={item.id || `${item.productId}-${index}`} className="flex items-center justify-between rounded bg-white px-2 py-1 text-sm">
                              <span className="text-gray-700">{item.product?.name || item.productId}</span>
                              <span className="font-mono text-gray-600">
                                {item.quantity} {item.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No composition attached yet.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}