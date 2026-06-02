"use client";

import * as React from "react";
import { Receipt, ArrowLeft, Eye, CheckCircle, XCircle, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchAllSales, approveSale, rejectSale } from "@/app/store/salesSlice";
import { salesApi } from "@/app/services/sales.service";
import { Sales } from "@/app/types/sales";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";
import { useRouter } from "next/navigation";

export default function PendingSalesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PendingSalesContent />
      <ToastContainer />
    </div>
  );
}

function PendingSalesContent() {
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { sales, isLoading, pagination } = useAppSelector((state) => state.sales);
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);

  const canSaleApprove = hasModulePermission(userPermissions, "SALE", "APPROVE");
  const canSaleView = hasModulePermission(userPermissions, "SALE", "VIEW");

  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState("");

  const [viewModal, setViewModal] = React.useState<{ open: boolean; sale: Sales | null }>({
    open: false,
    sale: null,
  });
  const [viewLoading, setViewLoading] = React.useState(false);

  const [approveModal, setApproveModal] = React.useState<{ open: boolean; sale: Sales | null }>({
    open: false,
    sale: null,
  });
  const [rejectModal, setRejectModal] = React.useState<{ open: boolean; sale: Sales | null }>({
    open: false,
    sale: null,
  });

  const [remarks, setRemarks] = React.useState("");
  const [rejectionRemarks, setRejectionRemarks] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  const [pdfPreview, setPdfPreview] = React.useState<{
    open: boolean;
    loading: boolean;
    objectUrl: string | null;
    filename: string;
    saleId: string | null;
  }>({ open: false, loading: false, objectUrl: null, filename: "", saleId: null });
  const [pdfActionLoading, setPdfActionLoading] = React.useState(false);

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

  const handleDownloadFromPreview = async () => {
    if (!pdfPreview.saleId) return;
    setPdfActionLoading(true);
    try {
      const { blob, filename } = await salesApi.downloadInvoice(pdfPreview.saleId);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename || `invoice-${pdfPreview.saleId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err: any) {
      addToast(err?.message || "Failed to download invoice", "error");
    } finally {
      setPdfActionLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPendingSales();
  }, [currentPage]);

  const fetchPendingSales = async () => {
    try {
      await dispatch(fetchAllSales({ page: currentPage, limit: 10, status: "PENDING" })).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch pending sales", "error");
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

  const handleApprove = async () => {
    if (!approveModal.sale) return;
    setActionLoading(true);
    try {
      await dispatch(approveSale({ saleId: approveModal.sale.id, remarks })).unwrap();
      setApproveModal({ open: false, sale: null });
      setRemarks("");
      addToast("Sale approved successfully", "success");
      await fetchPendingSales();
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
      setRejectModal({ open: false, sale: null });
      setRejectionRemarks("");
      addToast("Sale rejected", "success");
      await fetchPendingSales();
    } catch (err: any) {
      addToast(err || "Failed to reject sale", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingSales = React.useMemo(() => {
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
      <div>
        <Button variant="ghost" className="gap-2 mb-4" onClick={() => router.push("/purchase-sales")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase & Sales
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending Sales Approvals</h1>
            <p className="text-gray-500 mt-1">Review and approve pending sales invoices</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search sales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-sm text-gray-500">
          {pendingSales.length} pending
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
      ) : pendingSales.length > 0 ? (
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
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created At</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingSales.map((sale) => (
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
                        {sale.items[0]?.product?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-mono">{sale.items[0]?.batch?.batchNo || "-"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {sale.items[0]?.quantity || 0} {sale.items[0]?.unit || "KG"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateTime(sale.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canSaleApprove && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setApproveModal({ open: true, sale })}
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setRejectModal({ open: true, sale })}
                                title="Reject"
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
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
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
            <p className="text-gray-500">No pending sales approvals</p>
          </CardContent>
        </Card>
      )}

      {/* Approve Modal */}
      <Dialog open={approveModal.open} onOpenChange={(isOpen) => !isOpen && setApproveModal({ open: false, sale: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Approve Sale
            </DialogTitle>
          </DialogHeader>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice:</span>
              <span className="font-medium">{approveModal.sale?.invoiceNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Quantity:</span>
              <span className="font-medium">{approveModal.sale?.items[0]?.quantity} {approveModal.sale?.items[0]?.unit}</span>
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
            <Button variant="outline" onClick={() => setApproveModal({ open: false, sale: null })}>Cancel</Button>
            <Button onClick={handleApprove} loading={actionLoading} className="bg-green-600 hover:bg-green-700">Approve</Button>
          </div>
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
            <Button variant="outline" onClick={() => setRejectModal({ open: false, sale: null })}>Cancel</Button>
            <Button onClick={handleReject} loading={actionLoading} variant="destructive">Reject</Button>
          </div>
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
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Invoice No</p>
                    <p className="font-mono font-medium">{viewModal.sale.invoiceNo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Status</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Pending
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Created At</p>
                    <p className="font-medium">{formatDateTime(viewModal.sale.createdAt!)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Branch</p>
                    <p className="font-medium">{viewModal.sale.branch?.name || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Client Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Name</p>
                    <p className="font-medium">{viewModal.sale.agency?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Contact Person</p>
                    <p className="font-medium">{viewModal.sale.agency?.contactPerson || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Mobile</p>
                    <p className="font-medium">{viewModal.sale.agency?.mobileNumber || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Items</h4>
                {viewModal.sale.items?.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Product</p>
                        <p className="font-medium">{item.product?.name || "-"}</p>
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
                    <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">HSN</p>
                        <p className="text-sm">{item.product?.hsnNo || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Amount</p>
                        <p className="font-semibold text-green-600">{formatCurrency(Number(item.quantity) * Number(item.sellingPrice))}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="text-xs text-gray-500 uppercase mb-2">Created By</h4>
                <p className="font-medium">{viewModal.sale.createdBy?.name || "-"}</p>
                <p className="text-sm text-gray-500">{viewModal.sale.createdBy?.email || "-"}</p>
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
            <Button
              variant="outline"
              onClick={() => handlePreviewInvoice(viewModal.sale!)}
              loading={pdfActionLoading}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Preview PDF
            </Button>
            <Button variant="outline" onClick={() => setViewModal({ open: false, sale: null })}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal (PENDING sales) */}
      <Dialog
        open={pdfPreview.open}
        onOpenChange={(isOpen) => !isOpen && closePdfPreview()}
      >
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              Invoice Preview
              {pdfPreview.saleId && (
                <span className="font-mono text-xs text-gray-500">
                  {pdfPreview.saleId}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 bg-gray-100">
            {pdfPreview.objectUrl ? (
              <iframe
                src={pdfPreview.objectUrl}
                title="Invoice PDF preview"
                className="w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <Button
              variant="outline"
              onClick={handleDownloadFromPreview}
              loading={pdfActionLoading}
              className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" onClick={closePdfPreview}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}