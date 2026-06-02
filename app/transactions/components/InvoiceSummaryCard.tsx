"use client";

import * as React from "react";
import { FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Agency, Invoice } from "../types/transaction";

interface InvoiceSummaryCardProps {
  invoice: Invoice | null;
  agency?: Agency | null;
}

export function InvoiceSummaryCard({ invoice, agency }: InvoiceSummaryCardProps) {
  if (!invoice) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No invoice selected</p>
        </CardContent>
      </Card>
    );
  }

  const hasOutstanding = invoice.outstandingAmount > 0;
  const outstandingColor = hasOutstanding ? "text-red-600" : "text-green-600";
  const OutstandingIcon = hasOutstanding ? AlertCircle : CheckCircle2;
  const outstandingBg = hasOutstanding ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200";

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Invoice</p>
              <p className="font-mono font-semibold text-gray-900">{invoice.invoiceNo}</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              invoice.status === "PAID"
                ? "bg-green-100 text-green-700"
                : invoice.status === "PARTIALLY_PAID"
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {invoice.status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50">
          <div>
            <p className="text-xs text-gray-500 uppercase">Invoice Date</p>
            <p className="font-medium text-sm">{formatDate(invoice.invoiceDate)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Agency</p>
            <p className="font-medium text-sm truncate">{agency?.name || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Taxable Amount</p>
            <p className="font-medium text-sm">{formatCurrency(invoice.taxableAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">GST</p>
            <p className="font-medium text-sm text-blue-600">{formatCurrency(invoice.gstAmount)}</p>
          </div>
        </div>

        <div className="p-4 grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase">Paid</p>
            <p className="text-sm font-semibold text-green-600">{formatCurrency(invoice.paidAmount)}</p>
          </div>
          <div className={`${outstandingBg} border rounded-lg p-3`}>
            <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
              <OutstandingIcon className="h-3 w-3" />
              Outstanding
            </p>
            <p className={`text-sm font-semibold ${outstandingColor}`}>
              {formatCurrency(invoice.outstandingAmount)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
