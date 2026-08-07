"use client";

import * as React from "react";
import { Building2, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Agency, TransactionDirection as TransactionType } from "@/app/types/transaction";

interface AgencyBalanceCardProps {
  agency: Agency;
  type: TransactionType;
  outstandingAmount: number;
  pendingAmount: number;
  label?: string;
  variant?: "primary" | "third-party";
}

export function AgencyBalanceCard({
  agency,
  type,
  outstandingAmount,
  pendingAmount,
  label,
  variant = "primary",
}: AgencyBalanceCardProps) {
  const isInward = type === "INWARD";
  const accentRing =
    variant === "primary"
      ? isInward
        ? "border-green-200 bg-green-50/40"
        : "border-blue-200 bg-blue-50/40"
      : "border-purple-200 bg-purple-50/40";
  const iconWrap =
    variant === "primary"
      ? isInward
        ? "bg-green-100"
        : "bg-blue-100"
      : "bg-purple-100";
  const iconColor =
    variant === "primary"
      ? isInward
        ? "text-green-600"
        : "text-blue-600"
      : "text-purple-600";

  return (
    <div className={`border rounded-lg p-4 ${accentRing}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${iconWrap}`}>
          <Building2 className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          {label && (
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">
              {label}
            </p>
          )}
          <p className="text-sm font-semibold text-gray-900 truncate">
            {agency.name}
          </p>
          <p className="text-[11px] text-gray-500 uppercase">{agency.type}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-gray-200 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase">
            <AlertCircle className="h-3 w-3" />
            DUE Amount
          </div>
          <p className="text-sm font-semibold text-red-600 mt-0.5">
            {formatCurrency(outstandingAmount)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase">
            <Clock className="h-3 w-3" />
            Amount Receivable
          </div>
          <p className="text-sm font-semibold text-amber-600 mt-0.5">
            {formatCurrency(pendingAmount)}
          </p>
        </div>
      </div>
    </div>
  );
}

