"use client";

import * as React from "react";
import { ArrowLeftRight, CheckCircle2, Download, Eye, FileText, Plus, RefreshCw, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/tables";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchAllPurchaseOrders } from "@/app/store/purchaseOrdersSlice";
import { purchaseOrderApi } from "@/app/services/purchase-order.service";
import type { PurchaseOrder } from "@/app/types/purchase-order";
import { downloadBlob } from "@/lib/download";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function PurchaseOrderPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();
  const { purchaseOrders, isLoading, pagination } = useAppSelector((state) => state.purchaseOrders);
  const { permissions } = useAppSelector((state) => state.auth);

  const canView = hasModulePermission(permissions, "PURCHASE", "VIEW");
  const canWrite = hasModulePermission(permissions, "PURCHASE", "WRITE");
  const canApprove = hasModulePermission(permissions, "PURCHASE", "APPROVE");

  const [pageIndex, setPageIndex] = React.useState(0);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [viewModal, setViewModal] = React.useState<{ open: boolean; order: PurchaseOrder | null }>({
    open: false,
    order: null,
  });
  const [viewLoading, setViewLoading] = React.useState(false);
  const [pdfPreview, setPdfPreview] = React.useState<{
    open: boolean;
    order: PurchaseOrder | null;
    objectUrl: string | null;
  }>({ open: false, order: null, objectUrl: null });
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [downloadLoading, setDownloadLoading] = React.useState(false);

  const fetchOrders = React.useCallback(async () => {
    try {
      await dispatch(
        fetchAllPurchaseOrders({
          page: pageIndex + 1,
          limit: 10,
          search: searchTerm.trim() || undefined,
          status: statusFilter ? (statusFilter as PurchaseOrder["status"]) : undefined,
        })
      ).unwrap();
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : String(error || "Failed to fetch purchase orders"), "error");
    }
  }, [addToast, dispatch, pageIndex, searchTerm, statusFilter]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  React.useEffect(() => {
    return () => {
      if (pdfPreview.objectUrl) URL.revokeObjectURL(pdfPreview.objectUrl);
    };
  }, [pdfPreview.objectUrl]);

  const handleView = async (order: PurchaseOrder) => {
    setViewLoading(true);
    setViewModal({ open: true, order: null });
    try {
      const response = await purchaseOrderApi.getById(order.id);
      if (response.success && response.data) {
        setViewModal({ open: true, order: response.data });
      } else {
        addToast(response.message || "Failed to fetch purchase order", "error");
        setViewModal({ open: false, order: null });
      }
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : "Failed to fetch purchase order", "error");
      setViewModal({ open: false, order: null });
    } finally {
      setViewLoading(false);
    }
  };

  const closePdfPreview = () => {
    setPdfPreview((prev) => {
      if (prev.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return { open: false, order: null, objectUrl: null };
    });
  };

  const handlePreviewPdf = async (order: PurchaseOrder) => {
    if (order.status !== "APPROVED") {
      addToast("PDF is available only after purchase order approval", "error");
      return;
    }
    setPdfLoading(true);
    try {
      const { blob } = await purchaseOrderApi.previewPdf(order.id, order.poNo);
      const objectUrl = URL.createObjectURL(blob);
      setPdfPreview((prev) => {
        if (prev.objectUrl) URL.revokeObjectURL(prev.objectUrl);
        return { open: true, order, objectUrl };
      });
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : "Failed to generate purchase order PDF", "error");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPdf = async (order = pdfPreview.order) => {
    if (!order) return;
    if (order.status !== "APPROVED") {
      addToast("PDF download is available only after purchase order approval", "error");
      return;
    }
    setDownloadLoading(true);
    try {
      const { blob, filename } = await purchaseOrderApi.downloadPdf(order.id, order.poNo);
      downloadBlob(blob, filename);
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : "Failed to download purchase order PDF", "error");
    } finally {
      setDownloadLoading(false);
    }
  };

  const columns = React.useMemo<ColumnDef<PurchaseOrder>[]>(
    () => [
      {
        accessorKey: "poNo",
        header: "PO No",
        cell: ({ row }) => <span className="font-mono font-medium">{row.original.poNo}</span>,
      },
      {
        accessorKey: "agency.name",
        header: "Vendor",
        cell: ({ row }) => <span className="font-medium">{row.original.agency?.name || "-"}</span>,
      },
      {
        id: "items",
        header: "Items",
        cell: ({ row }) => `${row.original.items?.length || 0} item${row.original.items?.length === 1 ? "" : "s"}`,
      },
      {
        accessorKey: "subtotalAmount",
        header: "Order Value",
        cell: ({ row }) => (
          <span className="font-semibold text-green-700">
            {formatCurrency(Number(row.original.subtotalAmount || 0))}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[row.original.status]}`}>
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "poDate",
        header: "PO Date",
        cell: ({ row }) => formatDateTime(row.original.poDate),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100"
              onClick={(event) => {
                event.stopPropagation();
                handleView(row.original);
              }}
              disabled={!canView}
              title="View"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {row.original.status === "APPROVED" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                  onClick={(event) => {
                    event.stopPropagation();
                    handlePreviewPdf(row.original);
                  }}
                  disabled={!canView || pdfLoading}
                  title="Preview PDF"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-green-600 hover:bg-green-50 hover:text-green-700"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDownloadPdf(row.original);
                  }}
                  disabled={!canView || downloadLoading}
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [canView, downloadLoading, pdfLoading]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order</h1>
          <p className="mt-1 text-gray-500">Create, track, and review vendor purchase orders</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canApprove && (
            <Button
              variant="outline"
              className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50"
              onClick={() => router.push("/purchase-order/pending")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Pending Purchase Orders
            </Button>
          )}
          {canWrite && (
            <Button className="gap-2" onClick={() => router.push("/purchase-order/create")}>
              <Plus className="h-4 w-4" />
              Create Purchase Order
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search PO no or vendor..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPageIndex(0);
            }}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPageIndex(0);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="space-y-4 p-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <DataTable
              columns={columns}
              data={purchaseOrders}
              manualPagination={{
                pageIndex,
                pageSize: pagination?.limit || 10,
                pageCount: pagination?.totalPages || 1,
                total: pagination?.total || 0,
                onPageChange: setPageIndex,
              }}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={viewModal.open} onOpenChange={(open) => !open && setViewModal({ open: false, order: null })}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Purchase Order Details
            </DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
            </div>
          ) : viewModal.order ? (
            <PurchaseOrderDetails order={viewModal.order} />
          ) : null}
          <div className="flex justify-end gap-2">
            {viewModal.order?.status === "APPROVED" && (
              <>
                <Button
                  variant="outline"
                  className="gap-2 text-amber-700"
                  onClick={() => handlePreviewPdf(viewModal.order!)}
                  loading={pdfLoading}
                >
                  <FileText className="h-4 w-4" />
                  Preview PDF
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 text-green-700"
                  onClick={() => handleDownloadPdf(viewModal.order!)}
                  loading={downloadLoading}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setViewModal({ open: false, order: null })}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pdfPreview.open} onOpenChange={(open) => !open && closePdfPreview()}>
        <DialogContent className="flex h-[90vh] w-[95vw] max-w-5xl flex-col p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              {pdfPreview.order?.poNo ? `${pdfPreview.order.poNo} PDF` : "Purchase Order PDF"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative flex-1 bg-gray-100">
            {pdfPreview.objectUrl ? (
              <iframe
                src={`${pdfPreview.objectUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                title="Purchase Order PDF"
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <Button variant="outline" onClick={closePdfPreview}>
              Close
            </Button>
            <Button onClick={() => handleDownloadPdf()} loading={downloadLoading} className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ToastContainer />
    </div>
  );
}

function PurchaseOrderDetails({ order }: { order: PurchaseOrder }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-4">
        <Info label="PO No" value={order.poNo} mono />
        <Info label="Status" value={order.status} />
        <Info label="PO Date" value={formatDateTime(order.poDate)} />
        <Info label="Order Value" value={formatCurrency(Number(order.subtotalAmount || 0))} />
        <Info label="Vendor" value={order.agency?.name || "-"} />
        <Info label="Branch" value={order.branch?.name || "-"} />
        <Info label="Created At" value={formatDateTime(order.createdAt)} />
        <Info label="Approved At" value={order.approvedAt ? formatDateTime(order.approvedAt) : "-"} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">SKU</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Unit</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium">{item.product?.name || "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{item.product?.sku || "-"}</td>
                <td className="px-4 py-3 text-right">{Number(item.quantity || 0).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">{item.unit}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(Number(item.purchasePrice || 0))}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-700">
                  {formatCurrency(Number(item.totalAmount || Number(item.quantity || 0) * Number(item.purchasePrice || 0)))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.remarks && (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Remarks</p>
          <p className="text-sm text-gray-700">{order.remarks}</p>
        </div>
      )}

      {order.rejectionRemarks && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-1 text-xs font-semibold uppercase text-red-600">Rejection Remarks</p>
          <p className="text-sm text-red-700">{order.rejectionRemarks}</p>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className={`mt-1 font-medium text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
