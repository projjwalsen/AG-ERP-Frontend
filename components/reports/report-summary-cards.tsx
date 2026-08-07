"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SummaryCardItem {
  /** Display label (e.g. "Total Agencies") */
  title: string;
  /** Formatted value string (e.g. "₹12,345") — formatted by the caller. */
  value: string | number;
  /** Optional secondary text under the value. */
  hint?: string;
  /** Optional lucide icon. */
  icon?: React.ElementType;
  /** Tailwind background class for the icon container. */
  iconBg?: string;
  /** Tailwind text class for the icon. */
  iconColor?: string;
}

export function ReportSummaryCards({ items }: { items: SummaryCardItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    {item.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1.5 truncate">
                    {item.value}
                  </p>
                  {item.hint && (
                    <p className="text-xs text-gray-500 mt-1">{item.hint}</p>
                  )}
                </div>
                {Icon && (
                  <div
                    className={cn(
                      "shrink-0 p-2.5 rounded-xl",
                      item.iconBg ?? "bg-gray-100"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        item.iconColor ?? "text-gray-600"
                      )}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
