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
import { reportApi } from "@/app/services/report.service";
import { GSTR1ReportResponse, GSTR1Row } from "@/app/types/report";
import { formatCurrency } from "@/lib/utils";

/**
 * GSTR-1 Outward Supplies Report — GET /api/reports/gstr1
 *
 * Lists approved sale invoices with B2B / B2C classification and the
 * CGST / SGST / IGST breakup. The summary cards mirror the GSTR-1
 * summary block the backend returns.
 */
export default function GSTR1ReportPage() {
  const { addToast } = useToast();
  const [data, setData] = React.useState<GSTR1ReportResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [filters, setFilters] = React.useState<ReportFilterValues>({});

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    reportApi.getsrv1GSTR1Report()
      .then((response) => {
        if (!response.success || !response.data) throw new Error(response.message || "Failed to load GSTR-1 report");
        setData(response.data);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load GSTR-1 report";
        setError(message);
        addToast(message, "error");
      })
      .finally(() => setIsLoading(false));
  }, [addToast]);

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
  const summaryRows = [
    ...(data?.b2bSummary ?? []),
    ...(data?.creditDebitNoteSummary ?? []),
  ];
  const status = data?.gstrStatus;

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
          disabled={!data}
          onExport={() =>
            reportApi.exportsrv1GSTR1Excel()
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
      isEmpty={!isLoading && !data}
      emptyMessage="No GSTR-1 data"
      emptyDescription="Try refreshing the report."
    >
      <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Company</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{data?.branch?.branchName ?? data?.branch?.name ?? "-"}</p>
            <p className="mt-1 font-mono text-xs text-gray-500">GSTIN: {data?.branch?.gstin ?? data?.branch?.branchGst ?? "-"}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Reporting period</p>
            <p className="mt-1 font-medium text-gray-900">{data?.period?.label ?? "-"}</p>
            <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">{status?.filingStatus ?? "Not Filed"}</span>
          </div>
        </div>
      </div>

      {status ? <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Total vouchers", status.totalVouchers],
          ["Included", status.includedInReturn],
          ["Ready to upload", status.readyForUpload],
          ["Needs correction", status.uncertain],
          ["Conflicts", status.conflictsWithMasters],
        ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-3"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">{value}</p></div>)}
      </div> : null}

      {summaryRows.length ? <div className="mb-5 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="border-b px-4 py-3"><p className="font-semibold text-gray-900">Return summary</p><p className="text-xs text-gray-500">Summary-level data from the Tally GSTR-1 export</p></div>
        <table className="w-full min-w-[980px] text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3 text-left">Section</th><th className="px-4 py-3 text-right">Vouchers</th><th className="px-4 py-3 text-right">Taxable</th><th className="px-4 py-3 text-right">IGST</th><th className="px-4 py-3 text-right">CGST</th><th className="px-4 py-3 text-right">SGST</th><th className="px-4 py-3 text-right">GST</th><th className="px-4 py-3 text-right">Invoice value</th></tr></thead><tbody className="divide-y divide-gray-100">{summaryRows.map((row, index) => <tr key={`${row.agency_name}-${index}`}><td className="px-4 py-3 font-medium text-gray-900">{row.agency_name || "Credit / debit notes"}</td><td className="px-4 py-3 text-right tabular-nums">{row.voucher_count}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.taxable_value)}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.igst_rate_amount)}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.cgst_rate_amount)}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.sgst_rate_amount)}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.gst_amount)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(row.invoice_total)}</td></tr>)}</tbody></table>
      </div> : null}

      

      {/* <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <Layers className="h-3.5 w-3.5" />
        Showing {rows.length} invoice{rows.length === 1 ? "" : "s"}
      </div>
      <ReportTable columns={columns} data={rows} isLoading={isLoading} /> */}
    </ReportLayout>
  );
}
