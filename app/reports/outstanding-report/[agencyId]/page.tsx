"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeft,
  Building2,
  Download,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  ReportLayout,
  ReportTable,
  SummaryCardItem,
} from "@/components/reports";
import { reportApi } from "@/app/services/report.service";
import {
  OutstandingBackendType,
  OutstandingBucketInvoice,
  OutstandingBucketKey,
  OutstandingReportResponse,
  OutstandingRow,
  OutstandingType,
} from "@/app/types/report";
import { formatCurrency, cn } from "@/lib/utils";

// =====================================================================
// BUCKET BREAKDOWN PAGE — /reports/outstanding-report/:agencyId
// =====================================================================
//
// Reached from the Outstanding report's "Buckets" action. Loads the
// bucket breakdown for a single agency directly from the agency-scoped
// endpoint:
//
//   GET /api/reports/outstanding-report/agency/export?agencyId=&type=
//
// The route name says "export" but the backend's controller is wired
// to `getOutstandingReport`. When `agencyId` is in the query and no
// `export=...` flag is set, the backend returns a JSON payload whose
// bucket breakdown lives at `data.agencyDetails` (a single object)
// rather than `data.rows` (an array). This page reads from
// `agencyDetails` to render the buckets inline.
//
// Excel export calls the same endpoint with `export=DETAILS` to
// download the per-invoice xlsx file. agencyId is also forwarded via
// the X-Agency-Id header so backend audit logs can attribute the
// request to a specific agency.
// =====================================================================

type ViewMode = "agency" | "detail";

const BUCKET_COLUMNS: { key: OutstandingBucketKey; label: string }[] = [
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

function SettlementBadge({ status }: { status: string }) {
  const variant =
    status === "SETTLED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "PARTIALLY_SETTLED"
      ? "bg-amber-50 text-amber-700"
      : "bg-rose-50 text-rose-700";
  const label =
    status === "PARTIALLY_SETTLED" ? "Partial" : status === "UNPAID" ? "Unpaid" : status;
  return (
    <Badge variant="secondary" className={cn("font-medium border-0", variant)}>
      {label}
    </Badge>
  );
}

// `useSearchParams` requires a Suspense boundary in app router; we wrap
// the page in one and read params inside.
export default function OutstandingBucketPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <OutstandingBucketContent />
    </React.Suspense>
  );
}

function OutstandingBucketContent() {
  const router = useRouter();
  const params = useParams<{ agencyId: string }>();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const agencyId = params?.agencyId ?? "";
  // Allow the link from the report to carry `?type=AR|AP` so we can
  // show the right summary header without re-deriving from a possibly
  // stale store. Falls back to AR.
  const typeParam = (searchParams?.get("type") ?? "AR") as OutstandingType;
  const isReceivable = typeParam === "AR";
  const backendType: OutstandingBackendType = isReceivable ? "RECEIVABLE" : "PAYABLE";
  const branchId = searchParams?.get("branchId") ?? undefined;

  const [report, setReport] = React.useState<OutstandingReportResponse | null>(
    null
  );
  const [loading, setLoading] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("agency");
  const [exporting, setExporting] = React.useState(false);

  // Fetch the agency-scoped report. The endpoint is the same one we
  // hit for the Excel export, but without an `export=...` flag the
  // backend returns the JSON payload so we can render the buckets
  // inline.
  const fetchAgencyReport = React.useCallback(
    async (showLoader = true) => {
      if (!agencyId) return;
      if (showLoader) setLoading(true);
      try {
        const res = await reportApi.getAgencyOutstanding({
          agencyId,
          branchId,
          type: backendType,
        });
        if (res.success && res.data) {
          setReport(res.data);
        } else {
          addToast(res.message || "Failed to load agency breakdown", "error");
        }
      } catch (err: any) {
        addToast(err?.message || "Failed to load agency breakdown", "error");
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [agencyId, backendType, branchId, addToast]
  );

  React.useEffect(() => {
    fetchAgencyReport();
  }, [fetchAgencyReport]);

  // The agency-scoped endpoint returns the bucket breakdown under
  // `data.agencyDetails` (a single object) when an `agencyId` query
  // param is present and no `export=...` flag is set. `rows` is
  // deliberately omitted in that mode — read from `agencyDetails`
  // instead.
  const row: OutstandingRow | null = React.useMemo(() => {
    return report?.agencyDetails ?? null;
  }, [report]);

  const partyLabel = isReceivable ? "Customer" : "Vendor";

  const totalInvoices = row
    ? BUCKET_COLUMNS.reduce(
        (sum, { key }) => sum + (row[key]?.invoices?.length ?? 0),
        0
      )
    : 0;

  const summary: SummaryCardItem[] = React.useMemo(() => {
    if (!row) return [];
    return BUCKET_COLUMNS.map(({ key, label }) => ({
      title: label,
      value: formatCurrency(row[key]?.amount ?? 0),
      hint: `${row[key]?.invoices?.length ?? 0} ${
        (row[key]?.invoices?.length ?? 0) === 1 ? "invoice" : "invoices"
      }`,
      icon: Receipt,
      iconBg: "bg-gray-100",
      iconColor: "text-gray-600",
    }));
  }, [row]);

  const handleExport = async () => {
    if (!agencyId) return;
    setExporting(true);
    try {
      const { blob } = await reportApi.exportAgencyOutstandingExcel({
        agencyId,
        type: backendType,
        branchId,
      });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${isReceivable ? "AR" : "AP"}_Outstanding_${row?.agencyName ?? "Agency"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      addToast("Agency report exported successfully", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export agency report", "error");
    } finally {
      setExporting(false);
    }
  };

  // Per-bucket invoice table — column definitions live inside the
  // component so each bucket renders its own table with its own data.
  const invoiceColumns: ColumnDef<OutstandingBucketInvoice>[] =
    React.useMemo(
      () => [
        {
          accessorKey: "invoiceNo",
          header: "Invoice #",
          cell: ({ row }) => (
            <span className="font-mono text-xs text-gray-900">
              {row.original.invoiceNo ?? "-"}
            </span>
          ),
        },
        {
          accessorKey: "invoiceDate",
          header: "Bill Date",
          cell: ({ row }) => (
            <span className="text-gray-700">
              {formatDate(row.original.invoiceDate)}
            </span>
          ),
        },
        {
          accessorKey: "invoiceAgeDays",
          header: "Age (days)",
          cell: ({ row }) => (
            <span className="tabular-nums text-gray-700">
              {row.original.invoiceAgeDays}
            </span>
          ),
        },
        {
          accessorKey: "grandTotal",
          header: "Bill Amount",
          cell: ({ row }) => (
            <span className="tabular-nums font-medium text-gray-900">
              {formatCurrency(row.original.grandTotal)}
            </span>
          ),
        },
        {
          accessorKey: "allocatedAmount",
          header: "Paid",
          cell: ({ row }) => (
            <span className="tabular-nums text-gray-700">
              {formatCurrency(row.original.allocatedAmount)}
            </span>
          ),
        },
        {
          accessorKey: "outstandingAmount",
          header: "Outstanding",
          cell: ({ row }) => (
            <span className="tabular-nums font-semibold text-gray-900">
              {formatCurrency(row.original.outstandingAmount)}
            </span>
          ),
        },
        {
          accessorKey: "settlementStatus",
          header: "Status",
          cell: ({ row }) => (
            <SettlementBadge status={row.original.settlementStatus} />
          ),
        },
      ],
      []
    );

  const DirectionIcon = isReceivable ? ArrowDownToLine : ArrowUpFromLine;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-gray-500"
          onClick={() => router.push("/reports/outstanding")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Outstanding
        </Button>
      </div>

      <ReportLayout
        title={
          row
            ? `${row.agencyName} — ${isReceivable ? "Receivable" : "Payable"} Buckets`
            : "Bucket Breakdown"
        }
        description={
          row
            ? `Aging-bucket breakdown · ${formatCurrency(
                row.totalOutstanding
              )} total ${isReceivable ? "receivable" : "payable"} · ${totalInvoices} ${
                totalInvoices === 1 ? "invoice" : "invoices"
              }`
            : "Loading agency breakdown…"
        }
        generatedAt={report?.generatedAt}
        onRefresh={() => fetchAgencyReport()}
        isRefreshing={loading}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            loading={exporting}
            disabled={!row}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        }
        summary={summary}
        isLoading={loading}
        isEmpty={!row && !loading}
        emptyMessage={`No ${isReceivable ? "receivable" : "payable"} outstanding for this agency`}
        emptyDescription="The agency may have settled all open invoices, or there is no data for the selected branch."
      >
        {!row ? null : (
          <>
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
                By Bucket
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

            <div className="mt-3" />

            {viewMode === "agency" ? (
              <div className="space-y-4">
                {BUCKET_COLUMNS.map(({ key, label }) => {
                  const bucket = row[key];
                  const invoices = bucket?.invoices ?? [];
                  const amount = bucket?.amount ?? 0;
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {label}
                        </p>
                        <p className="text-xs text-gray-600 tabular-nums">
                          {invoices.length}{" "}
                          {invoices.length === 1 ? "invoice" : "invoices"} ·{" "}
                          <span
                            className={cn(
                              "font-medium",
                              amount === 0 ? "text-gray-400" : "text-gray-900"
                            )}
                          >
                            {formatCurrency(amount)}
                          </span>
                        </p>
                      </div>
                      {invoices.length === 0 ? (
                        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-gray-500">
                          No {partyLabel.toLowerCase()} outstanding invoices in
                          this bucket.
                        </div>
                      ) : (
                        <div className="rounded-md border border-gray-200 bg-white">
                          <ReportTable
                            columns={invoiceColumns}
                            data={invoices}
                            showSearch={false}
                            showColumnVisibility={false}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-gray-200 bg-white">
                <ReportTable
                  columns={invoiceColumns}
                  data={BUCKET_COLUMNS.flatMap(
                    ({ key }) => row[key]?.invoices ?? []
                  )}
                  showSearch={false}
                  showColumnVisibility={false}
                />
              </div>
            )}
          </>
        )}
      </ReportLayout>
      <ToastContainer />
    </div>
  );
}