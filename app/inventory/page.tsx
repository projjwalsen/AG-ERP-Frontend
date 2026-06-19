"use client";

import * as React from "react";
import { Package, Plus, Search, Edit, Eye, MoreHorizontal, Scale, IndianRupee, Download } from "lucide-react";
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
import { hasModulePermission } from "@/lib/usePermissions";
import { downloadFile } from "@/lib/download";
import { Product } from "@/app/types/product";
import { useRouter } from "next/navigation";

const categoryOptions = [
  "PETROL",
  "DIESEL",
  "LUBRICANT",
  "GREASE",
  "KEROSENE",
  "CNG",
  "LPG",
];

const unitOptions = ["KG", "LTR"] as const;

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
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
    setSelectedProduct(product);
    setEditModalOpen(true);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All Products</h2>
          <p className="text-sm text-gray-500">Manage product information and status</p>
        </div>
        {canWrite && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
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
        <div className="flex items-center gap-2">
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
        </div>
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
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Units</th>
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
                            {product.description && (
                              <p className="text-xs text-gray-500 truncate max-w-xs">{product.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{product.sku}</code>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{product.category}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Scale className="h-3.5 w-3.5 text-gray-400" />
                          {product.baseUnit} / {product.operationalUnit}
                        </div>
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
        <EditProductModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          product={selectedProduct}
        />
      )}

      {selectedProduct && (
        <ViewProductModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          product={selectedProduct}
        />
      )}
    </div>
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
        category: product.category,
        description: product.description || "",
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
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <select
                id="edit-category"
                value={form.category || ""}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select category</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
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
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}