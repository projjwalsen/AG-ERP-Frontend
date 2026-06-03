"use client";

import * as React from "react";
import {
  Package, Search, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, PackageX, Eye, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchInventory } from "@/app/store/inventorySlice";
import { inventoryApi } from "@/app/services/inventory.service";
import { productApi } from "@/app/services/product.service";
import {
  InventoryBatch,
  BatchStatus,
  InventorySummaryRecord,
  ProductBatchHistoryResponse,
} from "@/app/types/inventory";
import { Product } from "@/app/types/product";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/utils";

const batchStatusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "bg-green-100", text: "text-green-700" },
  INACTIVE: { bg: "bg-gray-100", text: "text-gray-600" },
  LOW_STOCK: { bg: "bg-amber-100", text: "text-amber-700" },
  OUT_OF_STOCK: { bg: "bg-red-100", text: "text-red-700" },
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
};

export default function InventoryManagementPage() {
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { batches, isLoading, pagination } = useAppSelector((state) => state.inventory);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [productFilter, setProductFilter] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [products, setProducts] = React.useState<Product[]>([]);

  const [viewModal, setViewModal] = React.useState<{ open: boolean; batch: InventoryBatch | null }>({
    open: false,
    batch: null,
  });

  React.useEffect(() => {
    fetchInventoryData();
  }, [currentPage, productFilter, statusFilter]);

  React.useEffect(() => {
    fetchProducts();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const params: any = { page: currentPage, limit: 10 };
      if (productFilter) params.productId = productFilter;
      if (statusFilter) params.isActive = statusFilter === "ACTIVE" ? true : statusFilter === "INACTIVE" ? false : undefined;
      if (searchTerm) params.search = searchTerm;
      await dispatch(fetchInventory(params)).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch inventory", "error");
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productApi.getActive();
      if (response.success && response.data) {
        setProducts(response.data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchInventoryData();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setProductFilter("");
    setStatusFilter("");
    setCurrentPage(1);
    fetchInventoryData();
  };

  // Calculate summary stats from batches
  const summaryStats = React.useMemo(() => {
    const uniqueProducts = new Set(batches.map((b) => b.productId));
    const activeBatches = batches.filter((b) => b.isActive).length;
    const lowStockItems = batches.filter((b) => {
      if (!b.isActive) return false;
      return b.product?.minimumStockKG && Number(b.availableQtyKG) <= Number(b.product.minimumStockKG);
    }).length;
    const outOfStock = batches.filter((b) => !b.isActive).length;

    return {
      totalProducts: uniqueProducts.size,
      activeBatches,
      lowStockItems,
      outOfStock,
    };
  }, [batches]);

  const filteredBatches = React.useMemo(() => {
    if (!searchTerm && !statusFilter) return batches;
    return batches.filter((b) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !b.product?.name?.toLowerCase().includes(term) &&
          !b.batchNo?.toLowerCase().includes(term) &&
          !b.branch?.name?.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      if (statusFilter) {
        if (statusFilter === "ACTIVE" && !b.isActive) return false;
        if (statusFilter === "INACTIVE" && b.isActive) return false;
      }
      return true;
    });
  }, [batches, searchTerm, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-500 mt-1">
          Track stock levels and inventory status
        </p>
      </div>

      <Tabs defaultValue="product" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6 bg-gray-100">
           <TabsTrigger value="product" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Product-wise
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Batch-wise
          </TabsTrigger>

        </TabsList>

        <TabsContent value="batch">
          <BatchWiseTab />
        </TabsContent>

        <TabsContent value="product">
          <ProductWiseTab />
        </TabsContent>
      </Tabs>

      <ToastContainer />
    </div>
  );
}

// ============== BATCH-WISE TAB (existing functionality) ==============
function BatchWiseTab() {
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { batches, isLoading, pagination } = useAppSelector((state) => state.inventory);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [productFilter, setProductFilter] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [products, setProducts] = React.useState<Product[]>([]);

  const [viewModal, setViewModal] = React.useState<{ open: boolean; batch: InventoryBatch | null }>({
    open: false,
    batch: null,
  });

  React.useEffect(() => {
    fetchInventoryData();
  }, [currentPage, productFilter, statusFilter]);

  React.useEffect(() => {
    fetchProducts();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const params: any = { page: currentPage, limit: 10 };
      if (productFilter) params.productId = productFilter;
      if (statusFilter) params.isActive = statusFilter === "ACTIVE" ? true : statusFilter === "INACTIVE" ? false : undefined;
      if (searchTerm) params.search = searchTerm;
      await dispatch(fetchInventory(params)).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch inventory", "error");
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productApi.getActive();
      if (response.success && response.data) {
        setProducts(response.data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchInventoryData();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setProductFilter("");
    setStatusFilter("");
    setCurrentPage(1);
    fetchInventoryData();
  };

  // Calculate summary stats from batches
  const summaryStats = React.useMemo(() => {
    const uniqueProducts = new Set(batches.map((b) => b.productId));
    const activeBatches = batches.filter((b) => b.isActive).length;
    const lowStockItems = batches.filter((b) => {
      if (!b.isActive) return false;
      return b.product?.minimumStockKG && Number(b.availableQtyKG) <= Number(b.product.minimumStockKG);
    }).length;
    const outOfStock = batches.filter((b) => !b.isActive).length;

    return {
      totalProducts: uniqueProducts.size,
      activeBatches,
      lowStockItems,
      outOfStock,
    };
  }, [batches]);

  const filteredBatches = React.useMemo(() => {
    if (!searchTerm && !statusFilter) return batches;
    return batches.filter((b) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !b.product?.name?.toLowerCase().includes(term) &&
          !b.batchNo?.toLowerCase().includes(term) &&
          !b.branch?.name?.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      if (statusFilter) {
        if (statusFilter === "ACTIVE" && !b.isActive) return false;
        if (statusFilter === "INACTIVE" && b.isActive) return false;
      }
      return true;
    });
  }, [batches, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Products"
          value={summaryStats.totalProducts}
          icon={<Package className="h-5 w-5" />}
          color="blue"
        />
        <SummaryCard
          title="Active Batches"
          value={summaryStats.activeBatches}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
        <SummaryCard
          title="Low Stock Items"
          value={summaryStats.lowStockItems}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="amber"
          warning={summaryStats.lowStockItems > 0}
        />
        <SummaryCard
          title="Out of Stock"
          value={summaryStats.outOfStock}
          icon={<PackageX className="h-5 w-5" />}
          color="red"
          warning={summaryStats.outOfStock > 0}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>

        <select
          value={productFilter}
          onChange={(e) => {
            setProductFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchInventoryData()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {(searchTerm || productFilter || statusFilter) && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredBatches.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Batch No</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Available KG</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Available LTR</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Purchase Price</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBatches.map((batch) => {
                    const isLowStock = batch.isActive &&
                      batch.product?.minimumStockKG &&
                      Number(batch.availableQtyKG) <= Number(batch.product.minimumStockKG);
                    const isOutOfStock = !batch.isActive;

                    return (
                      <tr key={batch.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                              <Package className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{batch.product?.name || "-"}</p>
                              {batch.product?.sku && (
                                <p className="text-xs text-gray-400 font-mono">{batch.product.sku}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm">{batch.batchNo || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{batch.branch?.name || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${
                              isOutOfStock ? "text-red-600" :
                              isLowStock ? "text-amber-600" :
                              "text-gray-900"
                            }`}>
                              {Number(batch.availableQtyKG).toFixed(2)} KG
                            </span>
                            {isLowStock && (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            {isOutOfStock && (
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">
                            {Number(batch.availableQtyLTR).toFixed(2)} LTR
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{formatCurrency(batch.purchasePrice)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isOutOfStock ? batchStatusColors["OUT_OF_STOCK"]?.bg :
                            isLowStock ? batchStatusColors["LOW_STOCK"]?.bg :
                            batchStatusColors["ACTIVE"]?.bg
                          } ${
                            isOutOfStock ? batchStatusColors["OUT_OF_STOCK"]?.text :
                            isLowStock ? batchStatusColors["LOW_STOCK"]?.text :
                            batchStatusColors["ACTIVE"]?.text
                          }`}>
                            {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(batch.lastUpdated || batch.updatedAt || batch.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                            onClick={() => setViewModal({ open: true, batch })}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No inventory records found</p>
            <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* View Batch Modal */}
      <Dialog open={viewModal.open} onOpenChange={(isOpen) => !isOpen && setViewModal({ open: false, batch: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Batch Details
            </DialogTitle>
          </DialogHeader>

          {viewModal.batch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Product</p>
                  <p className="font-medium">{viewModal.batch.product?.name || "-"}</p>
                  {viewModal.batch.product?.sku && (
                    <p className="text-xs text-gray-400 font-mono">{viewModal.batch.product.sku}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Batch Number</p>
                  <p className="font-mono font-medium">{viewModal.batch.batchNo || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Branch</p>
                  <p className="font-medium">{viewModal.batch.branch?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    !viewModal.batch.isActive ? batchStatusColors["OUT_OF_STOCK"]?.bg :
                    viewModal.batch.product?.minimumStockKG && Number(viewModal.batch.availableQtyKG) <= Number(viewModal.batch.product.minimumStockKG)
                      ? batchStatusColors["LOW_STOCK"]?.bg
                      : batchStatusColors["ACTIVE"]?.bg
                  } ${
                    !viewModal.batch.isActive ? batchStatusColors["OUT_OF_STOCK"]?.text :
                    viewModal.batch.product?.minimumStockKG && Number(viewModal.batch.availableQtyKG) <= Number(viewModal.batch.product.minimumStockKG)
                      ? batchStatusColors["LOW_STOCK"]?.text
                      : batchStatusColors["ACTIVE"]?.text
                  }`}>
                    {!viewModal.batch.isActive ? "Out of Stock" :
                     viewModal.batch.product?.minimumStockKG && Number(viewModal.batch.availableQtyKG) <= Number(viewModal.batch.product.minimumStockKG)
                      ? "Low Stock" : "Active"}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Available KG</p>
                    <p className={`text-lg font-semibold ${
                      !viewModal.batch.isActive ? "text-red-600" :
                      viewModal.batch.product?.minimumStockKG && Number(viewModal.batch.availableQtyKG) <= Number(viewModal.batch.product.minimumStockKG) ? "text-amber-600" :
                      "text-gray-900"
                    }`}>
                      {Number(viewModal.batch.availableQtyKG).toFixed(2)} KG
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Available LTR</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {Number(viewModal.batch.availableQtyLTR).toFixed(2)} LTR
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Purchase Price</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(viewModal.batch.purchasePrice)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Min Stock Level</p>
                    <p className="font-medium">
                      {viewModal.batch.product?.minimumStockKG
                        ? `${viewModal.batch.product.minimumStockKG} ${viewModal.batch.product.baseUnit || "KG"}`
                        : "Not Set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Stock Value</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(Number(viewModal.batch.availableQtyKG) * viewModal.batch.purchasePrice)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Created At</p>
                    <p className="text-gray-700">{formatDate(viewModal.batch.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Last Updated</p>
                    <p className="text-gray-700">{formatDate(viewModal.batch.lastUpdated || viewModal.batch.updatedAt || viewModal.batch.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModal({ open: false, batch: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== PRODUCT-WISE TAB (uses /api/inventory/summary) ==============
function ProductWiseTab() {
  const { addToast } = useToast();
  const [summary, setSummary] = React.useState<InventorySummaryRecord[]>([]);
  const [pagination, setPagination] = React.useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");

  const [historyModal, setHistoryModal] = React.useState<{
    open: boolean;
    productId: string | null;
    productName: string | null;
    data: ProductBatchHistoryResponse | null;
    loading: boolean;
  }>({ open: false, productId: null, productName: null, data: null, loading: false });

  React.useEffect(() => {
    fetchSummary(currentPage, searchTerm, statusFilter);
  }, [currentPage, statusFilter]);

  const fetchSummary = async (
    page: number,
    search?: string,
    status?: string
  ) => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (status) params.status = status;
      const response = await inventoryApi.getSummary(params);
      if (response.success && response.data) {
        setSummary(response.data.data || []);
        setPagination(response.data.meta || null);
      } else {
        setSummary([]);
        setPagination(null);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to fetch inventory summary", "error");
      setSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchSummary(1, searchTerm, statusFilter);
  };

  const handleClear = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCurrentPage(1);
    fetchSummary(1, "", "");
  };

  const handleViewHistory = async (productId: string, productName: string) => {
    setHistoryModal({ open: true, productId, productName, data: null, loading: true });
    try {
      const response = await inventoryApi.getProductBatchHistory(productId);
      if (response.success && response.data) {
        setHistoryModal((prev) => ({ ...prev, data: response.data!, loading: false }));
      } else {
        addToast(response.message || "Failed to fetch batch history", "error");
        setHistoryModal({ open: false, productId: null, productName: null, data: null, loading: false });
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to fetch batch history", "error");
      setHistoryModal({ open: false, productId: null, productName: null, data: null, loading: false });
    }
  };

  const closeHistoryModal = () => {
    setHistoryModal({ open: false, productId: null, productName: null, data: null, loading: false });
  };

  const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
    IN_STOCK: { bg: "bg-green-100", text: "text-green-700", label: "In Stock" },
    LOW_STOCK: { bg: "bg-amber-100", text: "text-amber-700", label: "Low Stock" },
    OUT_OF_STOCK: { bg: "bg-red-100", text: "text-red-700", label: "Out of Stock" },
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Status</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchSummary(currentPage, searchTerm, statusFilter)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {(searchTerm || statusFilter) && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Product-wise Table */}
      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : summary.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Stock (KG)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Stock (LTR)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Min Stock (KG)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branches</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.map((row) => {
                    const status = statusBadge[row.status] || statusBadge.IN_STOCK;
                    return (
                      <tr key={row.productId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-purple-100 rounded-lg">
                              <Package className="h-3.5 w-3.5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{row.name || "-"}</p>
                              {row.density && (
                                <p className="text-xs text-gray-400">Density: {row.density}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            {row.sku || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {Number(row.totalStockKG || 0).toFixed(2)} KG
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-700">
                            {Number(row.totalStockLTR || 0).toFixed(2)} LTR
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-700">
                            {row.minimumStockKG || "-"} KG
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            {row.branchCount ?? 0} {row.branchCount === 1 ? "branch" : "branches"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleViewHistory(row.productId, row.name || "")}
                          >
                            <Eye className="h-4 w-4" />
                            View Batches
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
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
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No inventory summary found</p>
            {(searchTerm || statusFilter) && (
              <Button variant="outline" className="mt-4" onClick={handleClear}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Batch History Modal */}
      <Dialog open={historyModal.open} onOpenChange={(isOpen) => !isOpen && closeHistoryModal()}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Batch-wise History
              {historyModal.productName && (
                <span className="text-sm text-gray-500 font-normal">
                  — {historyModal.productName}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              All batches of this product across branches
            </DialogDescription>
          </DialogHeader>

          {historyModal.loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : historyModal.data ? (
            <div className="space-y-6">
              {/* Product info card */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Product</p>
                    <p className="font-medium">{historyModal.data.product.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">SKU</p>
                    <p className="font-mono text-sm">{historyModal.data.product.sku || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">HSN</p>
                    <p className="font-mono text-sm">{historyModal.data.product.hsnNo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Density</p>
                    <p className="text-sm">{historyModal.data.product.density || "-"}</p>
                  </div>
                </div>
              </div>

              {historyModal.data.branches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No branches have batches of this product.
                </div>
              ) : (
                historyModal.data.branches.map((branch) => (
                  <div key={branch.branchId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        {branch.branchName}
                        <span className="text-xs text-gray-400 font-mono font-normal">
                          ({branch.branchCode})
                        </span>
                      </h4>
                      <span className="text-xs text-gray-500">
                        {branch.batches.length} {branch.batches.length === 1 ? "batch" : "batches"}
                      </span>
                    </div>
                    {(branch.city || branch.state) && (
                      <p className="text-xs text-gray-500 mb-3">
                        {[branch.addressLine1, branch.addressLine2, branch.city, branch.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Batch No</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Avl. KG</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Avl. LTR</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Purchase Price</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Created</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {branch.batches.map((batch) => (
                            <tr key={batch.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono font-medium">{batch.batchNo}</td>
                              <td className="px-3 py-2 text-right">
                                <span className="font-semibold text-gray-900">
                                  {Number(batch.availableQtyKG || 0).toFixed(2)} KG
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className="text-gray-700">
                                  {Number(batch.availableQtyLTR || 0).toFixed(2)} LTR
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(Number(batch.purchasePrice) || 0)}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    batch.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {batch.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-500">
                                {formatDateTime(batch.createdAt)}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-500">
                                {batch.lastUpdated ? formatDateTime(batch.lastUpdated) : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeHistoryModal}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== SUMMARY CARD COMPONENT ==============
function SummaryCard({
  title,
  value,
  icon,
  color,
  warning = false,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "amber" | "red";
  warning?: boolean;
}) {
  const colorClasses = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600", value: "text-blue-700" },
    green: { bg: "bg-green-50", icon: "text-green-600", value: "text-green-700" },
    amber: { bg: "bg-amber-50", icon: "text-amber-600", value: "text-amber-700" },
    red: { bg: "bg-red-50", icon: "text-red-600", value: "text-red-700" },
  };

  return (
    <Card className={warning ? "border-amber-200" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`text-2xl font-bold ${colorClasses[color].value}`}>{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color].bg} ${warning ? "animate-pulse" : ""}`}>
            <div className={colorClasses[color].icon}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}