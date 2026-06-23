"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Receipt,
  TrendingUp,
  FileSpreadsheet,
  Scale,
  Download,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
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
import { fetchGSTLedger } from "@/app/store/ledgerSlice";
import { ledgerApi } from "@/app/services/ledger.service";
import { GSTLedgerEntry, GSTLiabilitySummary } from "@/app/types/ledger";
import { formatCurrency, cn } from "@/lib/utils";

/**
 * GST Ledger Report — GET /api/ledgers/gst-ledger
 *
 * Three tabs:
 *   1. Input GST Ledger   — purchases (taxable + CGST/SGST/IGST + totalGST)
 *   2. Output GST Ledger  — sales    (taxable + CGST/SGST/IGST + totalGST)
 *   3. GST Liability Summary — payable (output - input) per tax kind
 */
export default function GSTLedgerReportPage() {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  // The ledger slice stores the GST response as a nullable top-level
  // field, so the raw `useAppSelector` value can be `null` on first
  // render — destructuring from `null` would throw at runtime. Wrap the
  // selector to always return a stable `{ data, isLoading, error }`
  // shape (same pattern the reports slice uses for its per-report slots).
  const { data, isLoading, error } = useAppSelector((s) => ({
    data: s.ledger.currentGSTLedger,
    isLoading: s.ledger.isGSTLedgerLoading,
    error: s.ledger.gstLedgerError,
  }));
  const gstLoading = isLoading;
  const gstError = error;

  // The two side-by-side raw arrays. The Tabs component below switches
  // between them without re-fetching.
  const [activeTab, setActiveTab] = React.useState<
    "input" | "output" | "liability"
  >("input");

  // Filter bar state — dateRange + optional branch. Draft vs applied pattern:
  // Apply commits the draft and triggers refetch.
  const [filters, setFilters] = React.useState<ReportFilterValues>({});
  const [draftFilters, setDraftFilters] = React.useState<ReportFilterValues>({});

  const load = React.useCallback(() => {
    dispatch(
      fetchGSTLedger({
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
    )
      .unwrap()
      .catch((err: string) =>
        addToast(err || "Failed to load GST ledger", "error")
      );
  }, [dispatch, filters.startDate, filters.endDate, addToast]);

  // Initial fetch on mount.
  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (error || gstError) {
      addToast(error || gstError || "Failed to load GST ledger", "error");
    }
  }, [error, gstError, addToast]);

  // Apply / Reset handlers.
  const applyFilters = () => setFilters(draftFilters);
  const resetFilters = () => {
    setDraftFilters({});
    setFilters({});
  };

  const handleExport = async () => {
    try {
      const { blob, filename } = await ledgerApi.exportGSTLedger({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addToast("GST ledger exported successfully", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export GST ledger", "error");
    }
  };

  // Summary cards — totals across the selected period. These stay visible
  // regardless of which tab is active.
  const summary: SummaryCardItem[] = React.useMemo(() => {
    const input = data?.inputGSTLedger?.totals;
    const output = data?.outputGSTLedger?.totals;
    const liability = data?.liabilitySummary;
    const netPayable = liability?.total?.payable ?? 0;
    return [
      {
        title: "Total Input GST",
        value: formatCurrency(input?.totalGST ?? 0),
        hint: `Taxable: ${formatCurrency(input?.taxableValue ?? 0)}`,
        icon: ArrowDownToLine,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
      },
      {
        title: "Total Output GST",
        value: formatCurrency(output?.totalGST ?? 0),
        hint: `Taxable: ${formatCurrency(output?.taxableValue ?? 0)}`,
        icon: ArrowUpFromLine,
        iconBg: "bg-rose-50",
        iconColor: "text-rose-600",
      },
      {
        title: "Net GST Payable",
        value: formatCurrency(netPayable),
        hint: netPayable >= 0 ? "Output exceeds input" : "Input credit available",
        icon: TrendingUp,
        iconBg: netPayable >= 0 ? "bg-amber-50" : "bg-emerald-50",
        iconColor: netPayable >= 0 ? "text-amber-600" : "text-emerald-600",
      },
      {
        title: "Input − Output",
        value: formatCurrency((output?.totalGST ?? 0) - (input?.totalGST ?? 0)),
        hint: "Output minus input (negative = refund due)",
        icon: Scale,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
      },
    ];
  }, [data]);

  const filterConfig: ReportFilterConfig[] = React.useMemo(
    () => [{ type: "dateRange" }],
    []
  );

  // Shared columns for the input/output tables. Only `particulars` text
  // differs by side, so the column def is a factory.
  const buildColumns = (
    side: "input" | "output"
  ): ColumnDef<GSTLedgerEntry>[] => [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700 whitespace-nowrap">
          {row.original.date}
        </span>
      ),
    },
    {
      accessorKey: "voucherNo",
      header: "Voucher / Invoice",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-gray-700">
          {row.original.voucherNo}
        </span>
      ),
    },
    {
      accessorKey: "particulars",
      header: "Particulars",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">
          {row.original.particulars}
        </span>
      ),
    },
    {
      accessorKey: "taxableValue",
      header: "Taxable Value",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">
          {formatCurrency(row.original.taxableValue)}
        </span>
      ),
    },
    {
      accessorKey: "cgst",
      header: "CGST",
      cell: ({ row }) => (
        <span
          className={cn(
            "text-sm font-medium",
            row.original.cgst > 0 ? "text-amber-700" : "text-gray-400"
          )}
        >
          {row.original.cgst > 0 ? formatCurrency(row.original.cgst) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "sgst",
      header: "SGST",
      cell: ({ row }) => (
        <span
          className={cn(
            "text-sm font-medium",
            row.original.sgst > 0 ? "text-amber-700" : "text-gray-400"
          )}
        >
          {row.original.sgst > 0 ? formatCurrency(row.original.sgst) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "igst",
      header: "IGST",
      cell: ({ row }) => (
        <span
          className={cn(
            "text-sm font-medium",
            row.original.igst > 0 ? "text-blue-700" : "text-gray-400"
          )}
        >
          {row.original.igst > 0 ? formatCurrency(row.original.igst) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "totalGST",
      header: "Total GST",
      cell: ({ row }) => (
        <span
          className={cn(
            "text-sm font-semibold",
            side === "input" ? "text-emerald-700" : "text-rose-700"
          )}
        >
          {formatCurrency(row.original.totalGST)}
        </span>
      ),
    },
  ];

  const inputColumns = React.useMemo(() => buildColumns("input"), []);
  const outputColumns = React.useMemo(() => buildColumns("output"), []);

  const inputEntries = data?.inputGSTLedger?.entries ?? [];
  const outputEntries = data?.outputGSTLedger?.entries ?? [];

  const totalsRow = (
    totals?: {
      taxableValue: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalGST: number;
    }
  ) => {
    if (!totals) return null;
    return (
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Taxable: </span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(totals.taxableValue)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">CGST: </span>
          <span className="font-semibold text-amber-700">
            {formatCurrency(totals.cgst)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">SGST: </span>
          <span className="font-semibold text-amber-700">
            {formatCurrency(totals.sgst)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">IGST: </span>
          <span className="font-semibold text-blue-700">
            {formatCurrency(totals.igst)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Total GST: </span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(totals.totalGST)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <ReportLayout
      title="GST Ledger"
      description={
        data?.company?.name
          ? `Input / Output / Liability summary for ${data.company.name}`
          : "Input GST, Output GST and net liability per tax kind"
      }
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleExport}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      }
      summary={summary}
      isLoading={gstLoading && !data}
      isEmpty={!gstLoading && !data}
      emptyMessage="No GST data for the selected period"
      emptyDescription="Pick a date range and click Apply to load the GST ledger."
    >
      {data && (
        <>
          {/* Filter bar */}
          <ReportFilters
            config={filterConfig}
            values={draftFilters}
            onChange={setDraftFilters}
            onApply={applyFilters}
            onReset={resetFilters}
            className="bg-white p-4 rounded-lg border border-gray-200"
          />

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "input" | "output" | "liability")}
          >
            <TabsList className="bg-white border border-gray-200 rounded-lg p-1 h-auto">
              <TabsTrigger
                value="input"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 px-4 py-2 rounded-md flex items-center gap-2"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Input GST Ledger
                <Badge variant="secondary" className="ml-1">
                  {inputEntries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="output"
                className="data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700 px-4 py-2 rounded-md flex items-center gap-2"
              >
                <ArrowUpFromLine className="h-4 w-4" />
                Output GST Ledger
                <Badge variant="secondary" className="ml-1">
                  {outputEntries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="liability"
                className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 px-4 py-2 rounded-md flex items-center gap-2"
              >
                <Scale className="h-4 w-4" />
                GST Liability Summary
              </TabsTrigger>
            </TabsList>

            {/* Input GST table */}
            <TabsContent value="input" className="mt-4">
              <ReportTable
                columns={inputColumns}
                data={inputEntries}
                isLoading={gstLoading}
              />
              {totalsRow(data.inputGSTLedger?.totals)}
            </TabsContent>

            {/* Output GST table */}
            <TabsContent value="output" className="mt-4">
              <ReportTable
                columns={outputColumns}
                data={outputEntries}
                isLoading={gstLoading}
              />
              {totalsRow(data.outputGSTLedger?.totals)}
            </TabsContent>

            {/* Liability Summary table */}
            <TabsContent value="liability" className="mt-4">
              <LiabilitySummaryTable
                summary={data.liabilitySummary}
                period={data.period}
                companyName={data.company?.name}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </ReportLayout>
  );
}

// ============== Liability Summary Sub-Component ==============
function LiabilitySummaryTable({
  summary,
  period,
  companyName,
}: {
  summary: GSTLiabilitySummary;
  period: { startDate?: string | null; endDate?: string | null };
  companyName?: string;
}) {
  if (!summary) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
        No liability data available
      </div>
    );
  }

  const rows: Array<{
    tax: "CGST" | "SGST" | "IGST" | "Total";
    output: number;
    input: number;
    payable: number;
  }> = [
    { tax: "CGST", ...summary.cgst },
    { tax: "SGST", ...summary.sgst },
    { tax: "IGST", ...summary.igst },
    { tax: "Total", ...summary.total },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            GST Liability Summary
          </h3>
          <p className="text-xs text-gray-500">
            Output GST minus Input GST. Positive = payable, negative = refund.
          </p>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
          {companyName && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {companyName}
            </span>
          )}
          {period?.startDate && (
            <span>From: <span className="font-mono">{period.startDate}</span></span>
          )}
          {period?.endDate && (
            <span>To: <span className="font-mono">{period.endDate}</span></span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Tax Kind
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Output GST
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Input GST (Credit)
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Net Payable
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const isTotal = r.tax === "Total";
              const isPayable = r.payable >= 0;
              return (
                <tr
                  key={r.tax}
                  className={cn(
                    "hover:bg-gray-50",
                    isTotal && "bg-gray-50 font-semibold"
                  )}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {r.tax}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-rose-700">
                    {formatCurrency(r.output)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-700">
                    {formatCurrency(r.input)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right text-sm font-semibold",
                      isPayable ? "text-amber-700" : "text-emerald-700"
                    )}
                  >
                    {formatCurrency(r.payable)}
                  </td>
                  <td className="px-4 py-3">
                    {r.payable === 0 ? (
                      <Badge variant="secondary" className="text-[10px]">
                        NIL
                      </Badge>
                    ) : isPayable ? (
                      <Badge variant="warning" className="text-[10px]">
                        PAYABLE
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px]">
                        REFUND
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
