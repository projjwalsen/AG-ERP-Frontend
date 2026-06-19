"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Report filter configuration — a config-driven approach so each report
 * page just lists what it needs and the component renders the right
 * controls.
 *
 *   - `branch`     : branch dropdown (loads from /api/branches/selection)
 *   - `product`    : product dropdown (loads from /api/products/all)
 *   - `dateRange`  : start + end date inputs
 *   - `search`     : free-text search input
 *   - `outstandingType` : RECEIVABLE / PAYABLE segmented control
 *   - `custom`     : a free slot for the caller to render its own filter
 */
export type ReportFilterConfig =
  | { type: "branch" }
  | { type: "product" }
  | { type: "dateRange" }
  | { type: "search"; placeholder?: string }
  | {
      type: "outstandingType";
      value: "RECEIVABLE" | "PAYABLE";
      onChange: (v: "RECEIVABLE" | "PAYABLE") => void;
    }
  | { type: "custom"; render: () => React.ReactNode };

export interface ReportFilterValues {
  search?: string;
  branchId?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReportFiltersProps {
  config: ReportFilterConfig[];
  values: ReportFilterValues;
  onChange: (next: ReportFilterValues) => void;
  onApply: () => void;
  onReset?: () => void;
  className?: string;
}

export function ReportFilters({
  config,
  values,
  onChange,
  onApply,
  onReset,
  className,
}: ReportFiltersProps) {
  const hasFilters = Boolean(
    values.search ||
      values.branchId ||
      values.productId ||
      values.startDate ||
      values.endDate
  );

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {config.map((c, idx) => {
            if (c.type === "search") {
              return (
                <div key={idx} className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={c.placeholder ?? "Search..."}
                    value={values.search ?? ""}
                    onChange={(e) =>
                      onChange({ ...values, search: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              );
            }

            if (c.type === "branch") {
              return (
                <BranchSelect
                  key={idx}
                  value={values.branchId ?? ""}
                  onChange={(v) => onChange({ ...values, branchId: v })}
                />
              );
            }

            if (c.type === "product") {
              return (
                <ProductSelect
                  key={idx}
                  value={values.productId ?? ""}
                  onChange={(v) => onChange({ ...values, productId: v })}
                />
              );
            }

            if (c.type === "dateRange") {
              return (
                <React.Fragment key={idx}>
                  <Input
                    type="date"
                    value={values.startDate ?? ""}
                    onChange={(e) =>
                      onChange({ ...values, startDate: e.target.value })
                    }
                    className="w-[160px]"
                    placeholder="Start date"
                  />
                  <span className="text-gray-400 text-sm">to</span>
                  <Input
                    type="date"
                    value={values.endDate ?? ""}
                    onChange={(e) =>
                      onChange({ ...values, endDate: e.target.value })
                    }
                    className="w-[160px]"
                    placeholder="End date"
                  />
                </React.Fragment>
              );
            }

            if (c.type === "outstandingType") {
              return (
                <OutstandingTypeSegment
                  key={idx}
                  value={c.value}
                  onChange={c.onChange}
                />
              );
            }

            if (c.type === "custom") {
              return <React.Fragment key={idx}>{c.render()}</React.Fragment>;
            }

            return null;
          })}

          <Button onClick={onApply} className="h-9">
            Apply
          </Button>

          {hasFilters && onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- BRANCH SELECT (loads lazily) ----------------
function BranchSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [branches, setBranches] = React.useState<
    { id: string; name: string; code: string }[]
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@/app/services/branch.service");
        const res = await mod.branchApi.getActive();
        if (cancelled) return;
        if (res.success && res.data) setBranches(res.data.branches || []);
      } catch {
        // Non-critical — filter is optional.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 text-sm border border-gray-200 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 min-w-[180px]"
    >
      <option value="">All Branches</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name} ({b.code})
        </option>
      ))}
    </select>
  );
}

// ---------------- PRODUCT SELECT (loads lazily) ----------------
function ProductSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [products, setProducts] = React.useState<
    { id: string; name: string; sku: string }[]
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@/app/services/product.service");
        const res = await mod.productApi.getAll({ limit: 200 });
        if (cancelled) return;
        if (res.success && res.data) {
          setProducts(
            (res.data.products || []).map((p) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
            }))
          );
        }
      } catch {
        // Non-critical.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 text-sm border border-gray-200 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 min-w-[180px]"
    >
      <option value="">All Products</option>
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.sku})
        </option>
      ))}
    </select>
  );
}

// ---------------- OUTSTANDING TYPE SEGMENTED ----------------
function OutstandingTypeSegment({
  value,
  onChange,
}: {
  value: "RECEIVABLE" | "PAYABLE";
  onChange: (v: "RECEIVABLE" | "PAYABLE") => void;
}) {
  return (
    <div className="inline-flex h-9 items-center bg-gray-100 p-0.5 rounded-md text-gray-600">
      <button
        type="button"
        onClick={() => onChange("RECEIVABLE")}
        className={cn(
          "h-8 px-3 text-sm font-medium rounded",
          value === "RECEIVABLE"
            ? "bg-white text-gray-900 shadow-sm"
            : "hover:text-gray-900"
        )}
      >
        Receivable
      </button>
      <button
        type="button"
        onClick={() => onChange("PAYABLE")}
        className={cn(
          "h-8 px-3 text-sm font-medium rounded",
          value === "PAYABLE"
            ? "bg-white text-gray-900 shadow-sm"
            : "hover:text-gray-900"
        )}
      >
        Payable
      </button>
    </div>
  );
}
