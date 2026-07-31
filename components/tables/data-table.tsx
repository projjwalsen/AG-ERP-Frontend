"use client";

import * as React from "react";
import { ColumnDef, flexRender, useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, SortingState, ColumnFiltersState, PaginationState } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  onRowClick?: (row: TData) => void;
  manualPagination?: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    total: number;
    onPageChange: (pageIndex: number) => void;
  };
}

export function DataTable<TData, TValue>({ columns, data, searchKey, onRowClick, manualPagination }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: manualPagination ? undefined : setPagination,
    manualPagination: Boolean(manualPagination),
    pageCount: manualPagination?.pageCount,
    state: {
      sorting,
      columnFilters,
      pagination: manualPagination
        ? { pageIndex: manualPagination.pageIndex, pageSize: manualPagination.pageSize }
        : pagination,
    },
  });

  const currentPageIndex = manualPagination
    ? manualPagination.pageIndex
    : table.getState().pagination.pageIndex;
  const currentPageSize = manualPagination
    ? manualPagination.pageSize
    : table.getState().pagination.pageSize;
  const totalRows = manualPagination
    ? manualPagination.total
    : table.getFilteredRowModel().rows.length;
  const pageCount = manualPagination
    ? manualPagination.pageCount
    : table.getPageCount();
  const pageStart = totalRows === 0 ? 0 : currentPageIndex * currentPageSize + 1;
  const pageEnd = totalRows === 0 ? 0 : Math.min((currentPageIndex + 1) * currentPageSize, totalRows);

  const handlePrevious = () => {
    if (manualPagination) {
      manualPagination.onPageChange(Math.max(0, currentPageIndex - 1));
      return;
    }
    table.previousPage();
  };

  const handleNext = () => {
    if (manualPagination) {
      manualPagination.onPageChange(Math.min(pageCount - 1, currentPageIndex + 1));
      return;
    }
    table.nextPage();
  };

  const canPreviousPage = manualPagination ? currentPageIndex > 0 : table.getCanPreviousPage();
  const canNextPage = manualPagination ? currentPageIndex + 1 < pageCount : table.getCanNextPage();

  return (
    <div className="space-y-4">
      {searchKey && !manualPagination && (
        <div className="flex items-center justify-end gap-4 pb-3 border-b border-gray-100">
          <Select value={table.getState().pagination.pageSize.toString()} onValueChange={(v) => table.setPagination({ ...table.getState().pagination, pageSize: Number(v) })}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((size) => <SelectItem key={size} value={size.toString()}>{size} rows</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="border border-gray-200">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => onRowClick?.(row.original)} className={cn("border-b border-gray-100 hover:bg-gray-50", onRowClick && "cursor-pointer")}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5 text-sm text-gray-700">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="h-32 text-center text-sm text-gray-500">No results.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 pb-1.5">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium">{pageStart}</span> to{" "}
          <span className="font-medium">{pageEnd}</span> of{" "}
          <span className="font-medium">{totalRows}</span>
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious} disabled={!canPreviousPage} className="h-8">
            <ChevronLeft className="h-4 w-4" />Prev
          </Button>
          <span className="text-sm text-gray-600">Page {currentPageIndex + 1} of {pageCount || 1}</span>
          <Button variant="outline" size="sm" onClick={handleNext} disabled={!canNextPage} className="h-8">
            Next<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
