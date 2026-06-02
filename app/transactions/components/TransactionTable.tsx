"use client";

import * as React from "react";
import { Eye, Pencil, Printer, ArrowDownToLine, ArrowUpFromLine, Wallet, Banknote, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { Agency, Branch, Transaction } from "../types/transaction";

interface TransactionTableProps {
  transactions: Transaction[];
  agencies: Agency[];
  branches: Branch[];
  onView: (txn: Transaction) => void;
  onEdit: (txn: Transaction) => void;
  onPrint: (txn: Transaction) => void;
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  actionSlot?: React.ReactNode;
}

export function TransactionTable({
  transactions,
  agencies,
  branches,
  onView,
  onEdit,
  onPrint,
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
  actionSlot,
}: TransactionTableProps) {
  const startIndex = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endIndex = Math.min(currentPage * limit, total);

  const agencyName = (id?: string) => agencies.find((a) => a.id === id)?.name || "-";
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || "-";

  const canEdit = (txn: Transaction) =>
    txn.status === "DRAFT" || txn.status === "PENDING_AUTHENTICATION";

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No transactions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Voucher No</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agency</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice Ref</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created By</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((txn) => {
                const isInward = txn.type === "INWARD";
                return (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium">{txn.voucherNo}</span>
                      <p className="text-[11px] text-gray-400">{branchName(txn.branchId)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(txn.voucherDate)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isInward
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {isInward ? (
                          <ArrowDownToLine className="h-3 w-3" />
                        ) : (
                          <ArrowUpFromLine className="h-3 w-3" />
                        )}
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {txn.isSuspense ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Suspense
                        </span>
                      ) : (
                        agencyName(txn.agencyId)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {txn.invoiceId || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                        {txn.payment.mode === "ONLINE" ? (
                          <Banknote className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Wallet className="h-3.5 w-3.5 text-blue-600" />
                        )}
                        {txn.payment.mode === "ONLINE" ? "Online" : "Offline Cash"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(txn.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={txn.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <p className="font-medium">{txn.createdByName}</p>
                      <p className="text-[11px] text-gray-400">{formatDate(txn.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onView(txn)}
                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit(txn) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(txn)}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onPrint(txn)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {actionSlot}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Showing {startIndex} to {endIndex} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages || 1, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
