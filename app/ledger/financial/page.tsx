"use client";

import * as React from "react";
import {
  Wallet, Search, Eye, Building2,
  Briefcase, Layers,
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
} from "@/app/store/ledgerSlice";
import {
  LedgerView,
  LedgerViewRow,
  SuspenseTransactionRow,
} from "@/app/types/ledger";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

type BranchCategory = "ACCOUNTING_LEDGER" | "CASH" | "GST" | "DEBTORS" | "CREDITORS";
type AgencyCategory = "ACCOUNTING_LEDGER" | "CASH" | "DEBTORS" | "CREDITORS";
type SuspenseCategory = "ACCOUNTING_LEDGER" | "CASH";

const BRANCH_CATEGORIES: { value: BranchCategory; label: string }[] = [
  { value: "ACCOUNTING_LEDGER", label: "All Ledgers" },
  { value: "CASH", label: "Cash & Bank" },
  { value: "GST", label: "GST" },
  { value: "DEBTORS", label: "Sundry Debtors" },
  { value: "CREDITORS", label: "Sundry Creditors" },
];

const AGENCY_CATEGORIES: { value: AgencyCategory; label: string }[] = [
  { value: "ACCOUNTING_LEDGER", label: "All Ledgers" },
  { value: "CASH", label: "Cash & Bank" },
  { value: "DEBTORS", label: "Sundry Debtors" },
  { value: "CREDITORS", label: "Sundry Creditors" },
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
  } = useAppSelector((state) => state.ledger);

  // Three tabs - AGENCY is the default
  const [activeTab, setActiveTab] = React.useState<LedgerView>("AGENCY");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

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

  // === View Details click → modal with category selection ===
  const [categoryModal, setCategoryModal] = React.useState<null | {
    view: "BRANCH" | "AGENCY" | "SUSPENSE";
    id: string;
    name: string;
  }>(null);

  const openCategoryModal = (row: any, view: "BRANCH" | "AGENCY" | "SUSPENSE") => {
    // For suspense tab, each row is a transaction (not a branch).
    // But "View Details" should still drive a category selection that
    // navigates to the branch suspense page (using the txn's branch.id).
    let id = "";
    let name = "";
    if (view === "SUSPENSE") {
      const txn = row as unknown as SuspenseTransactionRow;
      id = txn?.branch?.id ?? "";
      name = txn?.branch?.name ?? "";
    } else {
      id = (row as any).id ?? "";
      name = (row as any).name ?? "";
    }
    setCategoryModal({ view, id, name });
  };

  const closeCategoryModal = () => setCategoryModal(null);

  const handleCategorySubmit = async (category: string) => {
    if (!categoryModal) return;
    const { view, id, name } = categoryModal;
    closeCategoryModal();

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

    if (view === "AGENCY") {
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
      return;
    }

    // Suspense → getLedgerBySuspenseId
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
        </TabsList>

        {/* Shared search bar */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
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
          </div>
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
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Opening Balance
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Balance Amount
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  GST No of Branch
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
  const openingBalance = (row as any).openingBalance ?? 0;
  const balanceAmount = (row as any).balanceAmount ?? (row as any).closingBalance ?? 0;
  const closingBalance = (row as any).closingBalance ?? 0;

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
      <td className="px-4 py-3 text-right text-sm text-gray-600">
        {formatCurrency(Number(openingBalance) || 0)}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
        {formatCurrency(Number(balanceAmount) || 0)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {gstin ? (
          <span className="font-mono text-xs">{gstin}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
        {formatCurrency(Number(closingBalance) || 0)}
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
