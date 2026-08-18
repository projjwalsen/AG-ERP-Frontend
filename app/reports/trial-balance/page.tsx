"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { ReportLayout, ReportTable } from "@/components/reports";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { reportApi } from "@/app/services/report.service";
import { TrialBalanceResponse, TrialBalanceRow } from "@/app/types/report";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

function formatDate(d?: string | Date | null) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TrialBalancePage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <TrialBalanceContent />
    </React.Suspense>
  );
}

function TrialBalanceContent() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const branchId = searchParams?.get("branchId") ?? undefined;
  const startDate = searchParams?.get("startDate") ?? undefined;
  const endDate = searchParams?.get("endDate") ?? undefined;

  const [data, setData] = React.useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<TrialBalanceRow | null>(null);
  const [showDetails, setShowDetails] = React.useState(false);

  const fetchReport = React.useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await reportApi.getTrialBalanceReport({ branchId, startDate, endDate });
      if (res.success && res.data) setData(res.data);
      else addToast(res.message || "Failed to load trial balance", "error");
    } catch (err: any) {
      addToast(err?.message || "Failed to load trial balance", "error");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [branchId, startDate, endDate, addToast]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const columns = React.useMemo<ColumnDef<TrialBalanceRow>[]>(
    () => [
      { accessorKey: "srNo", header: "#", cell: ({ row }) => <span>{row.original.srNo}</span> },
      { accessorKey: "ledgerCode", header: "Ledger Code", cell: ({ row }) => (<span className="font-mono text-xs">{row.original.ledgerCode}</span>) },
      { accessorKey: "account", header: "Account" },
      { accessorKey: "parentGroup", header: "Group" },
      { accessorKey: "ledgerCategory", header: "Category" },
      { accessorKey: "ledgerNature", header: "Nature" },
      { accessorKey: "debit", header: "Debit", cell: ({ row }) => formatCurrency(row.original.debit) },
      { accessorKey: "credit", header: "Credit", cell: ({ row }) => formatCurrency(row.original.credit) },
      { accessorKey: "closingDebit", header: "Closing Debit", cell: ({ row }) => formatCurrency(row.original.closingDebit) },
      { accessorKey: "closingCredit", header: "Closing Credit", cell: ({ row }) => formatCurrency(row.original.closingCredit) },
      {
        id: "viewDetails",
        header: "",
        cell: ({ row }) => (
          <button
            className="text-sm text-primary-600 hover:underline"
            onClick={() => {
              setSelectedRow(row.original);
              setShowDetails(true);
            }}
          >
            View
          </button>
        ),
      },
    ],
    []
  );

  const exportDisabled = !data || !data.rows || data.rows.length === 0;

  return (
    <div className="w-full max-w-[1500px] mx-auto">
      <ReportLayout
        title="Trial Balance"
        description="Closing balances per ledger for the selected period"
        generatedAt={data?.generatedAt}
        onRefresh={() => fetchReport()}
        isRefreshing={loading}
        actions={
          <ReportExportButton
            disabled={exportDisabled}
            onExport={async () => reportApi.exportTrialBalanceExcel({ branchId, startDate, endDate })}
          />
        }
        summary={
          data
            ? [
                { title: "Total Debit", value: data.summary.totalDebit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
                { title: "Total Credit", value: data.summary.totalCredit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
                { title: "Closing Debit", value: data.summary.totalClosingDebit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
                { title: "Closing Credit", value: data.summary.totalClosingCredit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
                { title: "Period Difference", value: data.summary.periodDifference, hint: data.summary.isPeriodBalanced ? "Balanced" : "Unbalanced", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
                { title: "Closing Difference", value: data.summary.closingDifference, hint: data.summary.isClosingBalanced ? "Balanced" : "Unbalanced", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" as any },
              ]
            : []
        }
        toolbar={null}
        isLoading={loading}
        isEmpty={!data || data.rows.length === 0}
        emptyMessage={"No trial balance data"}
        emptyDescription={"Try a different branch or date range."}
      >
        <div className="w-full max-w-[1500px] mx-auto overflow-hidden rounded-xl border border-gray-200 bg-white">
          <ReportTable
            columns={columns}
            data={data?.rows ?? []}
            isLoading={loading}
            className="border-0 shadow-none"
            showSearch={false}
          />
        </div>

        <Dialog open={showDetails} onOpenChange={(isOpen) => !isOpen && setShowDetails(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ledger details</DialogTitle>
            <DialogDescription>Breakdown of debit, credit and closing amounts.</DialogDescription>
          </DialogHeader>

          {selectedRow ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="text-sm text-gray-500">Ledger</div>
              <div className="text-sm font-medium text-right">{selectedRow.account}</div>

              <div className="text-sm text-gray-500">Ledger Code</div>
              <div className="text-sm font-medium text-right"><span className="font-mono">{selectedRow.ledgerCode}</span></div>

              <div className="text-sm text-gray-500">Group</div>
              <div className="text-sm font-medium text-right">{selectedRow.parentGroup}</div>

              <div className="text-sm text-gray-500">Category</div>
              <div className="text-sm font-medium text-right">{selectedRow.ledgerCategory}</div>

              <div className="text-sm text-gray-500">Nature</div>
              <div className="text-sm font-medium text-right">{selectedRow.ledgerNature}</div>

              <div className="text-sm text-gray-500">Debit</div>
              <div className="text-sm font-medium text-right">{formatCurrency(selectedRow.debit)}</div>

              <div className="text-sm text-gray-500">Credit</div>
              <div className="text-sm font-medium text-right">{formatCurrency(selectedRow.credit)}</div>

              <div className="text-sm text-gray-500">Closing Debit</div>
              <div className="text-sm font-medium text-right">{formatCurrency(selectedRow.closingDebit)}</div>

              <div className="text-sm text-gray-500">Closing Credit</div>
              <div className="text-sm font-medium text-right">{formatCurrency(selectedRow.closingCredit)}</div>

              <div className="text-sm text-gray-500">Closing Signed</div>
              <div className="text-sm font-medium text-right">{formatCurrency(selectedRow.closingSigned)}</div>
            </div>
          ) : null}
        </DialogContent>
        </Dialog>
      </ReportLayout>
    </div>
  );
}
