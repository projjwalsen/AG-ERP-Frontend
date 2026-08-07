"use client";

import * as React from "react";
import { AlertCircle, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/**
 * Compact single-row balance strip rendered directly beneath an agency
 * selector. Shows exactly ONE figure — either "DUE Amount" (outstanding
 * we owe / are owed) or "Amount Receivable" (pending incoming) — depending
 * on the `metric` prop.
 *
 * Used in the new-transaction form:
 *  - INWARD  primary agency → DUE
 *  - INWARD  3rd party      → Receivable
 *  - OUTWARD primary agency → Receivable
 *  - OUTWARD 3rd party      → DUE
 */
export type BalanceMetric = "DUE" | "RECEIVABLE";

interface AgencyBalanceStripProps {
  metric: BalanceMetric;
  amount: number;
  className?: string;
}

export function AgencyBalanceStrip({
  metric,
  amount,
  className = "",
}: AgencyBalanceStripProps) {
  const isDue = metric === "DUE";
  return (
    <div
      className={`mt-2 flex items-center justify-between border rounded-lg px-3 py-2 ${
        isDue
          ? "border-red-100 bg-red-50/40"
          : "border-amber-100 bg-amber-50/40"
      } ${className}`}
    >
      <div
        className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wide ${
          isDue ? "text-red-700" : "text-amber-700"
        }`}
      >
        {isDue ? (
          <AlertCircle className="h-3.5 w-3.5" />
        ) : (
          <Clock className="h-3.5 w-3.5" />
        )}
        {isDue ? "DUE Amount" : "Amount Receivable"}
      </div>
      <p
        className={`text-sm font-semibold ${
          isDue ? "text-red-600" : "text-amber-600"
        }`}
      >
        {formatCurrency(amount)}
      </p>
    </div>
  );
}
