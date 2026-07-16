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
  Building2,
  Landmark,
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
import { bankApi, BankAccount } from "@/app/services/bank.service";
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
  /**
   * Bank-account scope for the day-book. Lives outside the
   * ReportFilters block because the dropdown is rendered next to the
   * branch picker (above the standard filter bar) and is driven by
   * its own fetch whenever the active branch changes.
   */
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = React.useState<string>("");
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

  // Load bank accounts for the active branch. The backend's
  //   GET /api/bank/branch/:branchId
  // returns only active rows, so the picker is always a list of
  // accounts the user can actually scope the report to. Resetting
  // `bankAccountId` on branch change avoids posting a stale id.
  React.useEffect(() => {
    let cancelled = false;
    if (!activeBranchId) {
      setBankAccounts([]);
      setBankAccountId("");
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const res = await bankApi.getByBranch(activeBranchId);
        if (cancelled) return;
        if (res.success && res.data) {
          setBankAccounts(res.data);
        } else {
          setBankAccounts([]);
        }
      } catch {
        if (!cancelled) setBankAccounts([]);
      }
    })();
    setBankAccountId("");
    return () => {
      cancelled = true;
    };
  }, [activeBranchId]);

  const load = React.useCallback(() => {
    if (!activeBranchId) return;
    dispatch(
      fetchBranchDayBook({
        branchId: activeBranchId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        bankAccountId: bankAccountId || undefined,
      })
    )
      .unwrap()
      .catch((err: string) => addToast(err || "Failed to load day book", "error"));
  }, [
    dispatch,
    activeBranchId,
    filters.startDate,
    filters.endDate,
    bankAccountId,
    addToast,
  ]);

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
        accessorKey: "voucherId",
        header: "Voucher",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-gray-700">
            {row.original.voucherId}
          </span>
        ),
      },
      {
        id: "branch",
        header: "Branch",
        cell: ({ row }) => {
          // Branch context comes from the top-level day-book response
          // (one branch per page), not from each row.
          void row;
          return (
            <div className="flex items-center gap-1 text-gray-700">
              <Building2 className="h-3.5 w-3.5 text-gray-400" />
              {data?.branch?.name ?? "—"}
            </div>
          );
        },
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
        accessorKey: "credit",
        header: "Credit",
        cell: ({ row }) => (
          <span
            className={cn(
              "tabular-nums font-semibold",
              (row.original.credit ?? 0) > 0
                ? "text-emerald-700"
                : "text-gray-400"
            )}
          >
            {formatCurrency(row.original.credit ?? 0)}
          </span>
        ),
      },
      {
        accessorKey: "debit",
        header: "Debit",
        cell: ({ row }) => (
          <span
            className={cn(
              "tabular-nums font-semibold",
              (row.original.debit ?? 0) > 0
                ? "text-rose-700"
                : "text-gray-400"
            )}
          >
            {formatCurrency(row.original.debit ?? 0)}
          </span>
        ),
      },
      {
        accessorKey: "balance",
        header: "Balance",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.runningBalance ?? "—"}
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
    [data?.branch?.name]
  );

  /**
   * Refetch when the user picks a different bank account. The branch
   * / date changes are already handled by the load() callback
   * dependency list; this effect covers just the bank account
   * toggle so the rows reflect the new scope without the user
   * having to click Apply.
   */
  React.useEffect(() => {
    if (activeBranchId) load();
    // load is intentionally omitted from deps — it's redefined on
    // any state change and we only want to react to bankAccountId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAccountId]);

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
          ? `${data.branch.name} — cash and bank movement`
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
              bankAccountId: bankAccountId || undefined,
            })
          }
        />
      }
      summary={summary}
      toolbar={
        <div className="space-y-3">
          <Card className="border-0 shadow-sm">
            <div className="p-4 flex flex-nowrap items-center gap-3 overflow-x-auto">
              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-sm font-medium text-gray-700 shrink-0">
                Branch
              </span>
              <select
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
                className="h-9 px-3 text-sm border border-gray-200 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 min-w-[200px] shrink-0"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <Landmark className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-gray-700 shrink-0">
                Bank Account
              </span>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="h-9 px-3 text-sm border border-gray-200 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 min-w-[240px] disabled:bg-gray-50 disabled:text-gray-400 shrink-0"
                disabled={!activeBranchId}
              >
                <option value="">
                  {activeBranchId
                    ? bankAccounts.length === 0
                      ? "No bank accounts for this branch"
                      : "All bank accounts"
                    : "Select a branch first"}
                </option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} — {acc.accountNumber}
                  </option>
                ))}
              </select>
              {bankAccountId && (
                <button
                  type="button"
                  onClick={() => setBankAccountId("")}
                  className="text-xs text-gray-500 underline-offset-2 hover:underline shrink-0"
                >
                  Clear account
                </button>
              )}
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
                    <p className="text-[11px] text-gray-500 uppercase">Debit</p>
                    <p className="font-semibold text-rose-700">
                      {formatCurrency(activeRow.debit ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase">Credit</p>
                    <p className="font-semibold text-emerald-700">
                      {formatCurrency(activeRow.credit ?? 0)}
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
