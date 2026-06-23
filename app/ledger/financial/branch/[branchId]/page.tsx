"use client";

import * as React from "react";
import {
  ArrowLeft, Building2, RefreshCw, BookOpen, AlertTriangle, Download,
  Filter as FilterIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchLedgerByBranchId,
  clearFinancialCurrentDetail,
} from "@/app/store/ledgerSlice";
import {
  AgencyVoucherEntry,
  AgencyCashVoucherEntry,
  AgencyCashEntry,
  AgencyPartyLedgerGroup,
  BranchLedgerEntry,
} from "@/app/types/ledger";
import { formatCurrency } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function BranchLedgerDetailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <BranchLedgerDetailContent />
    </React.Suspense>
  );
}

function BranchLedgerDetailContent() {
  const params = useParams<{ branchId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();

  const branchId = params?.branchId;
  const category = searchParams?.get("category") || "ACCOUNTING_LEDGER";
  const entityName = searchParams?.get("name") || "Branch";

  // Date filter state — what the user is editing (draft) vs what is sent
  // to the API (applied). Apply commits drafts → applied, then refetches.
  const [draftStartDate, setDraftStartDate] = React.useState<string>("");
  const [draftEndDate, setDraftEndDate] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  const {
    currentBranchDetail,
    isBranchDetailLoading,
    branchDetailError,
  } = useAppSelector((state) => state.ledger);

  const fetchData = React.useCallback(async () => {
    if (!branchId) return;
    try {
      await dispatch(
        fetchLedgerByBranchId({
          branchId,
          category: category as any,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        })
      ).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch branch ledgers", "error");
    }
  }, [dispatch, branchId, category, startDate, endDate, addToast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    return () => {
      dispatch(clearFinancialCurrentDetail());
    };
  }, [dispatch]);

  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    if (!branchId) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append("export", "true");
      if (category) params.append("category", category);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      await downloadFile(
        `api/ledgers/branch/${branchId}?${params.toString()}`,
        `ledger_branch_${(currentBranchDetail?.branch?.name || branchId)}.xlsx`
      );
      addToast("Branch ledger exported successfully", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export branch ledger", "error");
    } finally {
      setExporting(false);
    }
  };

  // Apply button: commit the draft dates to the applied state, triggering
  // a refetch via the useEffect on `fetchData`.
  const applyFilters = () => {
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
  };

  // Reset button: clear both draft and applied state.
  const resetFilters = () => {
    setDraftStartDate("");
    setDraftEndDate("");
    setStartDate("");
    setEndDate("");
  };

  const detail = currentBranchDetail;
  const summary = detail?.summary || {};
  const branch = detail?.branch;
  const isCash = category === "CASH";
  const isParty = category === "CREDITORS" || category === "DEBTORS";
  const isGst = category === "GST";

  // ===== Pick the right entries for this category =====
  let voucherEntries: AgencyVoucherEntry[] = [];
  let cashVoucherEntries: AgencyCashVoucherEntry[] = [];
  let cashTxnEntries: AgencyCashEntry[] = [];
  let cashIncomeExpenseEntries: BranchLedgerEntry[] = [];
  let partyGroups: AgencyPartyLedgerGroup[] = [];
  let incomeExpenseEntries: BranchLedgerEntry[] = [];
  let gstLedgers: import("@/app/types/ledger").FinancialLedgerListItem[] = [];

  if (isGst) {
    // GST: backend returns the list of GST ledgers (CGST/SGST/IGST)
    // directly under `ledgers` with summary keys
    // { totalGSTLedgers, totalDebit, totalCredit, totalBalance, createdAt, updatedAt }.
    gstLedgers = (detail?.ledgers as import("@/app/types/ledger").FinancialLedgerListItem[] | undefined) || [];
  } else if (isParty) {
    partyGroups = detail?.data || [];
  } else if (isCash) {
    // CASH responses come in several flavors:
    //   1. Income/expense shape (current backend for branches):
    //      { serialNo, date, description, income, expense, balance }
    //   2. Voucher shape: { date, voucherNo, particular, debit, credit, balance }
    //   3. Older transactional shape: { date, transactionNo, branch, relatedParty,
    //      direction, receipt, payment, narration }
    const raw = (detail?.entries || []) as unknown as Array<Record<string, any>>;
    const isIncomeExpenseShape =
      raw.length > 0 && raw[0] && "description" in raw[0] && "income" in raw[0];

    if (isIncomeExpenseShape) {
      cashIncomeExpenseEntries = raw as unknown as BranchLedgerEntry[];
    } else {
      cashVoucherEntries =
        (detail?.cashEntries as unknown as AgencyCashVoucherEntry[] | undefined) ||
        (detail?.entries as unknown as AgencyCashVoucherEntry[] | undefined) ||
        [];
      cashTxnEntries = detail?.cashTransactionEntries || [];
    }
  } else {
    // ACCOUNTING_LEDGER for branches uses the income/expense shape
    // (serialNo, date, description, income, expense, balance). Fall back
    // to the voucher shape for older payloads.
    incomeExpenseEntries = detail?.incomeExpenseEntries || [];
    if (incomeExpenseEntries.length === 0) {
      const raw = (detail?.entries || []) as unknown as Array<Record<string, any>>;
      // Detect the income/expense shape by the presence of `description`.
      if (raw.length > 0 && raw[0] && "description" in raw[0]) {
        incomeExpenseEntries = raw as unknown as BranchLedgerEntry[];
      } else {
        voucherEntries = raw as unknown as AgencyVoucherEntry[];
      }
    }
  }

  // ===== Summary-card values per category =====
  const openingBalance = Number(summary.openingBalance ?? 0);
  const totalPurchases = Number(summary.totalPurchases ?? 0);
  const totalPayments = Number(summary.totalPayments ?? 0);
  const closingBalance = Number(summary.closingBalance ?? 0);
  const totalReceipt = Number(summary.totalReceipt ?? 0);
  const totalPayment = Number(summary.totalPayment ?? 0);
  const totalInward = Number(summary.totalInward ?? 0);
  const totalOutward = Number(summary.totalOutward ?? 0);
  // Branch ACCOUNTING_LEDGER may use the income/expense summary keys.
  const totalIncome = Number(summary.totalIncome ?? 0);
  const totalExpense = Number(summary.totalExpense ?? 0);
  // GST uses its own summary keys: totalDebit / totalCredit / totalBalance
  // and totalGSTLedgers for the count.
  const totalGstLedgers = Number(summary.totalGSTLedgers ?? gstLedgers.length);
  const totalGstDebit = Number(summary.totalDebit ?? 0);
  const totalGstCredit = Number(summary.totalCredit ?? 0);
  const totalGstBalance = Number(summary.totalBalance ?? 0);
  const isIncomeExpense = !isCash && !isParty && !isGst && incomeExpenseEntries.length > 0;
  const isCashIncomeExpense = isCash && cashIncomeExpenseEntries.length > 0;
  const totalTransactions =
    (summary.totalTransactions as number) ??
    (isParty
      ? partyGroups.reduce((acc, g) => acc + (g.entries?.length || 0), 0)
      : isCash
      ? isCashIncomeExpense
        ? cashIncomeExpenseEntries.length
        : cashVoucherEntries.length || cashTxnEntries.length
      : isGst
      ? gstLedgers.length
      : isIncomeExpense
      ? incomeExpenseEntries.length
      : voucherEntries.length);

  const amountReceivable = Number((branch as any)?.amountReceivable ?? 0);
  const amountPayable = Number((branch as any)?.amountPayable ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/ledger/financial")}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {branch?.name || entityName}
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Branch-wise Ledgers</span>
              <Badge variant="outline">{category}</Badge>
              {branch?.code && (
                <span className="font-mono text-xs">Code: {branch.code}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            loading={exporting}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalTransactions}</p>
          </CardContent>
        </Card>
        {isParty ? (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Debit</p>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {formatCurrency(
                    partyGroups.reduce((a, g) => a + (g.summary?.totalDebit || 0), 0)
                  )}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Credit</p>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  {formatCurrency(
                    partyGroups.reduce((a, g) => a + (g.summary?.totalCredit || 0), 0)
                  )}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Closing Balance</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatCurrency(
                    partyGroups.reduce((a, g) => a + (g.summary?.closingBalance || 0), 0)
                  )}
                </p>
              </CardContent>
            </Card>
          </>
        ) : isGst ? (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total GST Ledgers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalGstLedgers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Debit</p>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {formatCurrency(totalGstDebit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Credit</p>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  {formatCurrency(totalGstCredit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Balance</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatCurrency(totalGstBalance)}
                </p>
              </CardContent>
            </Card>
          </>
        ) : isCash ? (
          isCashIncomeExpense ? (
            <>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase">Total Income</p>
                  <p className="text-xl font-bold text-green-700 mt-1">
                    {formatCurrency(totalIncome)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase">Total Expense</p>
                  <p className="text-xl font-bold text-amber-700 mt-1">
                    {formatCurrency(totalExpense)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase">Closing Balance</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(closingBalance)}
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase">Total Receipt</p>
                  <p className="text-xl font-bold text-green-700 mt-1">
                    {formatCurrency(totalReceipt)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase">Amount Receivable</p>
                  <p className="text-xl font-bold text-green-700 mt-1">
                    {formatCurrency(amountReceivable)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase">Amount Payable</p>
                  <p className="text-xl font-bold text-amber-700 mt-1">
                    {formatCurrency(amountPayable)}
                  </p>
                </CardContent>
              </Card>
            </>
          )
        ) : isIncomeExpense ? (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Income</p>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {formatCurrency(totalIncome)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Expense</p>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  {formatCurrency(totalExpense)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Closing Balance</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatCurrency(closingBalance)}
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Purchases</p>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  {formatCurrency(totalPurchases)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Payments</p>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {formatCurrency(totalPayments)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Closing Balance</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatCurrency(closingBalance)}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Date filter — Start Date / End Date fed to the backend on Apply. */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4">
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
              onClick={applyFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <FilterIcon className="h-3.5 w-3.5" />
              Apply
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="gap-1.5"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Ledger table */}
      <Card>
        <CardContent className="p-0">
          {isBranchDetailLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : branchDetailError ? (
            <div className="p-12 text-center">
              <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-600">{branchDetailError}</p>
            </div>
          ) : isParty ? (
            <PartyLedgerTable groups={partyGroups} category={category} emptyFor="branch" />
          ) : isGst ? (
            <GSTLedgerTable ledgers={gstLedgers} />
          ) : isCash ? (
            isCashIncomeExpense ? (
              <IncomeExpenseTable
                entries={cashIncomeExpenseEntries}
                openingBalance={0}
                hideOpeningRow
              />
            ) : cashVoucherEntries.length > 0 ? (
              <CashVoucherTable entries={cashVoucherEntries} />
            ) : cashTxnEntries.length > 0 ? (
              <CashTransactionTable entries={cashTxnEntries} />
            ) : (
              <EmptyState message="No cash transactions found for this branch" />
            )
          ) : isIncomeExpense ? (
            incomeExpenseEntries.length === 0 ? (
              <EmptyState message="No transactions found for this branch" />
            ) : (
              // When the backend already includes the Opening Balance row
              // (serialNo === 0 / date === null / description "Opening Balance"),
              // skip our page-generated one to avoid showing it twice.
              <IncomeExpenseTable
                entries={incomeExpenseEntries}
                openingBalance={openingBalance}
                hideOpeningRow={isBackendOpeningRow(incomeExpenseEntries)}
              />
            )
          ) : voucherEntries.length === 0 ? (
            <EmptyState message="No transactions found for this branch" />
          ) : (
            <VoucherTable entries={voucherEntries} openingBalance={openingBalance} />
          )}
        </CardContent>
      </Card>

      <ToastContainer />
    </div>
  );
}

// ============== Voucher-style table (ACCOUNTING_LEDGER) ==============
function VoucherTable({
  entries,
  openingBalance,
}: {
  entries: AgencyVoucherEntry[];
  openingBalance: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Voucher No</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Particular</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Debit</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Credit</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {openingBalance !== 0 && (
            <tr className="bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-500 italic">—</td>
              <td className="px-4 py-3 text-sm text-gray-500 italic">—</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-700 italic">Opening Balance</td>
              <td className="px-4 py-3 text-right text-sm text-gray-400">—</td>
              <td className="px-4 py-3 text-right text-sm text-gray-400">—</td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                {formatCurrency(openingBalance)}
              </td>
            </tr>
          )}
          {entries.map((e, idx) => (
            <tr key={`${e.voucherNo}-${idx}`} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {e.date ? new Date(e.date).toLocaleDateString() : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-sm font-medium">{e.voucherNo}</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{e.particular}</td>
              <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                {e.debit ? formatCurrency(e.debit) : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-amber-700">
                {e.credit ? formatCurrency(e.credit) : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                {formatCurrency(e.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============== Income/Expense table (ACCOUNTING_LEDGER / CASH, branch) ==============

/**
 * The branch ACCOUNTING_LEDGER response now includes the Opening Balance
 * as the first row of `entries` (serialNo: 0, date: null, description:
 * "Opening Balance", balance: openingBalance). When that row is present,
 * we suppress the page-generated Opening Balance row above the table
 * to avoid showing it twice.
 */
function isBackendOpeningRow(entries: BranchLedgerEntry[]): boolean {
  if (entries.length === 0) return false;
  const first = entries[0];
  if (first.date === null || first.date === undefined || first.date === "") {
    return true;
  }
  if (
    typeof first.description === "string" &&
    first.description.trim().toLowerCase().startsWith("opening balance")
  ) {
    return true;
  }
  return false;
}

function IncomeExpenseTable({
  entries,
  openingBalance,
  hideOpeningRow,
}: {
  entries: BranchLedgerEntry[];
  openingBalance: number;
  hideOpeningRow?: boolean;
}) {
  // CASH payloads send `date` as a pre-formatted string like "22-Jun-2026"
  // while ACCOUNTING_LEDGER sends an ISO timestamp. Render whatever the
  // server gave us — only attempt Date parsing if the value is ISO-shaped.
  const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}/.test(s);
  const formatDate = (s: string) => {
    if (!s) return "—";
    if (isIsoDate(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
    }
    return s;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Income</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Expense</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {!hideOpeningRow && openingBalance !== 0 && (
            <tr className="bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-500 italic">—</td>
              <td className="px-4 py-3 text-sm text-gray-500 italic">—</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-700 italic">Opening Balance</td>
              <td className="px-4 py-3 text-right text-sm text-gray-400">—</td>
              <td className="px-4 py-3 text-right text-sm text-gray-400">—</td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                {formatCurrency(openingBalance)}
              </td>
            </tr>
          )}
          {entries.map((e) => (
            <tr key={`${e.serialNo}-${e.date}`} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-500">{e.serialNo}</td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {formatDate(e.date)}
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
  );
}

// ============== Cash voucher table (CASH, voucher-style) ==============
function CashVoucherTable({ entries }: { entries: AgencyCashVoucherEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Voucher No</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Particular</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Debit</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Credit</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((e, idx) => (
            <tr key={`${e.voucherNo}-${idx}`} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {e.date ? new Date(e.date).toLocaleDateString() : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-sm font-medium">{e.voucherNo}</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{e.particular}</td>
              <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                {e.debit ? formatCurrency(e.debit) : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-amber-700">
                {e.credit ? formatCurrency(e.credit) : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                {formatCurrency(e.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============== Cash transactional table (CASH, older shape) ==============
function CashTransactionTable({ entries }: { entries: AgencyCashEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transaction No</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ref No</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agency</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Related Party</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Direction</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Receipt</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Narration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((e, idx) => (
            <tr key={`${e.transactionNo}-${idx}`} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {e.date ? new Date(e.date).toLocaleString() : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-sm font-medium">{e.transactionNo}</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {e.transactionRefNo || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {e.agency || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {e.relatedParty || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3">
                <Badge variant={e.direction === "INWARD" ? "success" : "warning"}>
                  {e.direction}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                {formatCurrency(e.receipt ?? 0)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {e.narration || <span className="text-gray-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============== Sundry Debtors / Creditors grouped table ==============
function PartyLedgerTable({
  groups,
  category,
  emptyFor,
}: {
  groups: AgencyPartyLedgerGroup[];
  category: string;
  emptyFor: "agency" | "branch";
}) {
  if (groups.length === 0) {
    return (
      <EmptyState
        message={`No ${category.toLowerCase()} entries found for this ${emptyFor}`}
      />
    );
  }
  return (
    <div className="divide-y divide-gray-100">
      {groups.map((g) => (
        <div key={g.ledger.id} className="p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{g.ledger.name}</h3>
              <p className="text-[11px] font-mono text-gray-400">{g.ledger.code}</p>
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="text-gray-500">
                Op:{" "}
                <span className="font-semibold text-gray-700">
                  {formatCurrency(g.summary.openingBalance)}
                </span>{" "}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {g.summary.openingBalanceType}
                </Badge>
              </span>
              <span className="text-green-700">Dr {formatCurrency(g.summary.totalDebit)}</span>
              <span className="text-amber-700">Cr {formatCurrency(g.summary.totalCredit)}</span>
              <span className="text-gray-900 font-semibold">
                Cl: {formatCurrency(g.summary.closingBalance)}{" "}
                <Badge
                  variant={g.summary.closingBalanceType === "DR" ? "info" : "purple"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {g.summary.closingBalanceType}
                </Badge>
              </span>
            </div>
          </div>

          {g.entries.length === 0 ? (
            <p className="text-sm text-gray-500 italic px-2 py-3">No entries for this ledger</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Voucher / Invoice</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Particular</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Debit</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Credit</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {g.entries.map((e, idx) => {
                    const voucherLabel = e.invoiceNo
                      ? `${e.voucherNo} · ${e.invoiceNo}`
                      : e.voucherNo;
                    const counterParties = (e.counterLedgers || [])
                      .map((c) => c.name)
                      .join(", ");
                    // Prefer the structured narration ("CounterLedgers") but
                    // fall back to the backend's `particular` field if absent.
                    const particular =
                      counterParties || e.particular || e.narration || "—";
                    const runningBalance = e.runningBalance ?? e.balance;
                    const balanceType = e.balanceType;
                    return (
                      <tr key={`${e.id ?? e.voucherNo}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                          {e.date ? new Date(e.date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-medium text-gray-700">{voucherLabel}</span>
                            {e.sourceDocument?.voucherType && (
                              <span className="text-[10px] uppercase tracking-wide text-gray-400">
                                {e.sourceDocument.voucherType}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {e.voucherType ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {e.voucherType}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700">
                          <div className="flex flex-col">
                            <span>{particular}</span>
                            {e.narration && particular !== e.narration && (
                              <span className="text-[10px] text-gray-400 italic">{e.narration}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-green-700">
                          {e.debit ? formatCurrency(e.debit) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-amber-700">
                          {e.credit ? formatCurrency(e.credit) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(runningBalance)}
                            </span>
                            {balanceType && (
                              <Badge
                                variant={balanceType === "DR" ? "info" : "purple"}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {balanceType}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============== GST ledger table (CGST/SGST/IGST ledgers) ==============
// Renders the list of GST ledgers returned under the GST category. Each
// row shows code, name, group, branch, opening / debit / credit / closing
// balances and a DR/CR badge.
function GSTLedgerTable({
  ledgers,
}: {
  ledgers: import("@/app/types/ledger").FinancialLedgerListItem[];
}) {
  if (ledgers.length === 0) {
    return <EmptyState message="No GST ledgers found for this branch" />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Group</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Opening</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Debit</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Credit</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Closing</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ledgers.map((l) => (
            <tr key={l.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <span className="font-mono text-sm font-medium">{l.code}</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{l.name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {l.group?.name || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-600">
                {formatCurrency(l.openingBalance)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                {formatCurrency(l.debit)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-amber-700">
                {formatCurrency(l.credit)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                {formatCurrency(l.closingBalance)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={l.balanceType === "DR" ? "info" : "purple"}>
                  {l.balanceType}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-12 text-center">
      <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}
