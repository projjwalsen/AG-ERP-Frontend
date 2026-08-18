"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ReportTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Show a top-row search input (default true). */
  showSearch?: boolean;
  /** Show column-visibility dropdown (default true). */
  showColumnVisibility?: boolean;
  /** Custom empty-state node to render when data is empty and not loading. */
  emptyState?: React.ReactNode;
  /** Loading state — when true, renders skeleton rows. */
  isLoading?: boolean;
  /** Number of skeleton rows to render in loading state. */
  loadingRows?: number;
  /** Optional row click handler. */
  onRowClick?: (row: TData) => void;
  className?: string;
  /**
   * Server-driven pagination. When supplied, the table:
   *   - shows the supplied totals/page in the footer instead of its own
   *     client-side paginator (TanStack's internal `Next/Prev` is hidden)
   *   - hides the page-size selector since the page size is owned by the
   *     server
   * Use this for any report whose backend returns a `pagination` object.
   */
  serverPagination?: {
    page: number;
    totalPages: number;
    totalEntries: number;
    limit: number;
    isLoading?: boolean;
    onPageChange: (page: number) => void;
  };
}

/**
 * Reusable TanStack table for every report. Supports:
 *   - sorting (per column)
 *   - global search (top input)
 *   - column visibility (gear icon → dropdown)
 *   - responsive horizontal scroll
 *   - sticky header
 *   - loading skeleton
 *   - empty state
 */
export function ReportTable<TData, TValue>({
  columns,
  data,
  showSearch = true,
  showColumnVisibility = true,
  emptyState,
  isLoading = false,
  loadingRows = 8,
  onRowClick,
  className,
  serverPagination,
}: ReportTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState<string>("");
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // When the parent owns pagination, flip TanStack into manual mode so
    // it doesn't slice `data` again at pageSize=10. We point its internal
    // pagination at a page big enough to fit every server-supplied row.
    ...(serverPagination
      ? {
          manualPagination: true,
          pageCount: serverPagination.totalPages,
          onPaginationChange: () => {
            /* no-op — server drives page changes via onPageChange */
          },
        }
      : {
          onPaginationChange: setPagination,
        }),
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      pagination: serverPagination
        ? {
            pageIndex: (serverPagination.page || 1) - 1,
            pageSize: Math.max(
              serverPagination.limit,
              data.length || serverPagination.limit
            ),
          }
        : pagination,
    },
  });

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardContent className="p-0">
        {/* Toolbar */}
        {(showSearch || showColumnVisibility) && (
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
            {showSearch ? (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search table..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {/* Page-size selector only makes sense for client-side
                  pagination; when the report is server-paginated the
                  size is owned by the backend. */}
              {!serverPagination && (
                <Select
                  value={pagination.pageSize.toString()}
                  onValueChange={(v) =>
                    setPagination({ pageIndex: 0, pageSize: Number(v) })
                  }
                >
                  <SelectTrigger className="h-9 w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 50, 100].map((s) => (
                      <SelectItem key={s} value={s.toString()}>
                        {s} rows
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {showColumnVisibility && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {table
                      .getAllColumns()
                      .filter((c) => c.getCanHide())
                      .map((c) => (
                        <DropdownMenuCheckboxItem
                          key={c.id}
                          className="capitalize"
                          checked={c.getIsVisible()}
                          onCheckedChange={(v: boolean) => c.toggleVisibility(!!v)}
                        >
                          {String(c.columnDef.header ?? c.id)}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-gray-200 bg-gray-50">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: loadingRows }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      "border-b border-gray-100 hover:bg-gray-50",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-2.5 text-sm text-gray-700 align-top"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    {emptyState ?? (
                      <div className="py-12 text-center text-sm text-gray-500">
                        No results.
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — server takes priority; otherwise the table
            renders its built-in TanStack client-side paginator. */}
        {!isLoading && rows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            {serverPagination ? (
              <>
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium">
                    {(serverPagination.page - 1) * serverPagination.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      serverPagination.page * serverPagination.limit,
                      serverPagination.totalEntries
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {serverPagination.totalEntries}
                  </span>{" "}
                  entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      serverPagination.onPageChange(
                        Math.max(1, serverPagination.page - 1)
                      )
                    }
                    disabled={
                      serverPagination.page <= 1 || !!serverPagination.isLoading
                    }
                    className="h-8 gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {serverPagination.page} of {serverPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      serverPagination.onPageChange(
                        Math.min(
                          serverPagination.totalPages,
                          serverPagination.page + 1
                        )
                      )
                    }
                    disabled={
                      serverPagination.page >= serverPagination.totalPages ||
                      !!serverPagination.isLoading
                    }
                    className="h-8 gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium">
                    {pagination.pageIndex * pagination.pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      (pagination.pageIndex + 1) * pagination.pageSize,
                      total
                    )}
                  </span>{" "}
                  of <span className="font-medium">{total}</span> entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="h-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.pageIndex + 1} of{" "}
                    {table.getPageCount() || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="h-8"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
