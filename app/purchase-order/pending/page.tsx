"use client";

import * as React from "react";
import { ArrowLeft, CheckCircle, Eye, Search, XCircle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/tables";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  approvePurchaseOrder,
  fetchAllPurchaseOrders,
  rejectPurchaseOrder,
} from "@/app/store/purchaseOrdersSlice";
import { purchaseOrderApi } from "@/app/services/purchase-order.service";
import type { PurchaseOrder } from "@/app/types/purchase-order";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";

export default function PendingPurchaseOrdersPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();
  const { purchaseOrders, isLoading, pagination } = useAppSelector((state) => state.purchaseOrders);
  const { permissions } = useAppSelector((state) => state.auth);

  const canApprove = hasModulePermission(permissions, "PURCHASE", "APPROVE");
  const canView = hasModulePermission(permissions, "PURCHASE", "VIEW");

  const [pageIndex, setPageIndex] = React.useState(0);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);
  const [rejectionRemarks, setRejectionRemarks] = React.useState("");
  const [viewModal, setViewModal] = React.useState<{ open: boolean; order: PurchaseOrder | null }>({
    open: false,
    order: null,
  });
  const [approveModal, setApproveModal] = React.useState<{ open: boolean; order: PurchaseOrder | null }>({
    open: false,
    order: null,
  });
  const [rejectModal, setRejectModal] = React.useState<{ open: boolean; order: PurchaseOrder | null }>({
    open: false,
    order: null,
  });

  const fetchPendingOrders = React.useCallback(async () => {
    try {
      await dispatch(
        fetchAllPurchaseOrders({
          page: pageIndex + 1,
          limit: 10,
          status: "PENDING",
          search: searchTerm.trim() || undefined,
        })
      ).unwrap();
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : String(error || "Failed to fetch pending purchase orders"), "error");
    }
  }, [addToast, dispatch, pageIndex, searchTerm]);

  React.useEffect(() => {
    fetchPendingOrders();
  }, [fetchPendingOrders]);

  const handleView = async (order: PurchaseOrder) => {
    setViewModal({ open: true, order: null });
    try {
      const response = await purchaseOrderApi.getById(order.id);
      setViewModal({ open: true, order: response.data || order });
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : "Failed to fetch purchase order", "error");
      setViewModal({ open: false, order: null });
    }
  };

  const handleApprove = async () => {
    if (!approveModal.order) return;
    setActionLoading(true);
    try {
      await dispatch(approvePurchaseOrder(approveModal.order.id)).unwrap();
      setApproveModal({ open: false, order: null });
      addToast("Purchase order approved successfully", "success");
      await fetchPendingOrders();
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : String(error || "Failed to approve purchase order"), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.order || !rejectionRemarks.trim()) {
      addToast("Please provide rejection reason", "error");
      return;
    }
    setActionLoading(true);
    try {
      await dispatch(
        rejectPurchaseOrder({
          purchaseOrderId: rejectModal.order.id,
          remarks: rejectionRemarks.trim(),
        })
      ).unwrap();
      setRejectModal({ open: false, order: null });
      setRejectionRemarks("");
      addToast("Purchase order rejected", "success");
      await fetchPendingOrders();
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : String(error || "Failed to reject purchase order"), "error");
    } finally {
      setActionLoading(false);
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
        id: "branch",
        header: "Branch",
        cell: ({ row }) => row.original.branch?.name || "-",
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
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {canApprove && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-green-600 hover:bg-green-50 hover:text-green-700"
                  onClick={(event) => {
                    event.stopPropagation();
                    setApproveModal({ open: true, order: row.original });
                  }}
                  title="Approve"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={(event) => {
                    event.stopPropagation();
                    setRejectModal({ open: true, order: row.original });
                  }}
                  title="Reject"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
            {canView && (
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-600 hover:bg-gray-100"
                onClick={(event) => {
                  event.stopPropagation();
                  handleView(row.original);
                }}
                title="View"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canApprove, canView]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => router.push("/purchase-order")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase Order
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Pending Purchase Orders</h1>
        <p className="mt-1 text-gray-500">Approve or reject purchase orders waiting for review</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
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
        <span className="text-sm text-gray-500">{pagination?.total || purchaseOrders.length} pending</span>
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

      <Dialog open={approveModal.open} onOpenChange={(open) => !open && setApproveModal({ open: false, order: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Approve Purchase Order
            </DialogTitle>
          </DialogHeader>
          <OrderSummaryBox order={approveModal.order} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApproveModal({ open: false, order: null })}>
              Cancel
            </Button>
            <Button onClick={handleApprove} loading={actionLoading} className="bg-green-600 hover:bg-green-700">
              Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectModal.open} onOpenChange={(open) => !open && setRejectModal({ open: false, order: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Reject Purchase Order
            </DialogTitle>
          </DialogHeader>
          <OrderSummaryBox order={rejectModal.order} />
          <div className="space-y-2">
            <Label htmlFor="rejectionRemarks">Rejection Reason *</Label>
            <Textarea
              id="rejectionRemarks"
              value={rejectionRemarks}
              onChange={(event) => setRejectionRemarks(event.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectModal({ open: false, order: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} loading={actionLoading}>
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewModal.open} onOpenChange={(open) => !open && setViewModal({ open: false, order: null })}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Purchase Order Details
            </DialogTitle>
          </DialogHeader>
          {viewModal.order ? <OrderSummaryDetails order={viewModal.order} /> : null}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewModal({ open: false, order: null })}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ToastContainer />
    </div>
  );
}

function OrderSummaryBox({ order }: { order: PurchaseOrder | null }) {
  return (
    <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">PO No:</span>
        <span className="font-mono font-medium">{order?.poNo || "-"}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Vendor:</span>
        <span className="font-medium">{order?.agency?.name || "-"}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Items:</span>
        <span className="font-medium">{order?.items?.length || 0}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Order Value:</span>
        <span className="font-semibold text-green-700">{formatCurrency(Number(order?.subtotalAmount || 0))}</span>
      </div>
    </div>
  );
}

function OrderSummaryDetails({ order }: { order: PurchaseOrder }) {
  return (
    <div className="space-y-5">
      <OrderSummaryBox order={order} />
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Product</th>
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
    </div>
  );
}
