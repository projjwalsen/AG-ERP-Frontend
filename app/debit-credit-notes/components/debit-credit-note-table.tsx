"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Download, Eye, FileText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/tables/data-table";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { DebitCreditNote, DebitCreditNoteType } from "@/app/types/debitCreditNote";

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

function formatNoteType(type: DebitCreditNoteType) {
  return type === "DEBIT_NOTE" ? "Debit Note" : "Credit Note";
}

function invoiceNo(note: DebitCreditNote) {
  return note.sale?.invoiceNo || note.purchase?.invoiceNo || "-";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status]?.bg || "bg-gray-100"} ${statusColors[status]?.text || "text-gray-700"}`}>
      {statusLabels[status] || status}
    </span>
  );
}

export interface DebitCreditNoteTablePagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DebitCreditNoteTableProps {
  notes: DebitCreditNote[];
  pagination: DebitCreditNoteTablePagination | null;
  onPageChange: (page: number) => void;
  onViewDetails: (note: DebitCreditNote) => void;
  onPreviewPdf: (note: DebitCreditNote) => void;
  onApprove?: (note: DebitCreditNote) => void;
  onReject?: (note: DebitCreditNote) => void;
  showApprovalActions?: boolean;
  pdfLoading?: boolean;
  actionLoading?: boolean;
}

export function DebitCreditNoteTable({
  notes,
  pagination,
  onPageChange,
  onViewDetails,
  onPreviewPdf,
  onApprove,
  onReject,
  showApprovalActions = false,
  pdfLoading = false,
  actionLoading = false,
}: DebitCreditNoteTableProps) {
  const columns = React.useMemo<ColumnDef<DebitCreditNote>[]>(
    () => [
      {
        accessorKey: "noteNo",
        header: "Note No",
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-sm font-semibold text-gray-900">{row.original.noteNo}</p>
            <p className="text-xs text-gray-500">{formatNoteType(row.original.type)}</p>
          </div>
        ),
      },
      {
        accessorKey: "agency.name",
        header: "Agency",
        cell: ({ row }) => (
          <div className="min-w-[220px]">
            <p className="font-medium text-gray-900">{row.original.agency?.name || "-"}</p>
            <p className="text-xs text-gray-500">{row.original.branch?.name || "-"}</p>
          </div>
        ),
      },
      {
        id: "invoice",
        header: "Invoice",
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-sm">{invoiceNo(row.original)}</p>
            <p className="text-xs text-gray-500">{row.original.sourceType}</p>
          </div>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-semibold text-green-700">
            {formatCurrency(Number(row.original.totalAmount || 0))}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "noteDate",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {formatDateTime(row.original.noteDate || row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const note = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                onClick={() => onViewDetails(note)}
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </Button>
              {note.status === "APPROVED" && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                  onClick={() => onPreviewPdf(note)}
                  loading={pdfLoading}
                  title="Generate PDF"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              )}
              {showApprovalActions && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-green-600 hover:bg-green-50 hover:text-green-700"
                    onClick={() => onApprove?.(note)}
                    disabled={actionLoading}
                    title="Approve"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => onReject?.(note)}
                    disabled={actionLoading}
                    title="Reject"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [actionLoading, onApprove, onPreviewPdf, onReject, onViewDetails, pdfLoading, showApprovalActions]
  );

  return (
    <Card className="mt-6">
      <CardContent className="p-0">
        <DataTable
          columns={columns}
          data={notes}
          manualPagination={pagination ? {
            pageIndex: Math.max(0, pagination.page - 1),
            pageSize: pagination.limit,
            pageCount: pagination.totalPages,
            total: pagination.total,
            onPageChange: (pageIndex) => onPageChange(pageIndex + 1),
          } : undefined}
        />
      </CardContent>
    </Card>
  );
}

export function DebitCreditNoteDetailsDialog({
  note,
  loading,
  onClose,
}: {
  note: DebitCreditNote | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(note) || loading} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Debit / Credit Note Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
          </div>
        ) : note ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">Note No</p>
                  <p className="font-mono font-semibold">{note.noteNo}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Type</p>
                  <p className="font-semibold">{formatNoteType(note.type)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Status</p>
                  <StatusBadge status={note.status} />
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Amount</p>
                  <p className="font-semibold text-green-700">{formatCurrency(Number(note.totalAmount || 0))}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoBlock title="Agency" value={note.agency?.name || "-"} />
              <InfoBlock title="Branch" value={note.branch?.name || "-"} hint={note.branch?.code} />
              <InfoBlock title="Invoice" value={invoiceNo(note)} hint={note.sourceType} />
              <InfoBlock title="Note Date" value={formatDateTime(note.noteDate || note.createdAt)} />
            </div>

            <div className="rounded-lg border border-gray-200">
              <div className="border-b bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">Particulars</div>
              <div className="divide-y divide-gray-100">
                {note.particulars.map((particular) => (
                  <div key={particular.id} className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[1fr_160px]">
                    <p className="text-sm text-gray-700">{particular.description}</p>
                    <p className="text-right text-sm font-semibold text-gray-900">{formatCurrency(Number(particular.amount || 0))}</p>
                  </div>
                ))}
              </div>
            </div>

            {note.narration && <InfoBlock title="Narration" value={note.narration} />}
            {note.rejectionRemarks && <InfoBlock title="Rejection Remarks" value={note.rejectionRemarks} />}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoBlock title="Created By" value={note.createdBy?.name || "-"} hint={formatDateTime(note.createdAt)} />
              <InfoBlock title="Approved By" value={note.approvedBy?.name || "-"} hint={note.approvedAt ? formatDateTime(note.approvedAt) : undefined} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InfoBlock({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase text-gray-500">{title}</p>
      <p className="mt-1 font-medium text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function DebitCreditNotePdfDialog({
  open,
  objectUrl,
  title,
  onClose,
  onDownload,
  downloadLoading,
}: {
  open: boolean;
  objectUrl: string | null;
  title: string;
  onClose: () => void;
  onDownload: () => void;
  downloadLoading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-5xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="relative flex-1 bg-gray-100">
          {objectUrl ? (
            <iframe
              src={`${objectUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              title={title}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={onDownload} loading={downloadLoading} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
