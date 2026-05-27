"use client";

import * as React from "react";
import {
  ShoppingCart, Receipt, Search, Plus, Eye, CheckCircle, XCircle,
  Package, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchAllPurchases, createPurchase, approvePurchase, rejectPurchase } from "@/app/store/purchasesSlice";
import { fetchAllSales, createSale, approveSale, rejectSale } from "@/app/store/salesSlice";
import { agencyApi } from "@/app/services/agency.service";
import { productApi } from "@/app/services/product.service";
import { branchApi } from "@/app/services/branch.service";
import { inventoryApi } from "@/app/services/inventory.service";
import { purchaseApi } from "@/app/services/purchase.service";
import { salesApi } from "@/app/services/sales.service";
import { Purchase } from "@/app/types/purchase";
import { Sales } from "@/app/types/sales";
import { Agency } from "@/app/types/agency";
import { Product } from "@/app/types/product";
import { Branch } from "@/app/types/branch";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";

const statusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-amber-100", text: "text-amber-700" },
  APPROVED: { bg: "bg-green-100", text: "text-green-700" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700" },
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export default function PurchaseSalesPage() {
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchase & Sales</h1>
        <p className="text-gray-500 mt-1">
          Manage purchase orders, sales invoices, and approvals
        </p>
      </div>

      <Tabs defaultValue="purchase" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6 bg-gray-100">
          <TabsTrigger value="purchase" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Purchase
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Sales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchase">
          <PurchaseTab />
        </TabsContent>

        <TabsContent value="sales">
          <SalesTab />
        </TabsContent>
      </Tabs>

      <ToastContainer />
    </div>
  );
}

// ============== PURCHASE TAB ==============
function PurchaseTab() {
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { purchases, isLoading, pagination } = useAppSelector((state) => state.purchases);
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);

  // Permission checks
  const canPurchaseView = hasModulePermission(userPermissions, "PURCHASE", "VIEW");
  const canPurchaseWrite = hasModulePermission(userPermissions, "PURCHASE", "WRITE");
  const canPurchaseApprove = hasModulePermission(userPermissions, "PURCHASE", "APPROVE");

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [showForm, setShowForm] = React.useState(false);
  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);

  const [approvalModal, setApprovalModal] = React.useState<{ open: boolean; purchase: Purchase | null }>({
    open: false,
    purchase: null,
  });
  const [rejectModal, setRejectModal] = React.useState<{ open: boolean; purchase: Purchase | null }>({
    open: false,
    purchase: null,
  });
  const [viewModal, setViewModal] = React.useState<{ open: boolean; purchase: Purchase | null }>({
    open: false,
    purchase: null,
  });
  const [viewLoading, setViewLoading] = React.useState(false);
  const [remarks, setRemarks] = React.useState("");
  const [rejectionRemarks, setRejectionRemarks] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  // Form data - matches backend API
  const [formData, setFormData] = React.useState({
    agencyId: "",
    branchId: "",
    invoiceNo: "",
    productId: "",
    batchNo: "",
    quantity: "",
    unit: "KG" as "KG" | "LTR",
    purchasePrice: "",
    remarks: "",
  });

  React.useEffect(() => {
    fetchPurchases(currentPage, statusFilter);
    fetchBranches();
  }, [currentPage, statusFilter]);

  const fetchPurchases = async (page = currentPage, status?: string) => {
    try {
      const params: any = { page, limit: 10 };
      if (status) params.status = status;
      await dispatch(fetchAllPurchases(params)).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch purchases", "error");
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await branchApi.getActive();
      if (response.success && response.data) {
        setBranches(response.data.branches || []);
      }
    } catch (err) {
      console.error("Failed to fetch branches", err);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await agencyApi.getAll();
      if (response.success && response.data) {
        const vendorAgencies = response.data.agencies.filter(
          (a) => a.type === "VENDOR" || a.type === "BOTH"
        );
        setAgencies(vendorAgencies);
      }
    } catch (err) {
      console.error("Failed to fetch vendors", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productApi.getActive();
      if (response.success && response.data) {
        setProducts(Array.isArray(response.data.products) ? response.data.products : []);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const handleOpenForm = async () => {
    setShowForm(true);
    await fetchBranches();
    await fetchVendors();
    await fetchProducts();
    setFormData({
      agencyId: "",
      branchId: "",
      invoiceNo: "",
      productId: "",
      batchNo: "",
      quantity: "",
      unit: "KG",
      purchasePrice: "",
      remarks: "",
    });
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agencyId || !formData.branchId || !formData.productId || !formData.batchNo || !formData.quantity || !formData.purchasePrice) {
      addToast("Please fill all required fields", "error");
      return;
    }

    setActionLoading(true);
    try {
      await dispatch(
        createPurchase({
          agencyId: formData.agencyId,
          branchId: formData.branchId,
          invoiceNo: formData.invoiceNo || `PI-${Date.now()}`,
          items: [
            {
              productId: formData.productId,
              batchNo: formData.batchNo,
              quantity: Number(formData.quantity),
              unit: formData.unit,
              purchasePrice: Number(formData.purchasePrice),
            },
          ],
          remarks: formData.remarks,
        })
      ).unwrap();

      // Close modal first
      setShowForm(false);

      // Reset form
      setCurrentPage(1);
      setFormData({
        agencyId: "",
        branchId: "",
        invoiceNo: "",
        productId: "",
        batchNo: "",
        quantity: "",
        unit: "KG",
        purchasePrice: "",
        remarks: "",
      });

      // Show success toast
      addToast("Purchase created successfully", "success");

      // Force refresh by dispatching fetchAllPurchases
      await dispatch(fetchAllPurchases({ page: 1, limit: 10 })).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to create purchase", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approvalModal.purchase) return;
    setActionLoading(true);
    try {
      await dispatch(
        approvePurchase({
          purchaseId: approvalModal.purchase.id,
        })
      ).unwrap();

      // Close modal first
      setApprovalModal({ open: false, purchase: null });
      setRemarks("");

      // Show success toast
      addToast("Purchase approved successfully", "success");

      // Force refresh
      await dispatch(fetchAllPurchases({ page: currentPage, limit: 10 })).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to approve purchase", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.purchase || !rejectionRemarks) {
      addToast("Please provide rejection reason", "error");
      return;
    }
    setActionLoading(true);
    try {
      await dispatch(
        rejectPurchase({
          purchaseId: rejectModal.purchase.id,
          remarks: rejectionRemarks,
        })
      ).unwrap();

      // Close modal first
      setRejectModal({ open: false, purchase: null });
      setRejectionRemarks("");

      // Show success toast
      addToast("Purchase rejected", "success");

      // Force refresh
      await dispatch(fetchAllPurchases({ page: currentPage, limit: 10 })).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to reject purchase", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewPurchase = async (purchase: Purchase) => {
    setViewLoading(true);
    setViewModal({ open: true, purchase: null }); // Clear previous
    try {
      const response = await purchaseApi.getById(purchase.id);
      if (response.success && response.data) {
        setViewModal({ open: true, purchase: response.data });
      } else {
        addToast(response.message || "Failed to fetch purchase details", "error");
        setViewModal({ open: false, purchase: null });
      }
    } catch (err: any) {
      addToast(err || "Failed to fetch purchase details", "error");
      setViewModal({ open: false, purchase: null });
    } finally {
      setViewLoading(false);
    }
  };

  const filteredPurchases = React.useMemo(() => {
    if (!searchTerm) return purchases;
    const term = searchTerm.toLowerCase();
    return purchases.filter(
      (p) =>
        p.invoiceNo?.toLowerCase().includes(term) ||
        p.agency?.name?.toLowerCase().includes(term) ||
        p.items.some((item) => item.product?.name?.toLowerCase().includes(term))
    );
  }, [purchases, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Purchase Orders</h2>
          <p className="text-sm text-gray-500">Manage vendor purchases and approvals</p>
        </div>
        {canPurchaseWrite && (
          <Button onClick={handleOpenForm} className="gap-2">
            <Plus className="h-4 w-4" />
            New Purchase
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search purchases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => fetchPurchases(currentPage, statusFilter)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

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
      ) : filteredPurchases.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agency</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created At</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium">{purchase.invoiceNo || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Package className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium">{purchase.agency?.name || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {purchase.items[0]?.product?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-mono">{purchase.items[0]?.batchNo || "-"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {Number(purchase.items[0]?.quantity || 0)} {purchase.items[0]?.unit || "KG"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatCurrency(Number(purchase.items[0]?.purchasePrice) || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[purchase.status]?.bg} ${statusColors[purchase.status]?.text}`}>
                          {statusLabels[purchase.status] || purchase.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateTime(purchase.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {purchase.status === "PENDING" && canPurchaseApprove && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setApprovalModal({ open: true, purchase })}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setRejectModal({ open: true, purchase })}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canPurchaseView && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                              onClick={() => handleViewPurchase(purchase)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
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
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No purchase orders found</p>
          </CardContent>
        </Card>
      )}

      {/* Create Purchase Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              New Purchase Order
            </DialogTitle>
            <DialogDescription>Create a new purchase order from vendor.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPurchase} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase-invoice">Invoice Number</Label>
                <Input
                  id="purchase-invoice"
                  value={formData.invoiceNo}
                  onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-branch">Branch *</Label>
                <select
                  id="purchase-branch"
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase-agency">Vendor *</Label>
              <select
                id="purchase-agency"
                value={formData.agencyId}
                onChange={(e) => setFormData({ ...formData, agencyId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select Vendor</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>{agency.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase-product">Product *</Label>
              <select
                id="purchase-product"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select Product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase-batch">Batch Number *</Label>
                <Input
                  id="purchase-batch"
                  value={formData.batchNo}
                  onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  placeholder="e.g., BATCH-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-quantity">Quantity *</Label>
                <Input
                  id="purchase-quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase-unit">Unit *</Label>
                <select
                  id="purchase-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as "KG" | "LTR" })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="KG">KG</option>
                  <option value="LTR">LTR</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-price">Purchase Price * (Unit Price)</Label>
                <Input
                  id="purchase-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase-remarks">Remarks</Label>
              <Textarea
                id="purchase-remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional remarks"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={actionLoading}>Create Purchase</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval Modal */}
      <Dialog open={approvalModal.open} onOpenChange={(isOpen) => !isOpen && setApprovalModal({ open: false, purchase: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Approve Purchase
            </DialogTitle>
            <DialogDescription>
              Approve purchase from {approvalModal.purchase?.agency?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice:</span>
              <span className="font-medium">{approvalModal.purchase?.invoiceNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount:</span>
              <span className="font-medium">
                {formatCurrency(
                  Number(approvalModal.purchase?.items[0]?.quantity || 0) *
                  Number(approvalModal.purchase?.items[0]?.purchasePrice || 0)
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="approve-remarks">Remarks (Optional)</Label>
            <Textarea
              id="approve-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any remarks..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApprovalModal({ open: false, purchase: null })}>Cancel</Button>
            <Button onClick={handleApprove} loading={actionLoading} className="bg-green-600 hover:bg-green-700">Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModal.open} onOpenChange={(isOpen) => !isOpen && setRejectModal({ open: false, purchase: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Purchase
            </DialogTitle>
            <DialogDescription>
              Reject purchase from {rejectModal.purchase?.agency?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice:</span>
              <span className="font-medium">{rejectModal.purchase?.invoiceNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount:</span>
              <span className="font-medium">
                {formatCurrency(
                  Number(rejectModal.purchase?.items[0]?.quantity || 0) *
                  Number(rejectModal.purchase?.items[0]?.purchasePrice || 0)
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection Reason *</Label>
            <Textarea
              id="reject-reason"
              value={rejectionRemarks}
              onChange={(e) => setRejectionRemarks(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
              required
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectModal({ open: false, purchase: null })}>Cancel</Button>
            <Button onClick={handleReject} loading={actionLoading} variant="destructive">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Purchase Modal */}
      <Dialog open={viewModal.open} onOpenChange={(isOpen) => !isOpen && setViewModal({ open: false, purchase: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Purchase Details
            </DialogTitle>
          </DialogHeader>

          {viewLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : viewModal.purchase ? (
            <div className="space-y-6">
              {/* Invoice Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Invoice No</p>
                    <p className="font-mono font-medium">{viewModal.purchase.invoiceNo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Status</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[viewModal.purchase.status]?.bg} ${statusColors[viewModal.purchase.status]?.text}`}>
                      {statusLabels[viewModal.purchase.status] || viewModal.purchase.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Created At</p>
                    <p className="font-medium">{formatDateTime(viewModal.purchase.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Updated At</p>
                    <p className="font-medium">{formatDateTime(viewModal.purchase.updatedAt!)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Branch</p>
                    <p className="font-medium">{viewModal.purchase.branch?.name || "-"}</p>
                    <p className="text-xs text-gray-400">{viewModal.purchase.branch?.code || "-"}</p>
                  </div>
                  {viewModal.purchase.approvedAt && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Approved At</p>
                      <p className="font-medium">{formatDateTime(viewModal.purchase.approvedAt!)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Branch Details */}
              {viewModal.purchase.branch && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Branch Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Name</p>
                      <p className="font-medium">{viewModal.purchase.branch.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Code</p>
                      <p className="font-mono text-sm">{viewModal.purchase.branch.code || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">GSTIN</p>
                      <p className="font-mono text-sm">{viewModal.purchase.branch.gstin || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">State</p>
                      <p className="font-medium">{viewModal.purchase.branch.state || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">City</p>
                      <p className="font-medium">{viewModal.purchase.branch.city || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Phone</p>
                      <p className="font-medium">{viewModal.purchase.branch.phnNumber || "-"}</p>
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <p className="text-xs text-gray-500 uppercase">Address</p>
                      <p className="text-sm">
                        {[viewModal.purchase.branch.addressLine1, viewModal.purchase.branch.addressLine2].filter(Boolean).join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Agency Details */}
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Vendor Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Name</p>
                    <p className="font-medium">{viewModal.purchase.agency?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Type</p>
                    <p className="font-medium">{viewModal.purchase.agency?.type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">GSTIN</p>
                    <p className="font-mono text-sm">{viewModal.purchase.agency?.gstin || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Contact Person</p>
                    <p className="font-medium">{viewModal.purchase.agency?.contactPerson || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Mobile</p>
                    <p className="font-medium">{viewModal.purchase.agency?.mobileNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Email</p>
                    <p className="text-sm">{viewModal.purchase.agency?.email || "-"}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-xs text-gray-500 uppercase">Address</p>
                    <p className="text-sm">
                      {[viewModal.purchase.agency?.addressLine1, viewModal.purchase.agency?.addressLine2, viewModal.purchase.agency?.city, viewModal.purchase.agency?.state, viewModal.purchase.agency?.pinCode].filter(Boolean).join(", ") || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Items</h4>
                {viewModal.purchase.items?.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4 mb-3 last:mb-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Product</p>
                        <p className="font-medium">{item.product?.name || "-"}</p>
                        <p className="text-xs text-gray-500">{item.product?.sku || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Batch No</p>
                        <p className="font-mono font-medium">{item.batchNo || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Quantity</p>
                        <p className="font-medium">{item.quantity} {item.unit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Purchase Price</p>
                        <p className="font-medium">{formatCurrency(Number(item.purchasePrice) || 0)}</p>
                      </div>
                    </div>
                    {item.product && (
                      <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">HSN</p>
                          <p className="text-sm">{item.product.hsnNo || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">GST %</p>
                          <p className="text-sm">{item.product.applicableGST || "-"}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Density</p>
                          <p className="text-sm">{item.product.density || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Amount</p>
                          <p className="font-semibold text-green-600">{formatCurrency(Number(item.quantity) * Number(item.purchasePrice))}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Created & Approved Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="text-xs text-gray-500 uppercase mb-2">Created By</h4>
                  <p className="font-medium">{viewModal.purchase.createdBy?.name || "-"}</p>
                  <p className="text-sm text-gray-500">{viewModal.purchase.createdBy?.email || "-"}</p>
                  {viewModal.purchase.createdAt && (
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(viewModal.purchase.createdAt!)}</p>
                  )}
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="text-xs text-gray-500 uppercase mb-2">Approved By</h4>
                  {viewModal.purchase.approvedBy ? (
                    <>
                      <p className="font-medium">{viewModal.purchase.approvedBy.name || "-"}</p>
                      <p className="text-sm text-gray-500">{viewModal.purchase.approvedBy.email || "-"}</p>
                      {viewModal.purchase.approvedAt && (
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(viewModal.purchase.approvedAt!)}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Not approved yet</p>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {viewModal.purchase.remarks && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-xs text-gray-500 uppercase mb-2">Remarks</h4>
                  <p className="text-sm">{viewModal.purchase.remarks}</p>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewModal({ open: false, purchase: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== SALES TAB ==============
function SalesTab() {
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { sales, isLoading, pagination } = useAppSelector((state) => state.sales);
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);

  // Permission checks
  const canSaleView = hasModulePermission(userPermissions, "SALE", "VIEW");
  const canSaleWrite = hasModulePermission(userPermissions, "SALE", "WRITE");
  const canSaleApprove = hasModulePermission(userPermissions, "SALE", "APPROVE");

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [showForm, setShowForm] = React.useState(false);
  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [availableBatches, setAvailableBatches] = React.useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = React.useState(false);

  const [approvalModal, setApprovalModal] = React.useState<{ open: boolean; sale: Sales | null }>({
    open: false,
    sale: null,
  });
  const [rejectModal, setRejectModal] = React.useState<{ open: boolean; sale: Sales | null }>({
    open: false,
    sale: null,
  });
  const [viewModal, setViewModal] = React.useState<{ open: boolean; sale: Sales | null }>({
    open: false,
    sale: null,
  });
  const [viewLoading, setViewLoading] = React.useState(false);
  const [remarks, setRemarks] = React.useState("");
  const [rejectionRemarks, setRejectionRemarks] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  // Form data - matches backend API
  const [formData, setFormData] = React.useState({
    agencyId: "",
    branchId: "",
    productId: "",
    batchId: "",
    quantity: "",
    unit: "KG" as "KG" | "LTR",
    remarks: "",
  });

  React.useEffect(() => {
    fetchSales(currentPage, statusFilter);
    fetchBranches();
  }, [currentPage, statusFilter]);

  const fetchSales = async (page = currentPage, status?: string) => {
    try {
      const params: any = { page, limit: 10 };
      if (status) params.status = status;
      await dispatch(fetchAllSales(params)).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch sales", "error");
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await branchApi.getActive();
      if (response.success && response.data) {
        setBranches(response.data.branches || []);
      }
    } catch (err) {
      console.error("Failed to fetch branches", err);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await agencyApi.getAll();
      if (response.success && response.data) {
        const clientAgencies = response.data.agencies.filter(
          (a) => a.type === "CLIENT" || a.type === "BOTH"
        );
        setAgencies(clientAgencies);
      }
    } catch (err) {
      console.error("Failed to fetch clients", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productApi.getActive();
      if (response.success && response.data) {
        setProducts(Array.isArray(response.data.products) ? response.data.products : []);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const fetchAvailableBatches = async (branchId: string, productId: string) => {
    if (!productId || !branchId) return;
    setLoadingBatches(true);
    setAvailableBatches([]); // Clear previous
    try {
      const response = await inventoryApi.getAvailableBatches({
        productId,
        branchId,
      });
      console.log("Batches API response:", response);
      console.log("Response data:", response.data);
      console.log("Data type:", typeof response.data);
      console.log("Is array:", Array.isArray(response.data));

      if (response.success) {
        // The backend returns { success, message, data } where data is the batch array directly
        const batches = response.data || [];
        console.log("All batches received:", batches);

        // Filter to show only batches with stock
        const filtered = batches.filter((b: any) => {
          const qtyKG = Number(b.availableQtyKG) || 0;
          const qtyLTR = Number(b.availableQtyLTR) || 0;
          return qtyKG > 0 || qtyLTR > 0;
        });
        console.log("Filtered batches (with stock):", filtered);

        setAvailableBatches(filtered);
        if (filtered.length > 0) {
          setFormData((prev) => ({
            ...prev,
            batchId: filtered[0].id,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleOpenForm = async () => {
    setShowForm(true);
    await fetchBranches();
    await fetchClients();
    await fetchProducts();
    setAvailableBatches([]);
    setFormData({
      agencyId: "",
      branchId: "",
      productId: "",
      batchId: "",
      quantity: "",
      unit: "KG",
      remarks: "",
    });
  };

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agencyId || !formData.branchId || !formData.productId || !formData.batchId || !formData.quantity) {
      addToast("Please fill all required fields", "error");
      return;
    }

    const selectedBatch = availableBatches.find((b) => b.id === formData.batchId);
    if (selectedBatch && Number(formData.quantity) > selectedBatch.quantity) {
      addToast(`Quantity exceeds available stock (${selectedBatch.quantity})`, "error");
      return;
    }

    setActionLoading(true);
    try {
      await dispatch(
        createSale({
          agencyId: formData.agencyId,
          branchId: formData.branchId,
          items: [
            {
              productId: formData.productId,
              batchId: formData.batchId,
              quantity: Number(formData.quantity),
              unit: formData.unit,
            },
          ],
          remarks: formData.remarks,
        })
      ).unwrap();

      // Close modal first
      setShowForm(false);

      // Reset form
      setCurrentPage(1);
      setFormData({
        agencyId: "",
        branchId: "",
        productId: "",
        batchId: "",
        quantity: "",
        unit: "KG",
        remarks: "",
      });
      setAvailableBatches([]);

      // Show success toast
      addToast("Sales invoice created successfully", "success");

      // Force refresh
      await dispatch(fetchAllSales({ page: 1, limit: 10 })).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to create sales invoice", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approvalModal.sale) return;
    setActionLoading(true);
    try {
      await dispatch(
        approveSale({
          saleId: approvalModal.sale.id,
          remarks,
        })
      ).unwrap();

      // Close modal first
      setApprovalModal({ open: false, sale: null });
      setRemarks("");

      // Show success toast
      addToast("Sales approved successfully", "success");

      // Force refresh
      await dispatch(fetchAllSales({ page: currentPage, limit: 10 })).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to approve sale", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.sale || !rejectionRemarks) {
      addToast("Please provide rejection reason", "error");
      return;
    }
    setActionLoading(true);
    try {
      await dispatch(
        rejectSale({
          saleId: rejectModal.sale.id,
          remarks: rejectionRemarks,
        })
      ).unwrap();

      // Close modal first
      setRejectModal({ open: false, sale: null });
      setRejectionRemarks("");

      // Show success toast
      addToast("Sales rejected", "success");

      // Force refresh
      await dispatch(fetchAllSales({ page: currentPage, limit: 10 })).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to reject sale", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewSale = async (sale: Sales) => {
    setViewLoading(true);
    setViewModal({ open: true, sale: null }); // Clear previous
    try {
      const response = await salesApi.getById(sale.id);
      if (response.success && response.data) {
        setViewModal({ open: true, sale: response.data });
      } else {
        addToast(response.message || "Failed to fetch sale details", "error");
        setViewModal({ open: false, sale: null });
      }
    } catch (err: any) {
      addToast(err || "Failed to fetch sale details", "error");
      setViewModal({ open: false, sale: null });
    } finally {
      setViewLoading(false);
    }
  };

  const filteredSales = React.useMemo(() => {
    if (!searchTerm) return sales;
    const term = searchTerm.toLowerCase();
    return sales.filter(
      (s) =>
        s.invoiceNo?.toLowerCase().includes(term) ||
        s.agency?.name?.toLowerCase().includes(term) ||
        s.items.some((item) => item.product?.name?.toLowerCase().includes(term))
    );
  }, [sales, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sales Invoices</h2>
          <p className="text-sm text-gray-500">Manage client sales and approvals</p>
        </div>
        {canSaleWrite && (
          <Button onClick={handleOpenForm} className="gap-2">
            <Plus className="h-4 w-4" />
            New Sale
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => fetchSales(currentPage, statusFilter)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

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
      ) : filteredSales.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {/* <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice No</th> */}
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created At</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      {/* <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium">{sale.invoiceNo || "-"}</span>
                      </td> */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <Receipt className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <span className="text-sm font-medium">{sale.agency?.name || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {sale.items[0]?.product?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-mono">{sale.items[0]?.batch?.batchNo || "-"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {sale.items[0]?.quantity || 0} {sale.items[0]?.unit || "KG"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[sale.status]?.bg} ${statusColors[sale.status]?.text}`}>
                          {statusLabels[sale.status] || sale.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateTime(sale.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {sale.status === "PENDING" && canSaleApprove && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setApprovalModal({ open: true, sale })}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setRejectModal({ open: true, sale })}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canSaleView && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                              onClick={() => handleViewSale(sale)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
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
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No sales invoices found</p>
          </CardContent>
        </Card>
      )}

      {/* Create Sales Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              New Sales Invoice
            </DialogTitle>
            <DialogDescription>Create a new sales invoice for client.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitSale} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sales-branch">Branch *</Label>
              <select
                id="sales-branch"
                value={formData.branchId}
                onChange={(e) => {
                  setFormData({ ...formData, branchId: e.target.value, batchId: "", productId: "" });
                  setAvailableBatches([]);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales-agency">Client *</Label>
              <select
                id="sales-agency"
                value={formData.agencyId}
                onChange={(e) => setFormData({ ...formData, agencyId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select Client</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>{agency.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales-product">Product *</Label>
              <select
                id="sales-product"
                value={formData.productId}
                onChange={(e) => {
                  const newProductId = e.target.value;
                  setFormData((prev) => ({ ...prev, productId: newProductId, batchId: "" }));
                  if (formData.branchId && newProductId) {
                    fetchAvailableBatches(formData.branchId, newProductId);
                  }
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                disabled={!formData.branchId}
              >
                <option value="">Select Product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales-batch">Batch *</Label>
              <select
                id="sales-batch"
                value={formData.batchId}
                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                disabled={!formData.productId || !formData.branchId || loadingBatches}
              >
                <option value="">Select Batch</option>
                {availableBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchNo} - KG: {Number(batch.availableQtyKG).toFixed(2)} | LTR: {Number(batch.availableQtyLTR).toFixed(2)}
                  </option>
                ))}
              </select>
              {loadingBatches && <p className="text-xs text-gray-500">Loading batches...</p>}
              {!loadingBatches && formData.productId && formData.branchId && availableBatches.length === 0 && (
                <p className="text-xs text-amber-600">No batches available with stock</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sales-quantity">Quantity *</Label>
                <Input
                  id="sales-quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-unit">Unit *</Label>
                <select
                  id="sales-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as "KG" | "LTR" })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="KG">KG</option>
                  <option value="LTR">LTR</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales-remarks">Remarks</Label>
              <Textarea
                id="sales-remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional remarks"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={actionLoading}>Create Invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval Modal */}
      <Dialog open={approvalModal.open} onOpenChange={(isOpen) => !isOpen && setApprovalModal({ open: false, sale: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Approve Sale
            </DialogTitle>
            <DialogDescription>
              Approve sale to {approvalModal.sale?.agency?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice:</span>
              <span className="font-medium">{approvalModal.sale?.invoiceNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Quantity:</span>
              <span className="font-medium">{approvalModal.sale?.items[0]?.quantity} {approvalModal.sale?.items[0]?.unit}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sale-approve-remarks">Remarks (Optional)</Label>
            <Textarea
              id="sale-approve-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any remarks..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApprovalModal({ open: false, sale: null })}>Cancel</Button>
            <Button onClick={handleApprove} loading={actionLoading} className="bg-green-600 hover:bg-green-700">Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModal.open} onOpenChange={(isOpen) => !isOpen && setRejectModal({ open: false, sale: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Sale
            </DialogTitle>
            <DialogDescription>
              Reject sale to {rejectModal.sale?.agency?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice:</span>
              <span className="font-medium">{rejectModal.sale?.invoiceNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Quantity:</span>
              <span className="font-medium">{rejectModal.sale?.items[0]?.quantity} {rejectModal.sale?.items[0]?.unit}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sale-reject-reason">Rejection Reason *</Label>
            <Textarea
              id="sale-reject-reason"
              value={rejectionRemarks}
              onChange={(e) => setRejectionRemarks(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
              required
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectModal({ open: false, sale: null })}>Cancel</Button>
            <Button onClick={handleReject} loading={actionLoading} variant="destructive">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Sale Modal */}
      <Dialog open={viewModal.open} onOpenChange={(isOpen) => !isOpen && setViewModal({ open: false, sale: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Sales Invoice Details
            </DialogTitle>
          </DialogHeader>

          {viewLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : viewModal.sale ? (
            <div className="space-y-6">
              {/* Invoice Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Invoice No</p>
                    <p className="font-mono font-medium">{viewModal.sale.invoiceNo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Status</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[viewModal.sale.status]?.bg} ${statusColors[viewModal.sale.status]?.text}`}>
                      {statusLabels[viewModal.sale.status] || viewModal.sale.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Created At</p>
                    <p className="font-medium">{formatDateTime(viewModal.sale.createdAt!)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Updated At</p>
                    <p className="font-medium">{formatDateTime(viewModal.sale.updatedAt!)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Branch</p>
                    <p className="font-medium">{viewModal.sale.branch?.name || "-"}</p>
                    <p className="text-xs text-gray-400">{viewModal.sale.branch?.code || "-"}</p>
                  </div>
                  {viewModal.sale.approvedAt && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Approved At</p>
                      <p className="font-medium">{formatDateTime(viewModal.sale.approvedAt!)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Branch Details */}
              {viewModal.sale.branch && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Branch Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Name</p>
                      <p className="font-medium">{viewModal.sale.branch.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Code</p>
                      <p className="font-mono text-sm">{viewModal.sale.branch.code || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">GSTIN</p>
                      <p className="font-mono text-sm">{viewModal.sale.branch.gstin || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">State</p>
                      <p className="font-medium">{viewModal.sale.branch.state || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">City</p>
                      <p className="font-medium">{viewModal.sale.branch.city || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Phone</p>
                      <p className="font-medium">{viewModal.sale.branch.phnNumber || "-"}</p>
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <p className="text-xs text-gray-500 uppercase">Address</p>
                      <p className="text-sm">
                        {[viewModal.sale.branch.addressLine1, viewModal.sale.branch.addressLine2].filter(Boolean).join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Agency Details */}
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Client Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Name</p>
                    <p className="font-medium">{viewModal.sale.agency?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Type</p>
                    <p className="font-medium">{viewModal.sale.agency?.type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">GSTIN</p>
                    <p className="font-mono text-sm">{viewModal.sale.agency?.gstin || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Contact Person</p>
                    <p className="font-medium">{viewModal.sale.agency?.contactPerson || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Mobile</p>
                    <p className="font-medium">{viewModal.sale.agency?.mobileNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Email</p>
                    <p className="text-sm">{viewModal.sale.agency?.email || "-"}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-xs text-gray-500 uppercase">Address</p>
                    <p className="text-sm">
                      {[viewModal.sale.agency?.addressLine1, viewModal.sale.agency?.addressLine2, viewModal.sale.agency?.city, viewModal.sale.agency?.state, viewModal.sale.agency?.pinCode].filter(Boolean).join(", ") || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Items</h4>
                {viewModal.sale.items?.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4 mb-3 last:mb-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Product</p>
                        <p className="font-medium">{item.product?.name || "-"}</p>
                        <p className="text-xs text-gray-500">{item.product?.sku || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Batch No</p>
                        <p className="font-mono font-medium">{item.batch?.batchNo || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Quantity</p>
                        <p className="font-medium">{item.quantity} {item.unit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Selling Price</p>
                        <p className="font-medium">{formatCurrency(Number(item.sellingPrice) || 0)}</p>
                      </div>
                    </div>
                    {item.product && (
                      <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">HSN</p>
                          <p className="text-sm">{item.product.hsnNo || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">GST %</p>
                          <p className="text-sm">{item.product.applicableGST || "-"}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Density</p>
                          <p className="text-sm">{item.product.density || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Amount</p>
                          <p className="font-semibold text-green-600">{formatCurrency(Number(item.quantity) * Number(item.sellingPrice))}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Created & Approved Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="text-xs text-gray-500 uppercase mb-2">Created By</h4>
                  <p className="font-medium">{viewModal.sale.createdBy?.name || "-"}</p>
                  <p className="text-sm text-gray-500">{viewModal.sale.createdBy?.email || "-"}</p>
                  {viewModal.sale.createdAt && (
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(viewModal.sale.createdAt!)}</p>
                  )}
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="text-xs text-gray-500 uppercase mb-2">Approved By</h4>
                  {viewModal.sale.approvedBy ? (
                    <>
                      <p className="font-medium">{viewModal.sale.approvedBy.name || "-"}</p>
                      <p className="text-sm text-gray-500">{viewModal.sale.approvedBy.email || "-"}</p>
                      {viewModal.sale.approvedAt && (
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(viewModal.sale.approvedAt!)}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Not approved yet</p>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {viewModal.sale.remarks && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-xs text-gray-500 uppercase mb-2">Remarks</h4>
                  <p className="text-sm">{viewModal.sale.remarks}</p>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewModal({ open: false, sale: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}