"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Package,
  Box,
  Layers,
  Droplet,
  Weight,
  Building2,
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
import { fetchStockInventoryReport } from "@/app/store/reportsSlice";
import { reportApi } from "@/app/services/report.service";
import { InventoryRow } from "@/app/types/report";
import { formatDateTime } from "@/lib/utils";

/**
 * Stock Inventory Report — GET /api/reports/stock-inventory
 *
 * Lists inventory batches with current stock in KG and LTR, plus the
 * owning branch. Summary cards total products, batches and aggregate
 * stock across the filtered window.
 */
export default function InventoryReportPage() {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const { data, isLoading, error } = useAppSelector(
    (s) => s.reports.inventory
  );

  const [filters, setFilters] = React.useState<ReportFilterValues>({});

  const load = React.useCallback(() => {
    dispatch(
      fetchStockInventoryReport({
        branchId: filters.branchId,
        productId: filters.productId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
    )
      .unwrap()
      .catch((err: string) =>
        addToast(err || "Failed to load inventory report", "error")
      );
  }, [
    dispatch,
    filters.branchId,
    filters.productId,
    filters.startDate,
    filters.endDate,
    addToast,
  ]);

  React.useEffect(() => {
    load();
    // Initial fetch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (error) addToast(error, "error");
  }, [error, addToast]);

  const filterConfig: ReportFilterConfig[] = React.useMemo(
    () => [{ type: "branch" }, { type: "product" }, { type: "dateRange" }],
    []
  );

  const summary: SummaryCardItem[] = React.useMemo(() => {
    const s = data?.summary;
    return [
      {
        title: "Total Products",
        value: s?.totalProducts ?? 0,
        hint: "Distinct SKUs in window",
        icon: Package,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
      },
      {
        title: "Total Batches",
        value: s?.totalBatches ?? 0,
        hint: "Inventory batches returned",
        icon: Layers,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
      },
      {
        title: "Total Stock (KG)",
        value: (s?.totalStockKG ?? 0).toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        }),
        hint: "Aggregate weight across batches",
        icon: Weight,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
      },
      {
        title: "Total Stock (LTR)",
        value: (s?.totalStockLTR ?? 0).toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        }),
        hint: "Aggregate volume across batches",
        icon: Droplet,
        iconBg: "bg-rose-50",
        iconColor: "text-rose-600",
      },
    ];
  }, [data]);

  const rows = data?.rows ?? [];

  const columns: ColumnDef<InventoryRow>[] = React.useMemo(
    () => [
      {
        accessorKey: "productCode",
        header: "Product Code",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md">
              <Box className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <span className="font-mono text-xs text-gray-700">
              {row.original.productCode}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "productName",
        header: "Product",
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">
            {row.original.productName}
          </span>
        ),
      },
      {
        accessorKey: "batchId",
        header: "Batch",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-mono">
            {row.original.batchId}
          </Badge>
        ),
      },
      {
        accessorKey: "branch",
        header: "Branch",
        cell: ({ row }) =>
          row.original.branch ? (
            <div className="text-xs">
              <div className="flex items-center gap-1 text-gray-700 font-medium">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                {row.original.branch.name}
              </div>
              <div className="text-[11px] text-gray-500 font-mono">
                {row.original.branch.code}
                {row.original.branch.gstn ? ` · ${row.original.branch.gstn}` : ""}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        accessorKey: "stockKG",
        header: "Stock (KG)",
        cell: ({ row }) => (
          <span className="tabular-nums font-semibold text-gray-900">
            {row.original.stockKG.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        accessorKey: "stockLTR",
        header: "Stock (LTR)",
        cell: ({ row }) => (
          <span className="tabular-nums font-semibold text-gray-900">
            {row.original.stockLTR.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-xs text-gray-600">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Last Updated",
        cell: ({ row }) => (
          <span className="text-xs text-gray-600">
            {formatDateTime(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <ReportLayout
      title="Stock Inventory Report"
      description="Batch-wise stock position per product and branch"
      generatedAt={data?.generatedAt as string | undefined}
      onRefresh={load}
      isRefreshing={isLoading}
      actions={
        <ReportExportButton
          disabled={rows.length === 0}
          onExport={() =>
            reportApi.exportStockInventoryExcel({
              branchId: filters.branchId,
              productId: filters.productId,
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
      emptyMessage="No inventory in the selected period"
      emptyDescription="Try widening the date range or removing the product filter."
    >
      <ReportTable columns={columns} data={rows} isLoading={isLoading} />
    </ReportLayout>
  );
}
