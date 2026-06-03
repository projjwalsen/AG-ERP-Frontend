"use client";

import * as React from "react";
import { ShoppingCart, ArrowLeft, Eye, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchAllPurchases, approvePurchase, rejectPurchase } from "@/app/store/purchasesSlice";
import { purchaseApi } from "@/app/services/purchase.service";
import { Purchase } from "@/app/types/purchase";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";
import { useRouter } from "next/navigation";

export default function PendingPurchasesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PendingPurchasesContent />
      <ToastContainer />
    </div>
  );
}

function PendingPurchasesContent() {
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { purchases, isLoading, pagination } = useAppSelector((state) => state.purchases);
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);

  const canPurchaseApprove = hasModulePermission(userPermissions, "PURCHASE", "APPROVE");
  const canPurchaseView = hasModulePermission(userPermissions, "PURCHASE", "VIEW");

  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState("");

  const [viewModal, setViewModal] = React.useState<{ open: boolean; purchase: Purchase | null }>({
    open: false,
    purchase: null,
  });
  const [viewLoading, setViewLoading] = React.useState(false);

  const [approveModal, setApproveModal] = React.useState<{ open: boolean; purchase: Purchase | null }>({
    open: false,
    purchase: null,
  });
  const [rejectModal, setRejectModal] = React.useState<{ open: boolean; purchase: Purchase | null }>({
    open: false,
    purchase: null,
  });

  const [remarks, setRemarks] = React.useState("");
  const [rejectionRemarks, setRejectionRemarks] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  const fetchPendingPurchases = React.useCallback(async () => {
    try {
      await dispatch(fetchAllPurchases({ page: currentPage, limit: 10, status: "PENDING" })).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch pending purchases", "error");
    }
  }, [dispatch, addToast, currentPage]);

  React.useEffect(() => {
    fetchPendingPurchases();
  }, [fetchPendingPurchases]);

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

  const handleApprove = async () => {
    if (!approveModal.purchase) return;
    setActionLoading(true);
    try {
      await dispatch(approvePurchase({ purchaseId: approveModal.purchase.id })).unwrap();
      setApproveModal({ open: false, purchase: null });
      setRemarks("");
      addToast("Purchase approved successfully", "success");
      await fetchPendingPurchases();
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
      setRejectModal({ open: false, purchase: null });
      setRejectionRemarks("");
      addToast("Purchase rejected", "success");
      await fetchPendingPurchases();
    } catch (err: any) {
      addToast(err || "Failed to reject purchase", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingPurchases = React.useMemo(() => {
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
      <div>
        <Button variant="ghost" className="gap-2 mb-4" onClick={() => router.push("/purchase-sales")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase & Sales
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending Purchase Approvals</h1>
            <p className="text-gray-500 mt-1">Review and approve pending purchase orders</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search purchases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <span className="text-sm text-gray-500">
          {pendingPurchases.length} pending
        </span>
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
      ) : pendingPurchases.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agency</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Qty</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Price</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total (incl. GST)</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created At</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingPurchases.map((purchase) => {
                    const totalQty = purchase.items.reduce(
                      (sum, item) => sum + Number(item.quantity || 0),
                      0
                    );
                    const totalPrice = purchase.items.reduce(
                      (sum, item) =>
                        sum + Number(item.quantity || 0) * Number(item.purchasePrice || 0),
                      0
                    );
                    const totalWithGst =
                      purchase.grandTotal != null
                        ? Number(purchase.grandTotal)
                        : purchase.items.reduce(
                            (sum, item) =>
                              sum +
                              Number(
                                item.totalAmount ??
                                  Number(item.quantity || 0) * Number(item.purchasePrice || 0)
                              ),
                            0
                          );
                    return (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium">{purchase.invoiceNo || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium">{purchase.agency?.name || "-"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {totalQty}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatCurrency(totalPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {formatCurrency(totalWithGst)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateTime(purchase.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canPurchaseApprove && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setApproveModal({ open: true, purchase })}
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setRejectModal({ open: true, purchase })}
                                title="Reject"
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
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No pending purchase approvals</p>
          </CardContent>
        </Card>
      )}

      {/* Approve Modal */}
      <Dialog open={approveModal.open} onOpenChange={(isOpen) => !isOpen && setApproveModal({ open: false, purchase: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Approve Purchase
            </DialogTitle>
          </DialogHeader>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice No:</span>
              <span className="font-mono font-medium">{approveModal.purchase?.invoiceNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Vendor:</span>
              <span className="font-medium">{approveModal.purchase?.agency?.name || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Amount:</span>
              <span className="font-medium">
                {formatCurrency(
                  (approveModal.purchase?.items || []).reduce(
                    (sum, item) =>
                      sum + Number(item.quantity || 0) * Number(item.purchasePrice || 0),
                    0
                  )
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Amount (incl. GST):</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(
                  approveModal.purchase?.grandTotal != null
                    ? Number(approveModal.purchase.grandTotal)
                    : (approveModal.purchase?.items || []).reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.totalAmount ??
                              Number(item.quantity || 0) * Number(item.purchasePrice || 0)
                          ),
                        0
                      )
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Remarks (Optional)</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any remarks..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApproveModal({ open: false, purchase: null })}>Cancel</Button>
            <Button onClick={handleApprove} loading={actionLoading} className="bg-green-600 hover:bg-green-700">Approve</Button>
          </div>
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
          </DialogHeader>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice No:</span>
              <span className="font-mono font-medium">{rejectModal.purchase?.invoiceNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Vendor:</span>
              <span className="font-medium">{rejectModal.purchase?.agency?.name || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Amount:</span>
              <span className="font-medium">
                {formatCurrency(
                  (rejectModal.purchase?.items || []).reduce(
                    (sum, item) =>
                      sum + Number(item.quantity || 0) * Number(item.purchasePrice || 0),
                    0
                  )
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Amount (incl. GST):</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(
                  rejectModal.purchase?.grandTotal != null
                    ? Number(rejectModal.purchase.grandTotal)
                    : (rejectModal.purchase?.items || []).reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.totalAmount ??
                              Number(item.quantity || 0) * Number(item.purchasePrice || 0)
                          ),
                        0
                      )
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rejection Reason *</Label>
            <Textarea
              value={rejectionRemarks}
              onChange={(e) => setRejectionRemarks(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectModal({ open: false, purchase: null })}>Cancel</Button>
            <Button onClick={handleReject} loading={actionLoading} variant="destructive">Reject</Button>
          </div>
        </DialogContent>
      </Dialog>

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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Pending
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
                </div>
              </div>

              {viewModal.purchase.branch && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Company Details</h4>
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}