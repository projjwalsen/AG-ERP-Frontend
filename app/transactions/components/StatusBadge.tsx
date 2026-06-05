"use client";

import * as React from "react";
import { statusColors, statusLabels, TransactionStatus } from "@/app/types/transaction";

interface StatusBadgeProps {
  status: TransactionStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const color = statusColors[status] || { bg: "bg-gray-100", text: "text-gray-700" };
  const label = statusLabels[status] || status;
  const sizing = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center ${sizing} rounded-full font-medium ${color.bg} ${color.text}`}
    >
      {label}
    </span>
  );
}
