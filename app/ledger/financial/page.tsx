"use client";

import * as React from "react";
import {
  Wallet, Search, Eye, Building2,
  Briefcase, Layers, Download, Building,
  Filter as FilterIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchAllFinancialLedgers,
  fetchLedgerByBranchId,
  fetchLedgerByAgencyId,
  fetchLedgerBySuspenseId,
  fetchCompanyLedger,
} from "@/app/store/ledgerSlice";
import {
  LedgerView,
  LedgerViewRow,
  SuspenseTransactionRow,
  CompanyLedgerResponse,
} from "@/app/types/ledger";
import { formatCurrency } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { useRouter } from "next/navigation";

type BranchCategory = "ACCOUNTING_LEDGER" | "CASH" | "GST" | "DEBTORS" | "CREDITORS";
// Agency ledger categories — Sundry Debtors/Creditors are intentionally
// excluded from the picker since agency-level receivables/payables are
// already exposed as `Total Receivable` / `Total Payable` columns on
// the agency list rows.
type AgencyCategory = "ACCOUNTING_LEDGER" | "CASH";
type SuspenseCategory = "ACCOUNTING_LEDGER" | "CASH";

const BRANCH_CATEGORIES: { value: BranchCategory; label: string }[] = [
  { value: "ACCOUNTING_LEDGER", label: "Accounting Ledgers" },
  { value: "CASH", label: "Cash & Bank" },
  { value: "GST", label: "GST" },
  { value: "DEBTORS", label: "Sundry Debtors" },
  { value: "CREDITORS", label: "Sundry Creditors" },
];

const AGENCY_CATEGORIES: { value: AgencyCategory; label: string }[] = [
  { value: "ACCOUNTING_LEDGER", label: "Accounting Ledgers" },
  { value: "CASH", label: "Cash & Bank" },
];

const SUSPENSE_CATEGORIES: { value: SuspenseCategory; label: string }[] = [
  { value: "ACCOUNTING_LEDGER", label: "All Suspense Transactions" },
  { value: "CASH", label: "Cash Suspense" },
];

export default function FinancialLedgerPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <FinancialLedgerContent />
    </React.Suspense>
  );
}

function FinancialLedgerContent() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { addToast } = useToast();
  const {
    financialLedgers,
    suspenseData,
    isFinancialListLoading,
    financialListError,
    financialPagination,
    currentCompanyLedger,
    isCompanyLedgerLoading,
    companyLedgerError,
  } = useAppSelector((state) => state.ledger);

  // Three tabs - AGENCY is the default.
  // Tab selection is persisted across navigations to/from detail pages:
  // when the user opens a branch/agency/suspense detail then comes back,
  // they should land on the same tab they left. We mirror the active tab
  // to the `?tab=` query string so deep-links and refreshes also restore it,
  // and fall back to sessionStorage for the in-session case.
  const [activeTab, setActiveTab] = React.useState<LedgerView>(() => {
    if (typeof window !== "undefined") {
      const fromUrl = new URLSearchParams(window.location.search).get("tab");
      if (
        fromUrl === "AGENCY" ||
        fromUrl === "BRANCH" ||
        fromUrl === "SUSPENSE" ||
        fromUrl === "COMPANY"
      ) {
        return fromUrl;
      }
      const fromStorage = window.sessionStorage.getItem(
        "ledger:financial:activeTab"
      );
      if (
        fromStorage === "AGENCY" ||
        fromStorage === "BRANCH" ||
        fromStorage === "SUSPENSE" ||
        fromStorage === "COMPANY"
      ) {
        return fromStorage as LedgerView;
      }
    }
    return "AGENCY";
  });
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [exporting, setExporting] = React.useState(false);

  // Whenever the tab changes, mirror it to sessionStorage and the URL
  // query string so back-navigation from a detail page restores the
  // same tab. The URL update uses `replace` (not `push`) so the tab
  // switch doesn't bloat the browser history.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      "ledger:financial:activeTab",
      activeTab
    );
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== activeTab) {
      url.searchParams.set("tab", activeTab);
      window.history.replaceState(
        window.history.state,
        "",
        url.pathname + url.search
      );
    }
  }, [activeTab]);

  // Company-ledger specific filter state. Same draft/applied split used on
  // the agency/branch detail pages: the inputs mutate `draft*`, and clicking
  // Apply commits them to the applied state which triggers the refetch.
  const [draftStartDate, setDraftStartDate] = React.useState<string>("");
  const [draftEndDate, setDraftEndDate] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  // ===== Company-ledger fetch =====
  const fetchCompany = React.useCallback(
    async (sd: string, ed: string) => {
      try {
        await dispatch(
          fetchCompanyLedger({
            ...(sd ? { startDate: sd } : {}),
            ...(ed ? { endDate: ed } : {}),
          })
        ).unwrap();
      } catch (err: any) {
        addToast(err || "Failed to fetch company ledger", "error");
      }
    },
    [dispatch, addToast]
  );

  // Refetch company ledger whenever its filters change.
  React.useEffect(() => {
    if (activeTab === "COMPANY") {
      fetchCompany(startDate, endDate);
    }
  }, [activeTab, startDate, endDate, fetchCompany]);

  const fetchList = React.useCallback(
    async (view: LedgerView, page: number, search: string) => {
      try {
        await dispatch(
          fetchAllFinancialLedgers({
            view,
            page,
            limit: 25,
            ...(search.trim() ? { search: search.trim() } : {}),
          })
        ).unwrap();
      } catch (err: any) {
        addToast(err || "Failed to fetch ledgers", "error");
      }
    },
    [dispatch, addToast]
  );

  // Refetch whenever tab, page, or search changes
  React.useEffect(() => {
    fetchList(activeTab, currentPage, searchTerm);
  }, [activeTab, currentPage, searchTerm, fetchList]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as LedgerView);
    setCurrentPage(1);
    setSearchTerm("");
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadFile(
        `api/ledgers/get-all?${new URLSearchParams({
          export: "true",
          view: activeTab,
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        }).toString()}`,
        `ledger_${activeTab.toLowerCase()}.xlsx`
      );
      addToast(`${activeTab} ledgers exported successfully`, "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export ledgers", "error");
    } finally {
      setExporting(false);
    }
  };

  // Company-ledger export: streams the same data the user is currently
  // looking at (honours the startDate/endDate filters) as an .xlsx file.
  const handleCompanyExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append("export", "true");
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      await downloadFile(
        `api/ledgers/company-ledger?${params.toString()}`,
        `company_ledger_${(currentCompanyLedger?.company?.name || "company")
          .toString()
          .replace(/\s+/g, "_")}.xlsx`
      );
      addToast("Company ledger exported successfully", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export company ledger", "error");
    } finally {
      setExporting(false);
    }
  };

  // Apply: commit draft dates to the applied state, triggering refetch.
  const applyCompanyFilters = () => {
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
  };

  // Reset: clear both draft and applied state in one go.
  const resetCompanyFilters = () => {
    setDraftStartDate("");
    setDraftEndDate("");
    setStartDate("");
    setEndDate("");
  };

  // === View Details click → modal with category selection ===
  const [categoryModal, setCategoryModal] = React.useState<null | {
    view: "BRANCH" | "AGENCY" | "SUSPENSE";
    id: string;
    name: string;
  }>(null);

  const openCategoryModal = (row: any, view: "BRANCH" | "AGENCY" | "SUSPENSE") => {
    // Suspense rows carry a `branch.id` — "View Details" navigates
    // straight to the suspense branch detail page (by branch id) with
    // no category picker. The detail page itself defaults to
    // ACCOUNTING_LEDGER if no category is passed. Branch and agency
    // views still open the category modal to pick which ledger to
    // drill into.
    if (view === "SUSPENSE") {
      const txn = row as unknown as SuspenseTransactionRow;
      const branchId = txn?.branch?.id ?? "";
      const branchName = txn?.branch?.name ?? "";
      if (!branchId) return;
      router.push(
        `/ledger/financial/suspense/${branchId}?name=${encodeURIComponent(branchName)}`
      );
      return;
    }
    const id = (row as any).id ?? "";
    const name = (row as any).name ?? "";
    setCategoryModal({ view, id, name });
  };

  const closeCategoryModal = () => setCategoryModal(null);

  const handleCategorySubmit = async (category: string) => {
    if (!categoryModal) return;
    const { view, id, name } = categoryModal;
    closeCategoryModal();

    // Suspense rows now navigate straight to the per-transaction detail
    // page from `openCategoryModal` — this branch is unreachable but
    // kept as a safety net in case a future caller sets `view: "SUSPENSE"`
    // directly. It mirrors the previous behaviour (group by branch + cat).
    if (view === "SUSPENSE") {
      try {
        await dispatch(
          fetchLedgerBySuspenseId({
            branchId: id,
            category: category as SuspenseCategory,
          })
        ).unwrap();
        router.push(`/ledger/financial/suspense/${id}?category=${category}&name=${encodeURIComponent(name)}`);
      } catch (err: any) {
        addToast(err || "Failed to fetch suspense ledgers", "error");
      }
      return;
    }

    // Branch-wise → getLedgerByBranchId
    if (view === "BRANCH") {
      try {
        await dispatch(
          fetchLedgerByBranchId({
            branchId: id,
            category: category as BranchCategory,
          })
        ).unwrap();
        router.push(`/ledger/financial/branch/${id}?category=${category}&name=${encodeURIComponent(name)}`);
      } catch (err: any) {
        addToast(err || "Failed to fetch branch ledgers", "error");
      }
      return;
    }

    // Agency-wise → getLedgerByAgencyId
    try {
      await dispatch(
        fetchLedgerByAgencyId({
          agencyId: id,
          category: category as AgencyCategory,
        })
      ).unwrap();
      router.push(`/ledger/financial/agency/${id}?category=${category}&name=${encodeURIComponent(name)}`);
    } catch (err: any) {
      addToast(err || "Failed to fetch agency ledgers", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Wallet className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Ledger</h1>
            <p className="text-gray-500 mt-1">
              View ledgers by Branch, Agency, or Suspense accounts
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-white border border-gray-200 rounded-lg p-1 mb-4 h-auto">
          <TabsTrigger
            value="AGENCY"
            className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Briefcase className="h-4 w-4" />
            Agency-wise
          </TabsTrigger>
          <TabsTrigger
            value="BRANCH"
            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Branch-wise
          </TabsTrigger>
          <TabsTrigger
            value="SUSPENSE"
            className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            Suspense
          </TabsTrigger>
          <TabsTrigger
            value="COMPANY"
            className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Building className="h-4 w-4" />
            Company
          </TabsTrigger>
        </TabsList>

        {/* Shared search bar (or date filter for the COMPANY tab) */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
          {activeTab === "COMPANY" ? (
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Start Date</label>
                <Input
                  type="date"
                  value={draftStartDate}
                  max={draftEndDate || undefined}
                  onChange={(e) => setDraftStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">End Date</label>
                <Input
                  type="date"
                  value={draftEndDate}
                  min={draftStartDate || undefined}
                  onChange={(e) => setDraftEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  size="sm"
                  onClick={applyCompanyFilters}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  <FilterIcon className="h-3.5 w-3.5" />
                  Apply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetCompanyFilters}
                  className="gap-1.5"
                >
                  Reset
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 md:ml-auto"
                onClick={handleCompanyExport}
                loading={exporting}
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={
                      activeTab === "AGENCY"
                        ? "Search agencies by name..."
                        : activeTab === "BRANCH"
                        ? "Search branches by name or code..."
                        : "Search suspense ledgers..."
                    }
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 md:self-end"
                onClick={handleExport}
                loading={exporting}
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="AGENCY" className="mt-0">
          <LedgerTable
            rows={financialLedgers}
            view="AGENCY"
            isLoading={isFinancialListLoading}
            error={financialListError}
            pagination={financialPagination}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onViewDetails={(row) => openCategoryModal(row, "AGENCY")}
          />
        </TabsContent>

        <TabsContent value="BRANCH" className="mt-0">
          <LedgerTable
            rows={financialLedgers}
            view="BRANCH"
            isLoading={isFinancialListLoading}
            error={financialListError}
            pagination={financialPagination}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onViewDetails={(row) => openCategoryModal(row, "BRANCH")}
          />
        </TabsContent>

        <TabsContent value="SUSPENSE" className="mt-0">
          <SuspenseTabContent
            rows={financialLedgers}
            suspenseData={suspenseData}
            isLoading={isFinancialListLoading}
            error={financialListError}
            onViewDetails={(row) => openCategoryModal(row, "SUSPENSE")}
          />
        </TabsContent>

        <TabsContent value="COMPANY" className="mt-0">
          <CompanyLedgerTab
            data={currentCompanyLedger}
            isLoading={isCompanyLedgerLoading}
            error={companyLedgerError}
          />
        </TabsContent>
      </Tabs>

      {/* Category selection modal (used by Branch and Agency view) */}
      {categoryModal && (
        <CategorySelectModal
          view={categoryModal.view}
          entityName={categoryModal.name}
          categories={
            categoryModal.view === "BRANCH"
              ? (BRANCH_CATEGORIES as { value: string; label: string }[])
              : categoryModal.view === "AGENCY"
              ? (AGENCY_CATEGORIES as { value: string; label: string }[])
              : (SUSPENSE_CATEGORIES as { value: string; label: string }[])
          }
          onCancel={closeCategoryModal}
          onSubmit={handleCategorySubmit}
        />
      )}

      <ToastContainer />
    </div>
  );
}

// ============================================================
// Reusable table — 4 columns only
// 1. Branch/Agency Name
// 2. Balance Amount
// 3. GST No of Branch
// 4. Closing Balance
// ============================================================
function LedgerTable({
  rows,
  view,
  isLoading,
  error,
  pagination,
  currentPage,
  onPageChange,
  onViewDetails,
}: {
  rows: LedgerViewRow[];
  view: LedgerView;
  isLoading: boolean;
  error: string | null;
  pagination: { total: number; page: number; limit: number; totalPages: number } | null;
  currentPage: number;
  onPageChange: (p: number) => void;
  onViewDetails: (row: LedgerViewRow) => void;
}) {
  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          {view === "AGENCY" ? (
            <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          ) : (
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          )}
          <p className="text-gray-500">
            No {view === "AGENCY" ? "agencies" : "branches"} found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  {view === "AGENCY" ? "Agency Name" : "Branch Name"}
                </th>

                {(view === "AGENCY" || view === "BRANCH") && (
                  <>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Total Receivable
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Total Payable
                    </th>
                  </>
                )}
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  GST No
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Closing Balance
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <LedgerRow
                  key={(row as any).id}
                  row={row}
                  view={view}
                  onViewDetails={onViewDetails}
                />
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * pagination.limit) + 1} to{" "}
              {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LedgerRow({
  row,
  view,
  onViewDetails,
}: {
  row: LedgerViewRow;
  view: LedgerView;
  onViewDetails: (row: LedgerViewRow) => void;
}) {
  const name = (row as any).name ?? "";
  const code = (row as any).code;
  const gstin = (row as any).gstin ?? null;

  const closingBalance = (row as any).closingBalance ?? 0;
  const totalReceivable = (row as any).totalReceivable ?? 0;
  const totalPayable = (row as any).totalPayable ?? 0;
  const balanceType = (row as any).balanceType as
    | "RECEIVABLE"
    | "PAYABLE"
    | "DR"
    | "CR"
    | undefined;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {view === "AGENCY" ? (
            <Briefcase className="h-4 w-4 text-amber-600" />
          ) : (
            <Building2 className="h-4 w-4 text-blue-600" />
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">{name || "—"}</div>
            {code && (
              <div className="text-[11px] font-mono text-gray-400">{code}</div>
            )}
          </div>
        </div>
      </td>

      {(view === "AGENCY" || view === "BRANCH") && (
        <>
          <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
            {formatCurrency(Number(totalReceivable) || 0)}
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium text-amber-700">
            {formatCurrency(Number(totalPayable) || 0)}
          </td>
        </>
      )}
      <td className="px-4 py-3 text-sm text-gray-600">
        {gstin ? (
          <span className="font-mono text-xs">{gstin}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
        <div className="flex flex-col items-end gap-0.5">
          <span>{formatCurrency(Number(closingBalance) || 0)}</span>
          {(view === "AGENCY" || view === "BRANCH") && balanceType && (
            <Badge
              variant={balanceType === "RECEIVABLE" ? "success" : "warning"}
              className="text-[10px] px-1.5 py-0"
            >
              {balanceType}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
          onClick={() => onViewDetails(row)}
        >
          <Eye className="h-4 w-4" />
          View Details
        </Button>
      </td>
    </tr>
  );
}

// ============================================================
// Suspense tab — list of suspense transactions
// (backend /api/ledgers/get-all?view=SUSPENSE returns either
//  a flat transactions array, or { summary, data: [...] })
// ============================================================
function SuspenseTabContent({
  rows,
  suspenseData,
  isLoading,
  error,
  onViewDetails,
}: {
  rows: LedgerViewRow[];
  suspenseData: {
    summary: { totalTransactions: number; totalInward: number; totalOutward: number } | null;
    transactions: SuspenseTransactionRow[];
  } | null;
  isLoading: boolean;
  error: string | null;
  onViewDetails: (txn: SuspenseTransactionRow) => void;
}) {
  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const transactions = suspenseData?.transactions ?? [];
  const summary = suspenseData?.summary;
  void rows; // rows are unused here — suspense view uses suspenseData instead

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No suspense accounts found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalTransactions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase">Total Inward</p>
              <p className="text-xl font-bold text-green-700 mt-1">
                {formatCurrency(summary.totalInward)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase">Total Outward</p>
              <p className="text-xl font-bold text-amber-700 mt-1">
                {formatCurrency(summary.totalOutward)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transaction No</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Direction</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-700">{txn.transactionNo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {txn.branch?.name ?? "—"}
                          </div>
                          {txn.branch?.code && (
                            <div className="text-[11px] font-mono text-gray-400">
                              {txn.branch.code}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={txn.direction === "INWARD" ? "success" : "warning"}>
                        {txn.direction}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(Number(txn.amount) || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {txn.paymentMode ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {txn.paymentType ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {txn.remarks ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => onViewDetails(txn)}
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================
// Company ledger tab — whole-company consolidated statement
// driven by startDate/endDate filters. Uses the income/expense
// entry shape (serialNo, date, description, income, expense, balance).
// ============================================================
function CompanyLedgerTab({
  data,
  isLoading,
  error,
}: {
  data: CompanyLedgerResponse | null;
  isLoading: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">Apply a date filter to load the company ledger</p>
        </CardContent>
      </Card>
    );
  }

  const { company, summary, entries } = data;

  return (
    <>
      {/* Company header + summary cards */}
      <div className="mb-3 flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Building className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {company?.name || "Company Ledger"}
          </h2>
          <p className="text-xs text-gray-500">Consolidated company statement</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{entries?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Income</p>
            <p className="text-xl font-bold text-green-700 mt-1">
              {formatCurrency(Number(summary?.totalIncome ?? 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Expense</p>
            <p className="text-xl font-bold text-amber-700 mt-1">
              {formatCurrency(Number(summary?.totalExpense ?? 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Closing Balance</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(Number(summary?.closingBalance ?? 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {!entries || entries.length === 0 ? (
            <div className="p-12 text-center">
              <Building className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transactions for the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Income</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Expense</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e) => (
                    <tr key={`${e.serialNo}-${e.date}-${e.branch ?? ""}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{e.serialNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{e.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {e.branch ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <Building2 className="h-3 w-3 mr-1 inline" />
                            {e.branch}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{e.description}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                        {e.income ? formatCurrency(e.income) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-amber-700">
                        {e.expense ? formatCurrency(e.expense) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(e.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================
// Category selection modal — appears under the action row
// when View Details is clicked (Branch / Agency only).
// ============================================================
function CategorySelectModal({
  view,
  entityName,
  categories,
  onCancel,
  onSubmit,
}: {
  view: "BRANCH" | "AGENCY" | "SUSPENSE";
  entityName: string;
  categories: { value: string; label: string }[];
  onCancel: () => void;
  onSubmit: (category: string) => void;
}) {
  const [selected, setSelected] = React.useState<string>("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {view === "BRANCH" ? (
              <Building2 className="h-5 w-5 text-blue-600" />
            ) : view === "AGENCY" ? (
              <Briefcase className="h-5 w-5 text-amber-600" />
            ) : (
              <Layers className="h-5 w-5 text-orange-600" />
            )}
            <h2 className="text-base font-semibold text-gray-900">
              Select Ledger Category
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Choose a category to view ledgers for{" "}
            <span className="font-medium text-gray-700">{entityName}</span>.
          </p>
        </div>

        <div className="p-5 space-y-2 max-h-80 overflow-y-auto">
          {categories.map((cat) => {
            const isSelected = selected === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelected(cat.value)}
                className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{cat.label}</span>
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => selected && onSubmit(selected)}
            disabled={!selected}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
