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
      { accessorKey: "groupName", header: "Group" },
      { accessorKey: "ledgerName", header: "Ledger" },
      { accessorKey: "ledgerCode", header: "Code", cell: ({ row }) => (<span className="font-mono text-xs">{row.original.ledgerCode ?? "-"}</span>) },
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
              { title: "Opening Debit", value: data.summary.totalOpeningDebit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
              { title: "Opening Credit", value: data.summary.totalOpeningCredit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
              { title: "Period Debit", value: data.summary.totalPeriodDebit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
              { title: "Period Credit", value: data.summary.totalPeriodCredit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
              { title: "Closing Debit", value: data.summary.totalClosingDebit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
              { title: "Closing Credit", value: data.summary.totalClosingCredit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" as any },
            ]
          : []
      }
      toolbar={null}
      isLoading={loading}
      isEmpty={!data || data.rows.length === 0}
      emptyMessage={"No trial balance data"}
      emptyDescription={"Try a different branch or date range."}
    >
      <ReportTable columns={columns} data={data?.rows ?? []} isLoading={loading} />

      <Dialog open={showDetails} onOpenChange={(isOpen) => !isOpen && setShowDetails(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ledger details</DialogTitle>
            <DialogDescription>Breakdown of opening, period and closing amounts.</DialogDescription>
          </DialogHeader>

          {selectedRow ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="text-sm text-gray-500">Opening Debit</div>
              <div className="text-sm font-medium text-right">{formatCurrency(selectedRow.openingDebit)}</div>

              <div className="text-sm text-gray-500">Opening Credit</div>
              <div className="text-sm font-medium text-right">{formatCurrency(selectedRow.openingCredit)}</div>

              <div className="text-sm text-gray-500">Period Debit</div>
              <div className="text-sm font-medium text-right">{formatCurrency(selectedRow.periodDebit)}</div>

              <div className="text-sm text-gray-500">Period Credit</div>
              <div className="text-sm font-medium text-right">{formatCurrency(selectedRow.periodCredit)}</div>

              <div className="text-sm text-gray-500">Closing Debit</div>
              <div className="text-sm font-medium text-right">{formatCurrency(selectedRow.closingDebit)}</div>

              <div className="text-sm text-gray-500">Closing Credit</div>
              <div className="text-sm font-medium text-right">{formatCurrency(selectedRow.closingCredit)}</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </ReportLayout>
  );
}
