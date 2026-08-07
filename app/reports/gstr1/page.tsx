"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Receipt,
  FileText,
  Building2,
  Wallet,
  TrendingUp,
  Layers,
} from "lucide-react";
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
import { fetchGSTR1Report } from "@/app/store/reportsSlice";
import { reportApi } from "@/app/services/report.service";
import { GSTR1Row } from "@/app/types/report";
import { formatCurrency } from "@/lib/utils";

/**
 * GSTR-1 Outward Supplies Report — GET /api/reports/gstr1
 *
 * Lists approved sale invoices with B2B / B2C classification and the
 * CGST / SGST / IGST breakup. The summary cards mirror the GSTR-1
 * summary block the backend returns.
 */
export default function GSTR1ReportPage() {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const { data, isLoading, error } = useAppSelector((s) => s.reports.gstr1);

  const [filters, setFilters] = React.useState<ReportFilterValues>({});

  const load = React.useCallback(() => {
    dispatch(
      fetchGSTR1Report({
        branchId: filters.branchId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
    )
      .unwrap()
      .catch((err: string) =>
        addToast(err || "Failed to load GSTR-1 report", "error")
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
        title: "Total Invoices",
        value: s?.totalInvoices ?? 0,
        hint: "Approved sales invoices",
        icon: Receipt,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
      },
      {
        title: "Taxable Value",
        value: formatCurrency(s?.totalTaxableValue ?? 0),
        hint: "Sum of invoice subtotals",
        icon: FileText,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
      },
      {
        title: "Total GST",
        value: formatCurrency(s?.totalGST ?? 0),
        hint: `CGST ${formatCurrency(s?.totalCGST ?? 0)} · SGST ${formatCurrency(
          s?.totalSGST ?? 0
        )} · IGST ${formatCurrency(s?.totalIGST ?? 0)}`,
        icon: TrendingUp,
        iconBg: "bg-violet-50",
        iconColor: "text-violet-600",
      },
      {
        title: "Total Invoice Value",
        value: formatCurrency(s?.totalInvoiceValue ?? 0),
        hint: `B2B ${s?.b2bInvoices ?? 0} · B2C ${s?.b2cInvoices ?? 0}`,
        icon: Wallet,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
      },
    ];
  }, [data]);

  const rows = data?.rows ?? [];

  const columns: ColumnDef<GSTR1Row>[] = React.useMemo(
    () => [
      {
        accessorKey: "branchName",
        header: "Branch",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-gray-700">
            <Building2 className="h-3.5 w-3.5 text-gray-400" />
            <span>
              {row.original.branchName ?? "-"}
              {row.original.branchGst && (
                <span className="block text-[11px] font-mono text-gray-500">
                  {row.original.branchGst}
                </span>
              )}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "customer_gstin",
        header: "Customer GSTIN",
        cell: ({ row }) =>
          row.original.customer_gstin ? (
            <span className="font-mono text-xs text-gray-700">
              {row.original.customer_gstin}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">Unregistered</span>
          ),
      },
      {
        accessorKey: "invoice_number",
        header: "Invoice #",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-gray-700">
            {row.original.invoice_number}
          </span>
        ),
      },
      {
        accessorKey: "invoice_date",
        header: "Invoice Date",
        cell: ({ row }) => (
          <span className="text-gray-700">
            {new Date(row.original.invoice_date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        accessorKey: "place_of_supply_pos",
        header: "Place of Supply",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-gray-700">
            <Building2 className="h-3.5 w-3.5 text-gray-400" />
            {row.original.place_of_supply_pos ?? "-"}
          </div>
        ),
      },
      {
        accessorKey: "taxable_value",
        header: "Taxable",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatCurrency(row.original.taxable_value)}
          </span>
        ),
      },
      {
        accessorKey: "cgst_rate_amount",
        header: "CGST",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatCurrency(row.original.cgst_rate_amount)}
          </span>
        ),
      },
      {
        accessorKey: "sgst_rate_amount",
        header: "SGST",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatCurrency(row.original.sgst_rate_amount)}
          </span>
        ),
      },
      {
        accessorKey: "igst_rate_amount",
        header: "IGST",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatCurrency(row.original.igst_rate_amount)}
          </span>
        ),
      },
      {
        accessorKey: "invoice_total",
        header: "Invoice Total",
        cell: ({ row }) => (
          <span className="tabular-nums font-semibold text-gray-900">
            {formatCurrency(row.original.invoice_total)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <ReportLayout
      title="GSTR-1 Outward Supplies"
      description="Statutory report of approved sales invoices with B2B/B2C split and GST breakup"
      generatedAt={data?.generatedAt as string | undefined}
      onRefresh={load}
      isRefreshing={isLoading}
      actions={
        <ReportExportButton
          disabled={rows.length === 0}
          onExport={() =>
            reportApi.exportGSTR1Excel({
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
      emptyMessage="No invoices for the selected period"
      emptyDescription="Try widening the date range or selecting a different branch."
    >
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <Layers className="h-3.5 w-3.5" />
        Showing {rows.length} invoice{rows.length === 1 ? "" : "s"}
      </div>
      <ReportTable columns={columns} data={rows} isLoading={isLoading} />
    </ReportLayout>
  );
}
