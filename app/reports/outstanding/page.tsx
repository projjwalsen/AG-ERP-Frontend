"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Eye,
  FileText,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  OutstandingDetailRow,
  OutstandingRow,
  OutstandingType,
  OutstandingBucketKey,
} from "@/app/types/report";
import { formatCurrency, cn } from "@/lib/utils";

type ViewMode = "agency" | "detail";

interface BucketColumn {
  key: OutstandingBucketKey;
  label: string;
}

const BUCKET_COLUMNS: BucketColumn[] = [
  { key: "bucket_0_60_days", label: "0-60 Days" },
  { key: "bucket_61_120_days", label: "61-120 Days" },
  { key: "bucket_121_180_days", label: "121-180 Days" },
  { key: "bucket_180_plus_days", label: "180+ Days" },
];

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Bucket breakdown now lives on its own page at
// /reports/outstanding-report/:agencyId — the modal that used to live
// here (BucketsDialog + BucketInvoiceTable) was removed.

export default function OutstandingReportPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { addToast } = useToast();

  const { data, isLoading, error } = useAppSelector(
    (s) => s.reports.outstanding
  );

  const [outstandingType, setOutstandingType] =
    React.useState<OutstandingType>("AR");
  const [viewMode, setViewMode] = React.useState<ViewMode>("agency");
  const [filters, setFilters] = React.useState<ReportFilterValues>({});

  // The on-screen tabs are AR/AP but the backend expects
  // RECEIVABLE/PAYABLE. Map at the wire boundary so the tab labels
  // (and the OutstandingType union on the frontend) stay unchanged.
  const toBackendType = (t: OutstandingType): "RECEIVABLE" | "PAYABLE" =>
    t === "AR" ? "RECEIVABLE" : "PAYABLE";

  const load = React.useCallback(
    (overrides?: { type?: OutstandingType; branchId?: string }) => {
      const params = {
        // Frontend value stays as AR/AP; the slice remaps to
        // RECEIVABLE/PAYABLE before hitting the backend.
        type: toBackendType(overrides?.type ?? outstandingType),
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
  }, [outstandingType, load]);

  React.useEffect(() => {
    if (error) addToast(error, "error");
  }, [error, addToast]);

  const filterConfig: ReportFilterConfig[] = React.useMemo(
    () => [{ type: "branch" }],
    []
  );

  const isReceivable = outstandingType === "AR";

  const summary: SummaryCardItem[] = React.useMemo(() => {
    const totalAgencies = data?.summary?.totalAgencies ?? 0;
    const totalInvoices = data?.summary?.totalInvoices ?? 0;
    const totalOutstanding = data?.summary?.totalOutstanding ?? 0;
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
        title: "Total Invoices",
        value: totalInvoices,
        hint: "Unsettled invoices included",
        icon: FileText,
        iconBg: "bg-sky-50",
        iconColor: "text-sky-600",
      },
      {
        title: isReceivable ? "Total Receivable" : "Total Payable",
        value: formatCurrency(totalOutstanding),
        hint: isReceivable
          ? "Amount owed to the organization"
          : "Amount owed by the organization",
        icon: Wallet,
        iconBg: isReceivable ? "bg-emerald-50" : "bg-amber-50",
        iconColor: isReceivable ? "text-emerald-600" : "text-amber-600",
      },
      {
        title: "Oldest Bucket",
        value: formatCurrency(data?.summary?.bucket_180_plus_days ?? 0),
        hint: "Invoices aged 180+ days",
        icon: Receipt,
        iconBg:
            (data?.summary?.bucket_180_plus_days ?? 0) > 0
            ? "bg-rose-50"
            : "bg-gray-100",
        iconColor:
            (data?.summary?.bucket_180_plus_days ?? 0) > 0
            ? "text-rose-600"
            : "text-gray-500",
      },
    ];
  }, [data, isReceivable]);

  const agencyRows = data?.rows ?? [];
  const detailRows: OutstandingDetailRow[] = data?.detailRows ?? [];
  const tableData = viewMode === "agency" ? agencyRows : detailRows;
  const tableIsEmpty =
    !isLoading && viewMode === "agency"
      ? agencyRows.length === 0
      : detailRows.length === 0;

  const openBuckets = (row: OutstandingRow) => {
    // View bucket now opens a dedicated page at
    // /reports/outstanding-report/:agencyId instead of a modal.
    // The page re-uses the same Redux thunk + filter context.
    const params = new URLSearchParams();
    params.set("type", outstandingType);
    if (filters.branchId) params.set("branchId", filters.branchId);
    router.push(
      `/reports/outstanding-report/${row.agencyId}?${params.toString()}`
    );
  };

  const agencyColumns: ColumnDef<OutstandingRow>[] = React.useMemo(
    () => [
      {
        accessorKey: "vendorCode",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-gray-700">
            {row.original.vendorCode ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "agencyName",
        header: isReceivable ? "Customer" : "Vendor",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900">
              {row.original.agencyName}
            </p>
          </div>
        ),
      },
      ...BUCKET_COLUMNS.map<ColumnDef<OutstandingRow>>(
        ({ key, label }) => ({
          id: key,
          accessorFn: (row) => row[key]?.amount ?? 0,
          header: label,
          cell: ({ row }) => {
            const amount = row.original[key]?.amount ?? 0;
            const count = row.original[key]?.invoices?.length ?? 0;
            return (
              <div className="tabular-nums text-right">
                <div
                  className={cn(
                    "font-medium",
                    amount === 0 ? "text-gray-400" : "text-gray-900"
                  )}
                >
                  {formatCurrency(amount)}
                </div>
                {count > 0 && (
                  <div className="text-[11px] text-gray-500">
                    {count} {count === 1 ? "invoice" : "invoices"}
                  </div>
                )}
              </div>
            );
          },
        })
      ),
      {
        id: "totalOutstanding",
        accessorFn: (row) => row.totalOutstanding,
        header: () => <div className="text-right">Total Outstanding</div>,
        cell: ({ row }) => (
          <div className="tabular-nums text-right">
            <span className="font-semibold text-gray-900">
              {formatCurrency(row.original.totalOutstanding)}
            </span>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const totalInvoices = BUCKET_COLUMNS.reduce(
            (sum, { key }) => sum + (row.original[key]?.invoices?.length ?? 0),
            0
          );
          const disabled = totalInvoices === 0;
          return (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => openBuckets(row.original)}
                className="h-8 gap-1.5"
                title={
                  disabled
                    ? "No outstanding invoices"
                    : "View bucket breakdown"
                }
              >
                <Eye className="h-3.5 w-3.5" />
                Buckets
              </Button>
            </div>
          );
        },
      },
    ],
    [isReceivable]
  );

  const detailColumns: ColumnDef<OutstandingDetailRow>[] = React.useMemo(
    () => [
      {
        accessorKey: "vendorCode",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-gray-700">
            {row.original.vendorCode
              ? row.original.vendorCode.slice(0, 8)
              : "-"}
          </span>
        ),
      },
      {
        accessorKey: "vendorName",
        header: isReceivable ? "Customer" : "Vendor",
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">
            {row.original.vendorName}
          </span>
        ),
      },
      {
        accessorKey: "billNo",
        header: "Bill #",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-gray-700">
            {row.original.billNo ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "billDate",
        header: "Bill Date",
        cell: ({ row }) => (
          <span className="text-gray-700">{formatDate(row.original.billDate)}</span>
        ),
      },
      {
        accessorKey: "dueDate",
        header: "Due Date",
        cell: ({ row }) => (
          <span className="text-gray-700">{formatDate(row.original.dueDate)}</span>
        ),
      },
      {
        accessorKey: "billAmount",
        header: () => <div className="text-right">Bill Amount</div>,
        cell: ({ row }) => (
          <div className="tabular-nums text-right text-gray-900">
            {formatCurrency(row.original.billAmount)}
          </div>
        ),
      },
      {
        accessorKey: "paidAmount",
        header: () => <div className="text-right">Paid</div>,
        cell: ({ row }) => (
          <div className="tabular-nums text-right text-gray-700">
            {formatCurrency(row.original.paidAmount)}
          </div>
        ),
      },
      {
        accessorKey: "balanceAmount",
        header: () => <div className="text-right">Balance</div>,
        cell: ({ row }) => (
          <div className="tabular-nums text-right font-semibold text-gray-900">
            {formatCurrency(row.original.balanceAmount)}
          </div>
        ),
      },
      {
        accessorKey: "agingDays",
        header: "Age",
        cell: ({ row }) => (
          <span className="tabular-nums text-gray-700">
            {row.original.agingDays}d
          </span>
        ),
      },
      {
        accessorKey: "agingBucket",
        header: "Bucket",
        cell: ({ row }) => (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-0">
            {row.original.agingBucket}
          </Badge>
        ),
      },
    ],
    [isReceivable]
  );

  const tabsNode = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="inline-flex h-9 items-center bg-gray-100 p-0.5 rounded-md text-gray-600">
        <button
          type="button"
          onClick={() => setOutstandingType("AR")}
          className={
            "h-8 px-3 text-sm font-medium rounded inline-flex items-center gap-1.5 " +
            (outstandingType === "AR"
              ? "bg-white text-gray-900 shadow-sm"
              : "hover:text-gray-900")
          }
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          AR
        </button>
        <button
          type="button"
          onClick={() => setOutstandingType("AP")}
          className={
            "h-8 px-3 text-sm font-medium rounded inline-flex items-center gap-1.5 " +
            (outstandingType === "AP"
              ? "bg-white text-gray-900 shadow-sm"
              : "hover:text-gray-900")
          }
        >
          <ArrowUpFromLine className="h-3.5 w-3.5" />
          AP
        </button>
      </div>

      <div className="inline-flex h-9 items-center bg-gray-100 p-0.5 rounded-md text-gray-600">
        <button
          type="button"
          onClick={() => setViewMode("agency")}
          className={
            "h-8 px-3 text-sm font-medium rounded " +
            (viewMode === "agency"
              ? "bg-white text-gray-900 shadow-sm"
              : "hover:text-gray-900")
          }
        >
          By Agency
        </button>
        <button
          type="button"
          onClick={() => setViewMode("detail")}
          className={
            "h-8 px-3 text-sm font-medium rounded inline-flex items-center gap-1.5 " +
            (viewMode === "detail"
              ? "bg-white text-gray-900 shadow-sm"
              : "hover:text-gray-900")
          }
        >
          <Building2 className="h-3.5 w-3.5" />
          Detail
        </button>
      </div>
    </div>
  );

  return (
    <ReportLayout
      title="AP/AR report"
      description={
        outstandingType === "AR"
          ? "Accounts receivable — money owed to your organization"
          : "Accounts payable — money owed by your organization"
      }
      generatedAt={data?.generatedAt}
      onRefresh={() => load()}
      isRefreshing={isLoading}
      actions={
        <ReportExportButton
          disabled={!data || tableData.length === 0}
          onExport={() =>
            reportApi.exportOutstandingExcel({
              branchId: filters.branchId,
              type: toBackendType(outstandingType),
            })
          }
        />
      }
      summary={summary}
      toolbar={
        // Stack the AR/AP + By Agency/Detail toggle above the standard
        // ReportFilters row so the tabs stay visible even when the
        // current view is empty (e.g. AP tab with no payables —
        // previously the empty state replaced the children and hid the
        // tabs entirely).
        <div className="space-y-3">
          {tabsNode}
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
        </div>
      }
      isLoading={isLoading}
      isEmpty={tableIsEmpty}
      emptyMessage={`No ${outstandingType === "AR" ? "receivable" : "AP"} outstanding`}
      emptyDescription="Try a different branch or date range, or switch the tab."
    >
      {viewMode === "agency" ? (
        <ReportTable
          columns={agencyColumns}
          data={agencyRows}
          isLoading={isLoading}

        />
      ) : (
        <ReportTable
          columns={detailColumns}
          data={detailRows}
          isLoading={isLoading}

        />
      )}

      {/* Bucket breakdown moved to a dedicated page at
          /reports/outstanding-report/:agencyId — see that route for
          the full breakdown + Excel export. */}
    </ReportLayout>
  );
}
