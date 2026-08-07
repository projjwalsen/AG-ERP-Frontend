"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Wallet,
  Inbox,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  ReportLayout,
  ReportTable,
  ReportFilters,
  ReportExportButton,
  ReportFilterConfig,
  ReportFilterValues,
  SummaryCardItem,
} from "@/components/reports";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchGSTSuspenseLog } from "@/app/store/reportsSlice";
import { reportApi } from "@/app/services/report.service";
import { SuspenseRow } from "@/app/types/report";
import { formatCurrency } from "@/lib/utils";

/**
 * GST Suspense Log — GET /api/reports/gst-suspense-log
 *
 * Lists suspense (unidentified) transactions with their authentication
 * status. The status badge is driven by `auth_status` — AUTHENTICATED
 * entries are tied to a known agency; PENDING_AUTHENTICATION ones are
 * not.
 */
export default function GSTSuspenseLogPage() {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const { data, isLoading, error } = useAppSelector((s) => s.reports.suspense);

  const [filters, setFilters] = React.useState<ReportFilterValues>({});

  const load = React.useCallback(() => {
    dispatch(
      fetchGSTSuspenseLog({
        branchId: filters.branchId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
    )
      .unwrap()
      .catch((err: string) =>
        addToast(err || "Failed to load suspense log", "error")
      );
  }, [dispatch, filters.branchId, filters.startDate, filters.endDate, addToast]);

  React.useEffect(() => {
    load();
    // Initial fetch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (error) addToast(error, "error");
  }, [error, addToast]);

  const filterConfig: ReportFilterConfig[] = React.useMemo(
    () => [{ type: "branch" }, { type: "dateRange" }],
    []
  );

  const summary: SummaryCardItem[] = React.useMemo(() => {
    const s = data?.summary;
    return [
      {
        title: "Total Entries",
        value: s?.totalSuspenseEntries ?? 0,
        hint: "Suspense transactions in window",
        icon: Inbox,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
      },
      {
        title: "Pending Authentication",
        value: s?.pendingAuthentication ?? 0,
        hint: "Awaiting agency identification",
        icon: Clock,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
      },
      {
        title: "Authenticated",
        value: s?.authenticated ?? 0,
        hint: "Linked to a known agency",
        icon: CheckCircle2,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
      },
      {
        title: "Total Amount",
        value: formatCurrency(s?.totalAmount ?? 0),
        hint: "Across all suspense entries",
        icon: Wallet,
        iconBg: "bg-rose-50",
        iconColor: "text-rose-600",
      },
    ];
  }, [data]);

  const rows = data?.rows ?? [];

  const columns: ColumnDef<SuspenseRow>[] = React.useMemo(
    () => [
      {
        accessorKey: "suspense_id",
        header: "Suspense ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-gray-700">
            {row.original.suspense_id}
          </span>
        ),
      },
      {
        accessorKey: "bank_clearance_date",
        header: "Clearance Date",
        cell: ({ row }) => (
          <span className="text-gray-700">
            {new Date(row.original.bank_clearance_date).toLocaleDateString(
              "en-IN",
              { day: "2-digit", month: "short", year: "numeric" }
            )}
          </span>
        ),
      },
      {
        accessorKey: "amount_received",
        header: "Amount",
        cell: ({ row }) => (
          <span className="tabular-nums font-semibold text-gray-900">
            {formatCurrency(row.original.amount_received)}
          </span>
        ),
      },
      {
        accessorKey: "payment_channel",
        header: "Channel",
        cell: ({ row }) =>
          row.original.payment_channel ? (
            <Badge variant="outline">{row.original.payment_channel}</Badge>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        accessorKey: "agency_name",
        header: "Agency",
        cell: ({ row }) =>
          row.original.agency_name ? (
            <span className="text-gray-700">{row.original.agency_name}</span>
          ) : (
            <span className="text-gray-400 italic">Unidentified</span>
          ),
      },
      {
        accessorKey: "branch",
        header: "Branch",
        cell: ({ row }) =>
          row.original.branch ? (
            <div className="flex items-center gap-1 text-gray-700">
              <Building2 className="h-3.5 w-3.5 text-gray-400" />
              {row.original.branch.name}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        accessorKey: "reported_remarks",
        header: "Remarks",
        cell: ({ row }) => (
          <span className="text-gray-600 text-xs line-clamp-2">
            {row.original.reported_remarks}
          </span>
        ),
      },
      {
        accessorKey: "auth_status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.auth_status;
          if (s === "AUTHENTICATED") {
            return (
              <Badge
                variant="success"
                className="bg-emerald-50 text-emerald-700"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Authenticated
              </Badge>
            );
          }
          return (
            <Badge variant="warning" className="bg-amber-50 text-amber-700">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Pending Authentication
            </Badge>
          );
        },
      },
    ],
    []
  );

  return (
    <ReportLayout
      title="GST Suspense Log"
      description="Track unidentified funds awaiting authentication and reconciliation"
      generatedAt={data?.generatedAt as string | undefined}
      onRefresh={load}
      isRefreshing={isLoading}
      actions={
        <ReportExportButton
          disabled={rows.length === 0}
          onExport={() =>
            reportApi.exportGSTSuspenseExcel({
              branchId: filters.branchId,
              startDate: filters.startDate,
              endDate: filters.endDate,
            })
          }
        />
      }
      summary={summary}
      toolbar={
        <ReportFilters
          config={filterConfig}
          values={filters}
          onChange={setFilters}
          onApply={load}
          onReset={() => {
            setFilters({});
            load();
          }}
        />
      }
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      emptyMessage="No suspense entries in the selected period"
      emptyDescription="Try widening the date range or selecting a different branch."
    >
      <ReportTable columns={columns} data={rows} isLoading={isLoading} />
    </ReportLayout>
  );
}
