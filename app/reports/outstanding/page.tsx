"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Users,
  Wallet,
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
import { fetchOutstandingReport } from "@/app/store/reportsSlice";
import { reportApi } from "@/app/services/report.service";
import { OutstandingRow, OutstandingType } from "@/app/types/report";
import { formatCurrency } from "@/lib/utils";

/**
 * Outstanding Report — GET /api/reports/outstanding-report
 *
 * Renders two summary cards (Total Agencies, Total Outstanding) and a
 * table of one row per agency with opening balance, debit, credit, total
 * outstanding and balance type. A segmented control toggles the API
 * param between `type=RECEIVABLE` and `type=PAYABLE`.
 */
export default function OutstandingReportPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { addToast } = useToast();

  const { data, isLoading, error } = useAppSelector(
    (s) => s.reports.outstanding
  );

  const [outstandingType, setOutstandingType] =
    React.useState<OutstandingType>("RECEIVABLE");
  const [filters, setFilters] = React.useState<ReportFilterValues>({});

  const load = React.useCallback(
    (overrides?: { type?: OutstandingType; branchId?: string }) => {
      const params = {
        type: (overrides?.type ?? outstandingType) as OutstandingType,
        branchId: overrides?.branchId ?? filters.branchId,
      };
      dispatch(fetchOutstandingReport(params))
        .unwrap()
        .catch((err: string) => addToast(err || "Failed to load report", "error"));
    },
    [dispatch, outstandingType, filters.branchId, addToast]
  );

  React.useEffect(() => {
    load({ type: outstandingType });
    // Only re-run when the tab or branch filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outstandingType]);

  React.useEffect(() => {
    if (error) addToast(error, "error");
  }, [error, addToast]);

  const filterConfig: ReportFilterConfig[] = React.useMemo(
    () => [
      { type: "branch" },
    ],
    []
  );

  const summary: SummaryCardItem[] = React.useMemo(() => {
    const totalAgencies = data?.summary?.totalAgencies ?? 0;
    const totalOutstanding = data?.summary?.totalOutstanding ?? 0;
    const isReceivable = outstandingType === "RECEIVABLE";
    return [
      {
        title: isReceivable ? "Total Customers" : "Total Vendors",
        value: totalAgencies,
        hint: "Agencies with non-zero balance",
        icon: Users,
        iconBg: isReceivable ? "bg-emerald-50" : "bg-amber-50",
        iconColor: isReceivable ? "text-emerald-600" : "text-amber-600",
      },
      {
        title: isReceivable
          ? "Total Receivable"
          : "Total Payable",
        value: formatCurrency(totalOutstanding),
        hint: isReceivable
          ? "Amount owed to the organization"
          : "Amount owed by the organization",
        icon: Wallet,
        iconBg: isReceivable ? "bg-emerald-50" : "bg-amber-50",
        iconColor: isReceivable ? "text-emerald-600" : "text-amber-600",
      },
    ];
  }, [data, outstandingType]);

  const rows = data?.rows ?? [];

  const columns: ColumnDef<OutstandingRow>[] = React.useMemo(
    () => [
      {
        accessorKey: "agency_name",
        header: "Agency",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900">
              {row.original.agency_name ?? "-"}
            </p>
            {row.original.gstin && (
              <p className="text-[11px] font-mono text-gray-500">
                {row.original.gstin}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "agency_type",
        header: "Type",
        cell: ({ row }) =>
          row.original.agency_type ? (
            <Badge variant="outline" className="capitalize">
              {row.original.agency_type}
            </Badge>
          ) : (
            <span className="text-gray-400">-</span>
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
        accessorKey: "openingBalance",
        header: "Opening",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatCurrency(Number(row.original.openingBalance) || 0)}
          </span>
        ),
      },
      {
        accessorKey: "debit",
        header: "Debit",
        cell: ({ row }) => (
          <span className="tabular-nums text-emerald-700">
            {formatCurrency(Number(row.original.debit) || 0)}
          </span>
        ),
      },
      {
        accessorKey: "credit",
        header: "Credit",
        cell: ({ row }) => (
          <span className="tabular-nums text-rose-700">
            {formatCurrency(Number(row.original.credit) || 0)}
          </span>
        ),
      },
      {
        accessorKey: "total_outstanding",
        header: "Outstanding",
        cell: ({ row }) => (
          <span className="tabular-nums font-semibold text-gray-900">
            {formatCurrency(row.original.total_outstanding)}
          </span>
        ),
      },
      {
        accessorKey: "balanceType",
        header: "Balance",
        cell: ({ row }) => {
          const t = String(row.original.balanceType || "").toUpperCase();
          const isDebit = t.includes("DEBIT");
          return (
            <Badge
              variant={isDebit ? "success" : "error"}
              className={
                isDebit
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }
            >
              {isDebit ? "Debit" : "Credit"}
            </Badge>
          );
        },
      },
    ],
    []
  );

  const tabsNode = (
    <div className="inline-flex h-9 items-center bg-gray-100 p-0.5 rounded-md text-gray-600">
      <button
        type="button"
        onClick={() => setOutstandingType("RECEIVABLE")}
        className={
          "h-8 px-3 text-sm font-medium rounded inline-flex items-center gap-1.5 " +
          (outstandingType === "RECEIVABLE"
            ? "bg-white text-gray-900 shadow-sm"
            : "hover:text-gray-900")
        }
      >
        <ArrowDownToLine className="h-3.5 w-3.5" />
        Receivable
      </button>
      <button
        type="button"
        onClick={() => setOutstandingType("PAYABLE")}
        className={
          "h-8 px-3 text-sm font-medium rounded inline-flex items-center gap-1.5 " +
          (outstandingType === "PAYABLE"
            ? "bg-white text-gray-900 shadow-sm"
            : "hover:text-gray-900")
        }
      >
        <ArrowUpFromLine className="h-3.5 w-3.5" />
        Payable
      </button>
    </div>
  );

  return (
    <ReportLayout
      title="Outstanding Report"
      description={
        outstandingType === "RECEIVABLE"
          ? "Accounts receivable — money owed to your organization"
          : "Accounts payable — money owed by your organization"
      }
      generatedAt={data?.generatedAt}
      onRefresh={() => load()}
      isRefreshing={isLoading}
      actions={
        <ReportExportButton
          disabled={!data || rows.length === 0}
          onExport={() =>
            reportApi.exportOutstandingExcel({
              branchId: filters.branchId,
              type: outstandingType,
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
          onApply={() => load()}
          onReset={() => {
            setFilters({});
            load();
          }}
        />
      }
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      emptyMessage={`No ${outstandingType === "RECEIVABLE" ? "receivable" : "payable"} outstanding`}
      emptyDescription="Try a different branch or date range, or switch the tab."
    >
      {tabsNode}
      <div className="mt-3" />
      <ReportTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        onRowClick={() => router.push("/agencies")}
      />
    </ReportLayout>
  );
}
