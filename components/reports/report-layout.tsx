"use client";

import * as React from "react";
import { ToastContainer } from "@/components/ui/toast";
import { ReportHeader } from "./report-header";
import { ReportLoader } from "./report-loader";
import { ReportEmpty } from "./report-empty";
import { ReportSummaryCards, SummaryCardItem } from "./report-summary-cards";

interface ReportLayoutProps {
  title: string;
  description?: string;
  generatedAt?: string | Date;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  actions?: React.ReactNode;
  /** Summary cards. Pass an empty array to hide. */
  summary?: SummaryCardItem[];
  /** Filters / toolbar row (rendered between summary and table). */
  toolbar?: React.ReactNode;
  /** When true, the table area shows the loader skeleton. */
  isLoading?: boolean;
  /** Render-prop for the table — only called when not loading. */
  children?: React.ReactNode;
  /** When the report has finished loading but has no rows. */
  isEmpty?: boolean;
  /** Empty-state copy + CTA. */
  emptyMessage?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

/**
 * Top-level layout for every report. Renders:
 *   1. Header (title, refresh, actions)
 *   2. Summary cards
 *   3. Filters / toolbar
 *   4. Loading skeleton OR content OR empty state
 *
 * Each individual report page only needs to provide data — the layout
 * standardises the chrome.
 */
export function ReportLayout({
  title,
  description,
  generatedAt,
  onRefresh,
  isRefreshing,
  actions,
  summary,
  toolbar,
  isLoading = false,
  children,
  isEmpty = false,
  emptyMessage,
  emptyDescription,
  emptyAction,
}: ReportLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 space-y-5">
      <ReportHeader
        title={title}
        description={description}
        generatedAt={generatedAt}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        actions={actions}
      />

      {summary && summary.length > 0 && <ReportSummaryCards items={summary} />}

      {toolbar}

      {isLoading ? (
        <ReportLoader />
      ) : isEmpty ? (
        <ReportEmpty
          message={emptyMessage ?? "No data available"}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        children
      )}

      <ToastContainer />
    </div>
  );
}
