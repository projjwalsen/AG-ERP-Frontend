"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Wallet,
  Receipt,
  ArrowLeftRight,
  TrendingUp,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { fetchBranchDayBook } from "@/app/store/reportsSlice";
import { reportApi } from "@/app/services/report.service";
import { DayBookEntry } from "@/app/types/report";
import { branchApi } from "@/app/services/branch.service";
import { formatCurrency, cn } from "@/lib/utils";

/**
 * Branch Day Book — GET /api/reports/branch/:branchId/day-book
 *
 * The backend requires a `branchId` path param. The page lets the user
 * pick a branch from the filter bar; if none is selected we pull the
 * first active branch from the /api/branches/selection endpoint as a
 * reasonable default. Each row expands into a side dialog showing the
 * transaction's invoice allocations.
 */
export default function DayBookReportPage() {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const { data, isLoading, error } = useAppSelector((s) => s.reports.dayBook);

  const [branches, setBranches] = React.useState<
    { id: string; name: string; code: string }[]
  >([]);
  const [filters, setFilters] = React.useState<ReportFilterValues>({});
  const [activeBranchId, setActiveBranchId] = React.useState<string>("");
  const [activeRow, setActiveRow] = React.useState<DayBookEntry | null>(null);

  // Load active branches once. If the user has not yet picked a branch
  // by the time the data finishes loading, default to the first one.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await branchApi.getActive();
        if (cancelled) return;
        if (res.success && res.data) {
          const list = res.data.branches || [];
          setBranches(list);
          setActiveBranchId((prev) => prev || list[0]?.id || "");
        }
      } catch {
        addToast("Failed to load branches", "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const load = React.useCallback(() => {
    if (!activeBranchId) return;
    dispatch(
      fetchBranchDayBook({
        branchId: activeBranchId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
    )
      .unwrap()
      .catch((err: string) => addToast(err || "Failed to load day book", "error"));
  }, [dispatch, activeBranchId, filters.startDate, filters.endDate, addToast]);

  // Refetch whenever the active branch changes (dates are applied
  // explicitly via the Apply button).
  React.useEffect(() => {
    if (activeBranchId) load();
  }, [activeBranchId, load]);

  React.useEffect(() => {
    if (error) addToast(error, "error");
  }, [error, addToast]);

  const summary: SummaryCardItem[] = React.useMemo(() => {
    const s = data?.summary;
    return [
      {
        title: "Total Transactions",
        value: s?.totalTransactions ?? 0,
        hint: "Across the selected date range",
        icon: Receipt,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
      },
      {
        title: "Total Receipts",
        value: formatCurrency(s?.totalReceipts ?? 0),
        hint: "Inward cash / bank inflow",
        icon: ArrowDownToLine,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
      },
      {
        title: "Total Payments",
        value: formatCurrency(s?.totalPayments ?? 0),
        hint: "Outward cash / bank outflow",
        icon: ArrowUpFromLine,
        iconBg: "bg-rose-50",
        iconColor: "text-rose-600",
      },
      {
        title: "Net Cash Flow",
        value: formatCurrency(s?.netCashFlow ?? 0),
        hint: "Receipts minus payments",
        icon: TrendingUp,
        iconBg:
          (s?.netCashFlow ?? 0) >= 0 ? "bg-emerald-50" : "bg-rose-50",
        iconColor:
          (s?.netCashFlow ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600",
      },
    ];
  }, [data]);

  const rows = data?.entries ?? [];

  const columns: ColumnDef<DayBookEntry>[] = React.useMemo(
    () => [
      {
        accessorKey: "serialNo",
        header: "#",
        cell: ({ row }) => (
          <span className="text-gray-500">{row.original.serialNo}</span>
        ),
      },
      {
        accessorKey: "voucherId",
        header: "Voucher",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-gray-700">
            {row.original.voucherId}
          </span>
        ),
      },
      {
        accessorKey: "transactionDate",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-gray-700">
            {new Date(row.original.transactionDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        accessorKey: "primaryAgencyName",
        header: "Agency",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900">
              {row.original.primaryAgencyName ?? "-"}
            </p>
            {row.original.inRoutedVia && row.original.secondaryAgencyName && (
              <p className="text-[11px] text-amber-600 inline-flex items-center gap-1">
                <ArrowLeftRight className="h-3 w-3" />
                Routed via {row.original.secondaryAgencyName}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "paymentMode",
        header: "Mode",
        cell: ({ row }) =>
          row.original.paymentMode ? (
            <Badge variant="outline">{row.original.paymentMode}</Badge>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        accessorKey: "paymentType",
        header: "Type",
        cell: ({ row }) =>
          row.original.paymentType ? (
            <span className="text-gray-700">{row.original.paymentType}</span>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        accessorKey: "transactionRef",
        header: "Reference",
        cell: ({ row }) =>
          row.original.transactionRef ? (
            <span className="font-mono text-xs text-gray-700">
              {row.original.transactionRef}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        accessorKey: "cashInFlowReceipt",
        header: "Amount",
        cell: ({ row }) => (
          <span
            className={cn(
              "tabular-nums font-semibold",
              row.original.cashInFlowReceipt > 0
                ? "text-emerald-700"
                : "text-gray-500"
            )}
          >
            {formatCurrency(row.original.cashInFlowReceipt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              setActiveRow(row.original);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  );

  const filterConfig: ReportFilterConfig[] = React.useMemo(
    () => [
      { type: "dateRange" },
    ],
    []
  );

  return (
    <ReportLayout
      title="Branch Day Book"
      description={
        data?.branch
          ? `${data.branch.name} (${data.branch.code}) — cash and bank movement`
          : "Daily cash and bank movement for a branch"
      }
      generatedAt={data?.generatedAt as string | undefined}
      onRefresh={load}
      isRefreshing={isLoading}
      actions={
        <ReportExportButton
          disabled={!activeBranchId || rows.length === 0}
          onExport={() =>
            reportApi.exportDayBookExcel({
              branchId: activeBranchId,
              startDate: filters.startDate,
              endDate: filters.endDate,
            })
          }
        />
      }
      summary={summary}
      toolbar={
        <div className="space-y-3">
          <Card className="border-0 shadow-sm">
            <div className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Branch</span>
              </div>
              <select
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
                className="h-9 px-3 text-sm border border-gray-200 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 min-w-[220px]"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </Card>

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
        </div>
      }
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      emptyMessage="No transactions for this period"
      emptyDescription="Try widening the date range or selecting a different branch."
    >
      <ReportTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        onRowClick={(r) => setActiveRow(r as DayBookEntry)}
      />

      {/* Allocations side panel — uses a Dialog styled as a right-side sheet. */}
      <Dialog
        open={!!activeRow}
        onOpenChange={(o) => !o && setActiveRow(null)}
      >
        <DialogContent
          showCloseButton
          className="max-w-md w-full h-full max-h-screen sm:max-h-screen sm:rounded-none sm:right-0 sm:left-auto sm:translate-x-0 sm:translate-y-0 sm:top-0 sm:fixed sm:overflow-y-auto"
        >
          {activeRow && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                  Transaction Allocations
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase">Voucher</p>
                    <p className="font-mono text-gray-900">
                      {activeRow.voucherId}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase">Date</p>
                    <p className="text-gray-900">
                      {new Date(activeRow.transactionDate).toLocaleDateString(
                        "en-IN"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase">Agency</p>
                    <p className="text-gray-900">
                      {activeRow.primaryAgencyName ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase">Amount</p>
                    <p className="font-semibold text-emerald-700">
                      {formatCurrency(activeRow.cashInFlowReceipt)}
                    </p>
                  </div>
                  {activeRow.transactionRef && (
                    <div className="col-span-2">
                      <p className="text-[11px] text-gray-500 uppercase">
                        Reference
                      </p>
                      <p className="font-mono text-gray-700">
                        {activeRow.transactionRef}
                      </p>
                    </div>
                  )}
                  {activeRow.remarks && (
                    <div className="col-span-2">
                      <p className="text-[11px] text-gray-500 uppercase">
                        Remarks
                      </p>
                      <p className="text-gray-700">{activeRow.remarks}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[11px] text-gray-500 uppercase mb-2">
                    Allocations ({activeRow.allocations.length})
                  </p>
                  {activeRow.allocations.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No invoice allocations for this transaction.
                    </p>
                  ) : (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase">
                              Invoice
                            </th>
                            <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase">
                              Source
                            </th>
                            <th className="text-right px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeRow.allocations.map((a, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-2 font-mono text-xs text-gray-700">
                                {a.invoiceNo ?? "-"}
                              </td>
                              <td className="px-3 py-2">
                                <Badge variant="outline">{a.sourceType}</Badge>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium">
                                {formatCurrency(a.allocatedAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ReportLayout>
  );
}
