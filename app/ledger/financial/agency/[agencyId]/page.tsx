"use client";

import * as React from "react";
import {
  ArrowLeft, Briefcase, RefreshCw, BookOpen, AlertTriangle,
  Mail, Phone, MapPin, Hash, User, Tag, ToggleLeft, Download,
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
  fetchLedgerByAgencyId,
  clearFinancialCurrentDetail,
} from "@/app/store/ledgerSlice";
import {
  AgencyVoucherEntry,
  AgencyCashVoucherEntry,
  AgencyCashEntry,
  AgencyPartyLedgerGroup,
} from "@/app/types/ledger";
import { formatCurrency } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function AgencyLedgerDetailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <AgencyLedgerDetailContent />
    </React.Suspense>
  );
}

function AgencyLedgerDetailContent() {
  const params = useParams<{ agencyId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();

  const agencyId = params?.agencyId;
  const category = searchParams?.get("category") || "ACCOUNTING_LEDGER";
  const entityName = searchParams?.get("name") || "Agency";

  // Date filter state — what the user is editing (draft) vs what is sent
  // to the API (applied). Apply commits drafts → applied, then refetches.
  const [draftStartDate, setDraftStartDate] = React.useState<string>("");
  const [draftEndDate, setDraftEndDate] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  const {
    currentAgencyDetail,
    isAgencyDetailLoading,
    agencyDetailError,
  } = useAppSelector((state) => state.ledger);

  const fetchData = React.useCallback(async () => {
    if (!agencyId) return;
    try {
      await dispatch(
        fetchLedgerByAgencyId({
          agencyId,
          category: category as any,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        })
      ).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch agency ledgers", "error");
    }
  }, [dispatch, agencyId, category, startDate, endDate, addToast]);

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
    if (!agencyId) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append("export", "true");
      if (category) params.append("category", category);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      await downloadFile(
        `api/ledgers/agency/${agencyId}?${params.toString()}`,
        `ledger_agency_${(currentAgencyDetail?.agency?.name || agencyId)}.xlsx`
      );
      addToast("Agency ledger exported successfully", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export agency ledger", "error");
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

  const detail = currentAgencyDetail;
  const summary = detail?.summary || {};
  const agency = detail?.agency;
  const isCash = category === "CASH";
  const isParty = category === "CREDITORS" || category === "DEBTORS";

  // ===== Pick the right entries for this category =====
  let voucherEntries: AgencyVoucherEntry[] = [];
  let cashVoucherEntries: AgencyCashVoucherEntry[] = [];
  let cashTxnEntries: AgencyCashEntry[] = [];
  let partyGroups: AgencyPartyLedgerGroup[] = [];

  if (isParty) {
    partyGroups = detail?.data || [];
  } else if (isCash) {
    // CASH responses come in two flavors. The current backend uses the
    // voucher shape { date, voucherNo, particular, debit, credit, balance }
    // under the regular `entries` field. Older payloads may use
    // `cashEntries` (same voucher shape) or `cashTransactionEntries` /
    // `entries` with the older transactional shape.
    cashVoucherEntries =
      (detail?.cashEntries as unknown as AgencyCashVoucherEntry[] | undefined) ||
      (detail?.entries as unknown as AgencyCashVoucherEntry[] | undefined) ||
      [];
    cashTxnEntries = detail?.cashTransactionEntries || [];
  } else {
    voucherEntries = detail?.entries || [];
  }

  // ===== Summary-card values per category =====
  const openingBalance = Number(summary.openingBalance ?? 0);
  const totalPurchases = Number(summary.totalPurchases ?? 0);
  const totalPayments = Number(summary.totalPayments ?? 0);
  const closingBalance = Number(summary.closingBalance ?? 0);
  const totalReceipt = Number(summary.totalReceipt ?? 0);
  const totalPayment = Number(summary.totalPayment ?? 0);
  const totalTransactions =
    (summary.totalTransactions as number) ??
    (isParty
      ? partyGroups.reduce((acc, g) => acc + (g.entries?.length || 0), 0)
      : isCash
      ? cashVoucherEntries.length || cashTxnEntries.length
      : voucherEntries.length);

  const amountReceivable = Number(agency?.amountReceivable ?? 0);
  const amountPayable = Number(agency?.amountPayable ?? 0);

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
          <div className="p-2 bg-amber-100 rounded-lg">
            <Briefcase className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {agency?.name || entityName}
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Agency-wise Ledgers</span>
              <Badge variant="outline">{category}</Badge>
              {agency?.type && <Badge variant="secondary">{agency.type}</Badge>}
              {agency?.gstin && (
                <span className="font-mono text-xs">GSTIN: {agency.gstin}</span>
              )}
              {agency?.isActive !== undefined && (
                <Badge variant={agency.isActive ? "success" : "secondary"} dot>
                  {agency.isActive ? "Active" : "Inactive"}
                </Badge>
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

      {/* Summary cards — switch on category */}
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
        ) : isCash ? (
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

      

      {/* Agency profile */}
      {agency && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-amber-600" />
              Agency Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {agency.contactPerson && (
                <Field icon={<User className="h-3.5 w-3.5 text-gray-400" />} label="Contact Person">
                  {agency.contactPerson}
                </Field>
              )}
              {agency.mobileNumber && (
                <Field icon={<Phone className="h-3.5 w-3.5 text-gray-400" />} label="Mobile">
                  {agency.mobileNumber}
                </Field>
              )}
              {agency.email && (
                <Field icon={<Mail className="h-3.5 w-3.5 text-gray-400" />} label="Email">
                  <span className="break-all">{agency.email}</span>
                </Field>
              )}
              {agency.gstin && (
                <Field icon={<Hash className="h-3.5 w-3.5 text-gray-400" />} label="GSTIN">
                  <span className="font-mono">{agency.gstin}</span>
                </Field>
              )}
              {agency.stateCode && (
                <Field icon={<Tag className="h-3.5 w-3.5 text-gray-400" />} label="State Code">
                  {agency.stateCode}
                </Field>
              )}
              {agency.type && (
                <Field icon={<ToggleLeft className="h-3.5 w-3.5 text-gray-400" />} label="Type">
                  {agency.type}
                </Field>
              )}
              {(agency.addressLine1 || agency.city || agency.state || agency.pinCode) && (
                <Field icon={<MapPin className="h-3.5 w-3.5 text-gray-400" />} label="Address">
                  <span>
                    {agency.addressLine1}
                    {agency.addressLine2 ? `, ${agency.addressLine2}` : ""}
                    {agency.city ? `, ${agency.city}` : ""}
                    {agency.state ? `, ${agency.state}` : ""}
                    {agency.pinCode ? ` - ${agency.pinCode}` : ""}
                  </span>
                </Field>
              )}
            </div>
          </CardContent>
        </Card>
      )}
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
      {/* Ledger table — pick the right renderer per category */}
      <Card>
        <CardContent className="p-0">
          {isAgencyDetailLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : agencyDetailError ? (
            <div className="p-12 text-center">
              <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-600">{agencyDetailError}</p>
            </div>
          ) : isParty ? (
            <PartyLedgerTable groups={partyGroups} category={category} />
          ) : isCash ? (
            cashVoucherEntries.length > 0 ? (
              <CashVoucherTable entries={cashVoucherEntries} />
            ) : cashTxnEntries.length > 0 ? (
              <CashTransactionTable entries={cashTxnEntries} />
            ) : (
              <EmptyState message="No cash transactions found for this agency" />
            )
          ) : voucherEntries.length === 0 ? (
            <EmptyState message="No transactions found for this agency" />
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
          {/* Opening balance row */}
          {openingBalance !== 0 && (
            <tr className="bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-500 italic">—</td>
              <td className="px-4 py-3 text-sm text-gray-500 italic">—</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-700 italic">
                Opening Balance
              </td>
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
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch</th>
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
                {e.branch || <span className="text-gray-400">—</span>}
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
}: {
  groups: AgencyPartyLedgerGroup[];
  category: string;
}) {
  if (groups.length === 0) {
    return <EmptyState message={`No ${category.toLowerCase()} entries found for this agency`} />;
  }
  return (
    <div className="divide-y divide-gray-100">
      {groups.map((g) => (
        <div key={g.ledger.id} className="p-4">
          {/* Group header */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{g.ledger.name}</h3>
              <p className="text-[11px] font-mono text-gray-400">{g.ledger.code}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500">
                Op: <span className="font-semibold text-gray-700">{formatCurrency(g.summary.openingBalance)}</span>{" "}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {g.summary.openingBalanceType}
                </Badge>
              </span>
              <span className="text-green-700">
                Dr {formatCurrency(g.summary.totalDebit)}
              </span>
              <span className="text-amber-700">
                Cr {formatCurrency(g.summary.totalCredit)}
              </span>
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
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Voucher No</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Particular</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Debit</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Credit</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {g.entries.map((e, idx) => (
                    <tr key={`${e.voucherNo}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                        {e.date ? new Date(e.date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs">{e.voucherNo}</span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">{e.particular}</td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-green-700">
                        {e.debit ? formatCurrency(e.debit) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-amber-700">
                        {e.credit ? formatCurrency(e.credit) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(e.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
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

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5">
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}
