"use client";

import * as React from "react";
import { RefreshCcw, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import { cn } from "@/lib/utils";

interface ReportHeaderProps {
  title: string;
  description?: string;
  /** Optional generated-at timestamp (string or Date) shown on the right. */
  generatedAt?: string | Date;
  /** Refresh handler — if omitted the refresh button is not rendered. */
  onRefresh?: () => void;
  /** Refresh button loading state. */
  isRefreshing?: boolean;
  /** Optional extra actions on the right (e.g. "Export Excel"). */
  actions?: React.ReactNode;
  /** Show a "Back to Reports" link. Default true. */
  showBack?: boolean;
  className?: string;
}

/**
 * Header shared by every report page. Wraps `PageHeader` (from
 * components/layout) and adds a generated-at label, a refresh button,
 * and a "Back to Reports" link.
 */
export function ReportHeader({
  title,
  description,
  generatedAt,
  onRefresh,
  isRefreshing,
  actions,
  showBack = true,
  className,
}: ReportHeaderProps) {
  return (
    <div className={cn("mb-5 space-y-2", className)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {showBack && (
            <Link
              href="/reports"
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-green-600 mb-2"
            >
              <ArrowLeft className="h-3 w-3" />
              All Reports
            </Link>
          )}
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-gray-500">{description}</p>
          )}
          {generatedAt && (
            <p className="mt-1 text-[11px] text-gray-400">
              Generated at{" "}
              {new Date(generatedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              loading={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
