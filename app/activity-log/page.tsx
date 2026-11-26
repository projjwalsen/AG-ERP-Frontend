"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Loader2,
  Search,
  History,
  LogOut,
  Users,
  ShoppingCart,
  ArrowLeftRight,
  Briefcase,
  FileText,
  Factory,
  Upload,
  Package,
  Building2,
  Shield,
  BookOpen,
  CreditCard,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/tables";
import { useToast } from "@/components/ui/toast";
import { useAppSelector } from "@/app/store/hooks";
import {
  accessLogApi,
  ACCESS_LOG_MODULES,
  ACCESS_LOG_OPERATIONS,
  ACCESS_LOG_STATUSES,
  AccessLog,
  AccessLogExportFormat,
  AccessLogMeta,
} from "@/app/services/accessLog.service";
import { branchApi } from "@/app/services/branch.service";
import { UserService } from "@/app/services/user.service";
import { hasModulePermission } from "@/lib/usePermissions";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const selectClassName =
  "border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

// ---------------------------------------------------------------------------
// Module icon + label
// ---------------------------------------------------------------------------

const moduleIcons: Record<string, React.ElementType> = {
  AUTH: LogOut,
  USER: Users,
  PURCHASE: ShoppingCart,
  SALE: ShoppingCart, // sidebar has one "Purchase & Sales" icon
  PURCHASE_ORDER: ArrowLeftRight,
  AGENCY: Briefcase,
  JOURNAL: FileText,
  MANUFACTURING: Factory,
  IMPORT: Upload,
  PRODUCT: Package,
  BRANCH: Building2,
  ROLE: Shield,
  LEDGER: BookOpen,
  TRANSACTION: CreditCard,
  DRCR_NOTE: FileText,
};

const moduleLabelOverrides: Record<string, string> = {
  IMPORT: "Data Import",
};

/** Soft tint per module, same 50/700 pairs already used across the app. */
const moduleColors: Record<string, { box: string; label: string; row: string }> = {
  AUTH: { box: "bg-red-50 text-red-700", label: "text-red-700", row: "bg-red-50/50 hover:bg-red-50" },
  USER: { box: "bg-blue-50 text-blue-700", label: "text-blue-700", row: "bg-blue-50/50 hover:bg-blue-50" },
  PURCHASE: { box: "bg-green-50 text-green-700", label: "text-green-700", row: "bg-green-50/50 hover:bg-green-50" },
  SALE: { box: "bg-emerald-50 text-emerald-700", label: "text-emerald-700", row: "bg-emerald-50/50 hover:bg-emerald-50" },
  PURCHASE_ORDER: { box: "bg-sky-50 text-sky-700", label: "text-sky-700", row: "bg-sky-50/50 hover:bg-sky-50" },
  AGENCY: { box: "bg-amber-50 text-amber-700", label: "text-amber-700", row: "bg-amber-50/50 hover:bg-amber-50" },
  JOURNAL: { box: "bg-violet-50 text-violet-700", label: "text-violet-700", row: "bg-violet-50/50 hover:bg-violet-50" },
  MANUFACTURING: { box: "bg-orange-50 text-orange-700", label: "text-orange-700", row: "bg-orange-50/50 hover:bg-orange-50" },
  IMPORT: { box: "bg-purple-50 text-purple-700", label: "text-purple-700", row: "bg-purple-50/50 hover:bg-purple-50" },
  PRODUCT: { box: "bg-teal-50 text-teal-700", label: "text-teal-700", row: "bg-teal-50/50 hover:bg-teal-50" },
  BRANCH: { box: "bg-slate-100 text-slate-600", label: "text-slate-600", row: "bg-slate-50 hover:bg-slate-100" },
  ROLE: { box: "bg-rose-50 text-rose-700", label: "text-rose-700", row: "bg-rose-50/50 hover:bg-rose-50" },
  LEDGER: { box: "bg-indigo-50 text-indigo-700", label: "text-indigo-700", row: "bg-indigo-50/50 hover:bg-indigo-50" },
  TRANSACTION: { box: "bg-cyan-50 text-cyan-700", label: "text-cyan-700", row: "bg-cyan-50/50 hover:bg-cyan-50" },
  DRCR_NOTE: { box: "bg-fuchsia-50 text-fuchsia-700", label: "text-fuchsia-700", row: "bg-fuchsia-50/50 hover:bg-fuchsia-50" },
};

const defaultModuleColor = {
  box: "bg-gray-100 text-gray-600",
  label: "text-gray-500",
  row: "bg-gray-50/70 hover:bg-gray-50",
};

function activityRowClass(log: AccessLog): string {
  return (moduleColors[log.module] ?? defaultModuleColor).row;
}

/** Hug the header/cell to its content so these columns sit together. */
const compactColumn = { className: "w-px whitespace-nowrap px-2.5" };

/** "PURCHASE_ORDER" -> "Purchase Order" */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function moduleLabel(module: string): string {
  return moduleLabelOverrides[module] ?? titleCase(module);
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

type BadgeVariant = "success" | "info" | "error" | "secondary" | "default";

const operationVariant: Record<string, BadgeVariant> = {
  CREATE: "success",
  IMPORT: "success",
  UPDATE: "info",
  APPROVE: "info",
  DELETE: "error",
  REJECT: "error",
  LOGIN: "secondary",
  LOGOUT: "secondary",
};

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

function formatWhen(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatDateTime(date);
}

function formatFileSize(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/** First defined, non-empty value among the candidate keys. */
function pick(meta: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const v = meta[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

/**
 * Import summary line. Only rendered for IMPORT logs whose metadata is a
 * (non-array) object, and only for the fields that are actually present —
 * never prints `null` or an empty object.
 */
function importSummary(log: AccessLog): string | null {
  const meta = log.metadata;
  if (log.module !== "IMPORT" || !meta || typeof meta !== "object" || Array.isArray(meta)) {
    return null;
  }

  const parts: string[] = [];

  const fileName = pick(meta, ["fileName", "filename", "file_name", "originalName"]);
  const fileSize = formatFileSize(pick(meta, ["fileSize", "file_size", "size", "sizeBytes"]));
  if (typeof fileName === "string") {
    parts.push(fileSize ? `${fileName} (${fileSize})` : fileName);
  } else if (fileSize) {
    parts.push(`Size ${fileSize}`);
  }

  const counts: Array<[string, string[]]> = [
    ["Total", ["total", "totalRows", "total_rows"]],
    ["Success", ["success", "successCount", "imported"]],
    ["Skipped", ["skipped", "skippedCount"]],
    ["Failed", ["failed", "failedCount"]],
  ];
  for (const [label, keys] of counts) {
    const v = pick(meta, keys);
    if (typeof v === "number" || (typeof v === "string" && v.trim())) {
      parts.push(`${label} ${v}`);
    }
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

const LOCALHOST_IPS = new Set(["::1", "127.0.0.1"]);

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<AccessLog>[] = [
  {
    accessorKey: "createdAt",
    header: "When",
    meta: compactColumn,
    cell: ({ row }) => (
      <span className="text-sm text-gray-600">{formatWhen(row.original.createdAt)}</span>
    ),
  },
  {
    id: "activity",
    header: "Activity",
    cell: ({ row }) => {
      const log = row.original;
      const Icon = moduleIcons[log.module] ?? History;
      const color = moduleColors[log.module] ?? defaultModuleColor;
      const summary = importSummary(log);
      return (
        <div className="flex items-start gap-2.5">
          <div className="flex w-14 shrink-0 flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded ${color.box}`}>
              <Icon className="h-4 w-4" />
            </div>
            <span className={`text-center text-[10px] leading-tight ${color.label}`}>
              {moduleLabel(log.module)}
            </span>
          </div>
          <div className="min-w-0 max-w-md">
            <p className="text-sm font-medium text-gray-900 break-words">{log.description}</p>
            {summary && <p className="mt-1 text-xs text-gray-500 break-words">{summary}</p>}
          </div>
        </div>
      );
    },
  },
  {
    id: "user",
    header: "User",
    cell: ({ row }) => {
      const name = row.original.performedByName;
      const email = row.original.performedByEmail;
      if (!name && !email) return <span className="text-gray-400">-</span>;
      return (
        <div className="min-w-0 max-w-[14rem]">
          {name && <p className="text-sm font-medium text-gray-900 break-words">{name}</p>}
          {email && <p className="text-xs text-gray-500 break-words">{email}</p>}
        </div>
      );
    },
  },
  {
    accessorKey: "operation",
    header: "Operation",
    meta: compactColumn,
    cell: ({ row }) => {
      const op = row.original.operation;
      return <Badge variant={operationVariant[op] ?? "default"}>{titleCase(op)}</Badge>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: compactColumn,
    cell: ({ row }) => {
      const failed = row.original.status === "FAILED";
      return (
        <Badge variant={failed ? "error" : "success"} dot>
          {failed ? "Failed" : "Success"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "ipAddress",
    header: "IP",
    meta: compactColumn,
    cell: ({ row }) => {
      const ip = row.original.ipAddress;
      if (!ip) return <span className="text-gray-400">-</span>;
      if (LOCALHOST_IPS.has(ip)) {
        return (
          <span className="text-sm text-gray-600" title={ip}>
            localhost
          </span>
        );
      }
      return <span className="text-sm text-gray-600">{ip}</span>;
    },
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ActivityLogPage() {
  const router = useRouter();
  const { user, permissions } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();

  const canView = hasModulePermission(permissions, "ACCESS_LOG", "VIEW");
  // Permissions arrive after the profile; an empty list means "not loaded yet",
  // so we only redirect once we actually know the user lacks ACCESS_LOG:VIEW.
  const permissionsLoaded = permissions.length > 0;
  const isAllBranches = user?.branchAccessType === "ALL";

  // Last completed request, tagged with the key of the params it was made for.
  // "Loading" is derived (result.key !== current key), so the fetch effect only
  // sets state when a request finishes.
  const [result, setResult] = React.useState<{
    key: string;
    logs: AccessLog[];
    meta: AccessLogMeta | null;
    error: string | null;
  } | null>(null);
  const [reloadNonce, setReloadNonce] = React.useState(0);

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState("");
  const [operationFilter, setOperationFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [performedById, setPerformedById] = React.useState("");

  const [branches, setBranches] = React.useState<Array<{ id: string; name: string }>>([]);
  const [people, setPeople] = React.useState<Array<{ id: string; name: string }>>([]);
  const [exporting, setExporting] = React.useState(false);

  // Gate: send users without ACCESS_LOG:VIEW to /access-denied.
  React.useEffect(() => {
    if (permissionsLoaded && !canView) {
      router.replace("/access-denied");
    }
  }, [permissionsLoaded, canView, router]);

  // Debounce the search box; a new search always starts from page 1.
  React.useEffect(() => {
    if (searchInput === search) return;
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  // Branch / user pickers only exist for users who can see every branch.
  React.useEffect(() => {
    if (!canView || !isAllBranches) return;
    let cancelled = false;
    branchApi
      .getActive()
      .then((res) => {
        if (!cancelled) setBranches(res.data?.branches ?? []);
      })
      .catch(() => {});
    UserService.getAllUsers()
      .then((res) => {
        if (!cancelled) setPeople(res.data?.users ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canView, isAllBranches]);

  const queryParams = React.useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search,
      module: moduleFilter,
      operation: operationFilter,
      status: statusFilter,
      startDate,
      endDate,
      // The API ignores these for non-ALL users, so don't send them.
      branchId: isAllBranches ? branchId : "",
      performedById: isAllBranches ? performedById : "",
    }),
    [page, search, moduleFilter, operationFilter, statusFilter, startDate, endDate, branchId, performedById, isAllBranches]
  );
  const requestKey = `${reloadNonce}:${JSON.stringify(queryParams)}`;

  React.useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    accessLogApi
      .getAll(queryParams)
      .then((res) => {
        if (cancelled) return;
        setResult({ key: requestKey, logs: res.data ?? [], meta: res.meta ?? null, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          logs: [],
          meta: null,
          error: err instanceof Error ? err.message : "Failed to fetch activity log",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [canView, queryParams, requestKey]);

  const isLoading = result?.key !== requestKey;
  const logs = result?.logs ?? [];
  const meta = result?.meta ?? null;
  const error = result && result.key === requestKey ? result.error : null;
  const retry = () => setReloadNonce((n) => n + 1);

  // Change a filter and go back to page 1 (batched into a single fetch).
  const onFilter = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const hasFilters = Boolean(
    searchInput || search || moduleFilter || operationFilter || statusFilter || startDate || endDate || branchId || performedById
  );

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setModuleFilter("");
    setOperationFilter("");
    setStatusFilter("");
    setStartDate("");
    setEndDate("");
    setBranchId("");
    setPerformedById("");
    setPage(1);
  };

  const handleExport = async (format: AccessLogExportFormat) => {
    if (exporting) return;
    setExporting(true);
    try {
      const { truncated } = await accessLogApi.export(format, {
        search,
        module: moduleFilter,
        operation: operationFilter,
        status: statusFilter,
        startDate,
        endDate,
        // Same rule as the list: only when those filters are on screen.
        branchId: isAllBranches ? branchId : "",
        performedById: isAllBranches ? performedById : "",
      });
      if (truncated) {
        addToast(
          "Export limited to the latest 50,000 rows. Narrow the filters to get the rest.",
          "warning"
        );
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  // No ACCESS_LOG:VIEW — nothing to show (redirecting, or still loading permissions).
  if (!canView) {
    return permissionsLoaded ? null : (
      <div className="space-y-5 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  const pagination = meta
    ? {
        pageIndex: meta.page - 1,
        pageSize: meta.limit,
        pageCount: meta.totalPages,
        total: meta.total,
        onPageChange: (pageIndex: number) => setPage(pageIndex + 1),
      }
    : undefined;

  return (
    <div className="space-y-5 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500 mt-1">Review who did what across the ERP</p>
        </div>
        {canView && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" loading={exporting} disabled={exporting}>
                {!exporting && <Download className="h-4 w-4" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => handleExport("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>CSV (.csv)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search name, email, or description"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={moduleFilter}
              onChange={(e) => onFilter(setModuleFilter)(e.target.value)}
              className={selectClassName}
              aria-label="Module"
            >
              <option value="">All Modules</option>
              {ACCESS_LOG_MODULES.map((m) => (
                <option key={m} value={m}>
                  {moduleLabel(m)}
                </option>
              ))}
            </select>

            <select
              value={operationFilter}
              onChange={(e) => onFilter(setOperationFilter)(e.target.value)}
              className={selectClassName}
              aria-label="Operation"
            >
              <option value="">All Operations</option>
              {ACCESS_LOG_OPERATIONS.map((op) => (
                <option key={op} value={op}>
                  {titleCase(op)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => onFilter(setStatusFilter)(e.target.value)}
              className={selectClassName}
              aria-label="Status"
            >
              <option value="">All Statuses</option>
              {ACCESS_LOG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>

            {isAllBranches && (
              <>
                <select
                  value={branchId}
                  onChange={(e) => onFilter(setBranchId)(e.target.value)}
                  className={selectClassName}
                  aria-label="Branch"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={performedById}
                  onChange={(e) => onFilter(setPerformedById)(e.target.value)}
                  className={selectClassName}
                  aria-label="Performed by"
                >
                  <option value="">All Users</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">From</label>
              <div className="w-40">
                <Input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => onFilter(setStartDate)(e.target.value)}
                  aria-label="Start date"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">To</label>
              <div className="w-40">
                <Input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => onFilter(setEndDate)(e.target.value)}
                  aria-label="End date"
                />
              </div>
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity table / states */}
      {error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={retry}>Retry</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5">
            {isLoading && logs.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">
                {hasFilters ? "No activity matches these filters" : "No activity yet"}
              </div>
            ) : (
              <div className={isLoading ? "opacity-60 pointer-events-none" : undefined}>
                <DataTable columns={columns} data={logs} manualPagination={pagination} rowClassName={activityRowClass} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
