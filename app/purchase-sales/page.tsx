"use client";

import * as React from "react";
import {
  ShoppingCart, Receipt, Search, Plus, Eye,
  Package, RefreshCw, FileText, Download, ArrowRightCircle, ArrowLeftRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchAllPurchases } from "@/app/store/purchasesSlice";
import { fetchAllSales } from "@/app/store/salesSlice";
import { purchaseApi } from "@/app/services/purchase.service";
import { salesApi } from "@/app/services/sales.service";
import { ImportButton } from "@/app/components/import/ImportButton";
import { Purchase } from "@/app/types/purchase";
import { Sales } from "@/app/types/sales";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";
import { useRouter, useSearchParams } from "next/navigation";

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
  // `useSearchParams` requires a Suspense boundary during static rendering.
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <PurchaseSalesContent />
    </React.Suspense>
  );
}

function PurchaseSalesContent() {
  // Allow other pages (e.g. pending-sales, new-sale) to land back on a
  // specific tab via ?tab=sale. Defaults to "purchase" otherwise.
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab");
  const defaultTab = tabFromUrl === "sale" || tabFromUrl === "sales" ? "sales" : "purchase";
  const router = useRouter();

  const handleTabChange = (value: string) => {
    // Reflect the active tab in the URL so back-navigation / refresh
    // preserve the user's selection.
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (value === "purchase") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const query = params.toString();
    router.replace(query ? `/purchase-sales?${query}` : "/purchase-sales", { scroll: false });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase & Sales</h1>
          <p className="text-gray-500 mt-1">
            Manage purchase invoices, sales invoices, and approvals
          </p>
        </div>
        <Button
          variant="outline"
          className="w-fit gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
          onClick={() => router.push("/purchase-order")}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Purchase Order
        </Button>
      </div>

      <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
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
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { purchases, isLoading, pagination } = useAppSelector((state) => state.purchases);
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);

  const canPurchaseView = hasModulePermission(userPermissions, "PURCHASE", "VIEW");
  const canPurchaseWrite = hasModulePermission(userPermissions, "PURCHASE", "WRITE");

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [voucherTypeFilter, setVoucherTypeFilter] = React.useState<"PURCHASE" | "RCM_PURCHASE" | "">("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [viewModal, setViewModal] = React.useState<{ open: boolean; purchase: Purchase | null }>({
    open: false,
    purchase: null,
  });
  const [viewLoading, setViewLoading] = React.useState(false);

  React.useEffect(() => {
    fetchPurchases(currentPage, statusFilter, voucherTypeFilter, searchTerm);
  }, [currentPage, statusFilter, voucherTypeFilter, searchTerm]);

  const fetchPurchases = async (page = currentPage, status?: string, voucherType?: string, search?: string) => {
    try {
      const params: any = { page, limit: 10 };
      if (status) params.status = status;
      if (voucherType) params.voucherType = voucherType;
      if (search?.trim()) params.search = search.trim();
      await dispatch(fetchAllPurchases(params)).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch purchases", "error");
    }
  };

  const handleViewPurchase = async (purchase: Purchase) => {
    setViewLoading(true);
    setViewModal({ open: true, purchase: null });
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

  const filteredPurchases = purchases;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Purchase Orders</h2>
          <p className="text-sm text-gray-500">Manage vendor purchases and approvals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
            onClick={() => router.push("/purchase-sales/pending-purchases")}
          >
            Pending Approvals
          </Button>
          
          <Button
            variant="outline"
            className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
            onClick={() => router.push("/debit-credit-notes")}
          >
            <ArrowRightCircle className="h-4 w-4" />
            Debit / Credit Notes
          </Button>
          {canPurchaseWrite && (
            <>
              <ImportButton
                registerType="PURCHASE"
                label="Import Purchase Register"
                variant="outline"
                onCompleted={() => fetchPurchases(currentPage, statusFilter, voucherTypeFilter, searchTerm)}
              />
              <Button onClick={() => router.push("/purchase-sales/new")} className="gap-2">
                <Plus className="h-4 w-4" />
                New Purchase
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search purchases..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
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
        <select
          value={voucherTypeFilter}
          onChange={(e) => {
            setVoucherTypeFilter(e.target.value as "PURCHASE" | "RCM_PURCHASE" | "");
            setCurrentPage(1);
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Voucher Types</option>
          <option value="PURCHASE">Normal Purchase</option>
          <option value="RCM_PURCHASE">RCM Purchase</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => fetchPurchases(currentPage, statusFilter, voucherTypeFilter, searchTerm)}>
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
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Items</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">GST</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Grand Total</th>
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
                      <td className="px-4 py-3 text-nowrap">
                        <div className="text-sm font-medium">
                          {purchase.items && purchase.items.length > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                              {purchase.items.length} {purchase.items.length === 1 ? "item" : "items"}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium">{formatCurrency(Number(purchase.subtotalAmount || 0))}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-blue-600">{formatCurrency(Number(purchase.totalGSTAmount || 0))}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(Number(purchase.grandTotal || 0))}</span>
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

      {/* View Purchase Modal */}
      <Dialog open={viewModal.open} onOpenChange={(isOpen) => !isOpen && setViewModal({ open: false, purchase: null })}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
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
                  </div>
                </div>
              )}

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
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Items ({viewModal.purchase.items?.length || 0})</h4>
                {viewModal.purchase.items?.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4 mb-3 last:mb-0">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                        <p className="text-xs text-gray-500 uppercase">Unit Price</p>
                        <p className="font-medium">{formatCurrency(Number(item.purchasePrice) || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Taxable Amt</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(Number(item.taxableAmount) || 0)}</p>
                      </div>
                    </div>
                    {item.product && (
                      <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">HSN</p>
                          <p className="text-sm">{item.product.hsnNo || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">GST %</p>
                          <p className="text-sm font-medium">{item.gstPercent || item.product.applicableGST || "-"}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">GST Amount</p>
                          <p className="text-sm font-medium text-blue-600">{formatCurrency(Number(item.gstAmount) || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Density</p>
                          <p className="text-sm">{item.product.density || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total w/ GST</p>
                          <p className="font-semibold text-green-600">{formatCurrency(Number(item.totalAmount) || 0)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Invoice Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase mb-1">Subtotal Amount</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(Number(viewModal.purchase.subtotalAmount || 0))}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase mb-1">Total GST</p>
                    <p className="text-lg font-semibold text-blue-600">{formatCurrency(Number(viewModal.purchase.totalGSTAmount || 0))}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase mb-1">Grand Total</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(Number(viewModal.purchase.grandTotal || 0))}</p>
                  </div>
                </div>
              </div>

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

              {viewModal.purchase.remarks && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-xs text-gray-500 uppercase mb-2">Remarks</h4>
                  <p className="text-sm">{viewModal.purchase.remarks}</p>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewModal({ open: false, purchase: null })}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== SALES TAB ==============
function SalesTab() {
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { sales, isLoading, pagination } = useAppSelector((state) => state.sales);
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);

  const canSaleView = hasModulePermission(userPermissions, "SALE", "VIEW");
  const canSaleWrite = hasModulePermission(userPermissions, "SALE", "WRITE");

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [viewModal, setViewModal] = React.useState<{ open: boolean; sale: Sales | null }>({
    open: false,
    sale: null,
  });
  const [viewLoading, setViewLoading] = React.useState(false);

  const [pdfPreview, setPdfPreview] = React.useState<{
    open: boolean;
    loading: boolean;
    objectUrl: string | null;
    filename: string;
    saleId: string | null;
  }>({ open: false, loading: false, objectUrl: null, filename: "", saleId: null });
  const [pdfActionLoading, setPdfActionLoading] = React.useState(false);

  React.useEffect(() => {
    fetchSales(currentPage, statusFilter, searchTerm);
  }, [currentPage, statusFilter, searchTerm]);

  // Revoke any active blob URL when the preview closes / component unmounts
  React.useEffect(() => {
    return () => {
      if (pdfPreview.objectUrl) {
        URL.revokeObjectURL(pdfPreview.objectUrl);
      }
    };
  }, [pdfPreview.objectUrl]);

  const closePdfPreview = React.useCallback(() => {
    setPdfPreview((prev) => {
      if (prev.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return { open: false, loading: false, objectUrl: null, filename: "", saleId: null };
    });
  }, []);

  const handlePreviewInvoice = async (sale: Sales) => {
    setPdfActionLoading(true);
    try {
      const { blob, filename } = await salesApi.previewInvoice(sale.id);
      const objectUrl = URL.createObjectURL(blob);
      setPdfPreview({ open: true, loading: false, objectUrl, filename, saleId: sale.id });
    } catch (err: any) {
      addToast(err?.message || "Failed to preview invoice", "error");
    } finally {
      setPdfActionLoading(false);
    }
  };

  const handleDownloadInvoice = async (sale: Sales) => {
    setPdfActionLoading(true);
    try {
      const { blob, filename } = await salesApi.downloadInvoice(sale.id);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename || `invoice-${sale.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Give the browser a tick to start the download before revoking
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err: any) {
      addToast(err?.message || "Failed to download invoice", "error");
    } finally {
      setPdfActionLoading(false);
    }
  };

  const fetchSales = async (page = currentPage, status?: string, search?: string) => {
    try {
      const params: any = { page, limit: 10 };
      if (status) params.status = status;
      if (search?.trim()) params.search = search.trim();
      await dispatch(fetchAllSales(params)).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch sales", "error");
    }
  };

  const handleViewSale = async (sale: Sales) => {
    setViewLoading(true);
    setViewModal({ open: true, sale: null });
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

  const filteredSales = sales;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sales Invoices</h2>
          <p className="text-sm text-gray-500">Manage client sales and approvals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
            onClick={() => router.push("/purchase-sales/pending-sales")}
          >
            Pending Approvals
          </Button>
          {canSaleWrite && (
            <>
              <ImportButton
                registerType="SALE"
                label="Import Sale Register"
                variant="outline"
                onCompleted={() => fetchSales(currentPage, statusFilter)}
              />
              <Button onClick={() => router.push("/purchase-sales/new-sale")} className="gap-2">
                <Plus className="h-4 w-4" />
                New Sale
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sales..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
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
        <Button variant="outline" size="sm" onClick={() => fetchSales(currentPage, statusFilter, searchTerm)}>
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
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created At</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <Receipt className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <span className="text-sm font-medium">{sale.agency?.name || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {sale.items && sale.items.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{sale.items?.[0]?.product?.name || "-"}</span>
                            {sale.items.length > 1 && (
                              <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                                +{sale.items.length - 1} more {sale.items.length - 1 === 1 ? "item" : "items"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-mono">{sale.items?.[0]?.batch?.batchNo || "-"}</span>
                      </td>
                      
                      <td className="px-4 py-3 text-sm">
                        {sale.items?.[0]?.quantity || 0} {sale.items?.[0]?.unit || "KG"}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 font-semibold">
                        {sale.items?.[0]?.totalAmount || 0}
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
                          {canSaleView && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                              onClick={() => handleViewSale(sale)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {(sale.status === "PENDING" || sale.status === "APPROVED" || sale.status === "REJECTED") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => handlePreviewInvoice(sale)}
                              loading={pdfActionLoading}
                              title="Preview Invoice"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {sale.status === "APPROVED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleDownloadInvoice(sale)}
                              loading={pdfActionLoading}
                              title="Download Invoice"
                            >
                              <Download className="h-4 w-4" />
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

              {viewModal.sale.branch && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Company Details</h4>
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
                  </div>
                </div>
              )}

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
                </div>
              </div>

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

              {viewModal.sale.remarks && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-xs text-gray-500 uppercase mb-2">Remarks</h4>
                  <p className="text-sm">{viewModal.sale.remarks}</p>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            {(viewModal.sale?.status === "PENDING" || viewModal.sale?.status === "APPROVED" || viewModal.sale?.status === "REJECTED") && (
              <Button
                variant="outline"
                onClick={() => handlePreviewInvoice(viewModal.sale!)}
                loading={pdfActionLoading}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Preview PDF
              </Button>
            )}
            {viewModal.sale?.status === "APPROVED" && (
              <Button
                variant="outline"
                onClick={() => handleDownloadInvoice(viewModal.sale!)}
                loading={pdfActionLoading}
                className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewModal({ open: false, sale: null })}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal — view-only, no download */}
      <Dialog
        open={pdfPreview.open}
        onOpenChange={(isOpen) => !isOpen && closePdfPreview()}
      >
        <DialogContent
          className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0"
          onContextMenu={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              Invoice Preview
              {pdfPreview.saleId && (
                <span className="font-mono text-xs text-gray-500">
                  {pdfPreview.saleId}
                </span>
              )}
              <span className="ml-auto text-[11px] font-normal text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                Preview only — download disabled
              </span>
            </DialogTitle>
          </DialogHeader>

          <div
            className="flex-1 bg-gray-100 relative"
          >
            {pdfPreview.objectUrl ? (
              <>
                {/* Render the PDF in an iframe. Anti-download measures:
                    1. Append #toolbar=0 to the blob URL so the browser's PDF
                       viewer hides its own toolbar (Chrome/Firefox/Edge).
                    2. Right-click blocking on the parent + iframe to suppress
                       the "Save As" / context-menu download paths.
                    3. CSS user-select: none to make text-drag saving harder.
                    4. A transparent bottom band covers the area where the
                       viewer's toolbar would render, in case #toolbar=0 is
                       ignored by the user agent. */}
                <iframe
                  src={`${pdfPreview.objectUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  title="Invoice PDF preview"
                  className="w-full h-full relative z-10"
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    userSelect: "none",
                    WebkitUserSelect: "none",
                  }}
                />
                <div
                  className="absolute left-0 right-0 bottom-0 h-10 z-20 bg-gray-100"
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseDown={(e) => {
                    if (e.button === 2) e.preventDefault();
                  }}
                  title="Toolbar disabled"
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <Button variant="outline" onClick={closePdfPreview}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
