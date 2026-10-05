"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react";
import { ReportLayout } from "@/components/reports";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { reportApi } from "@/app/services/report.service";
import { branchApi } from "@/app/services/branch.service";
import { ledgerApi } from "@/app/services/ledger.service";
import { Branch } from "@/app/types/branch";
import { TrialBalanceNode, TrialBalanceResponse, TrialBalanceTransaction } from "@/app/types/report";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function displayName(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) return String((value as { name?: unknown }).name ?? "-");
  return "-";
}

export default function TrialBalancePage() {
  return <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}><TrialBalanceContent /></React.Suspense>;
}

function TrialBalanceContent() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const queryBranchId = searchParams?.get("branchId") ?? "";
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [branchId, setBranchId] = React.useState(queryBranchId);
  const startDate = searchParams?.get("startDate") ?? undefined;
  const endDate = searchParams?.get("endDate") ?? undefined;
  const [data, setData] = React.useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const [selectedLedger, setSelectedLedger] = React.useState<TrialBalanceNode | null>(null);
  const [transactions, setTransactions] = React.useState<TrialBalanceTransaction[]>([]);
  const [transactionLoading, setTransactionLoading] = React.useState(false);
  const [transactionError, setTransactionError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<{ page: number; totalPages: number; totalEntries: number; limit: number } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void branchApi.getActive().then((res) => {
      if (!cancelled && res.success) setBranches(res.data?.branches ?? []);
    }).catch(() => { if (!cancelled) addToast("Failed to load branches", "error"); });
    return () => { cancelled = true; };
  }, [addToast]);

  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportApi.getTrialBalanceReport({ branchId, startDate, endDate, includeZero: false });
      if (res.success && res.data) {
        setData(res.data);
        setExpanded(new Set());
      } else {
        const message = res.message || "Failed to load trial balance";
        setError(message);
        addToast(message, "error");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load trial balance";
      setError(message);
      addToast(message, "error");
    } finally { setLoading(false); }
  }, [branchId, startDate, endDate, addToast]);

  React.useEffect(() => { void fetchReport(); }, [fetchReport]);

  const fetchTransactions = React.useCallback(async (ledger: TrialBalanceNode, requestedPage: number) => {
    const ledgerId = ledger.ledgerId ?? ledger.id.replace(/^ledger:/, "");
    if (!ledgerId) {
      setTransactionError("This ledger does not have a valid ledger ID.");
      return;
    }
    setTransactionLoading(true);
    setTransactionError(null);
    try {
      // Match the report API's 1000-row default so a ledger click shows its
      // full voucher list in one view; pagination remains available for larger ledgers.
      const res = await ledgerApi.getLedgerStatement(ledgerId, { startDate, endDate, page: requestedPage, limit: 1000 });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load ledger transactions");
      const payload = res.data;
      const list = payload.entries ?? [];
      setTransactions(list.map((entry) => ({
        ...entry,
        date: entry.date,
        voucherNo: entry.voucherNo ?? undefined,
        voucherType: entry.voucherType ?? undefined,
        narration: entry.narration ?? undefined,
        debit: entry.debit,
        credit: entry.credit,
        invoiceNo: entry.invoiceNo ?? undefined,
        branch: entry.branch ?? undefined,
        sourceDocument: entry.sourceDocument && typeof entry.sourceDocument === "object"
          ? { name: entry.sourceDocument.voucherType ?? entry.sourceDocument.voucherNo }
          : entry.sourceDocument ?? undefined,
      })) as unknown as TrialBalanceTransaction[]);
      const meta = payload.meta;
      setPagination(meta ? {
        page: meta.page ?? requestedPage,
        totalPages: meta.totalPages ?? 1,
        totalEntries: meta.total ?? list.length,
        limit: meta.limit ?? 1000,
      } : null);
      setPage(requestedPage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load ledger transactions";
      setTransactionError(message);
      setTransactions([]);
    } finally { setTransactionLoading(false); }
  }, [startDate, endDate]);

  const openLedger = (ledger: TrialBalanceNode) => {
    setSelectedLedger(ledger);
    setTransactions([]);
    setPagination(null);
    void fetchTransactions(ledger, 1);
  };

  const tree = data?.tree?.length ? data.tree : (data?.rows ?? []).reduce<TrialBalanceNode[]>((groups, row) => {
    let group = groups.find((item) => item.id === `group:${row.groupId || row.parentGroup}`);
    if (!group) {
      group = { id: `group:${row.groupId || row.parentGroup}`, name: row.parentGroup || "Ungrouped", rowType: "accountingHeader", children: [] };
      groups.push(group);
    }
    group.children!.push({
      id: row.ledgerId || (row as any).id,
      ledgerId: row.ledgerId || (row as any).id,
      name: row.account,
      code: row.ledgerCode,
      rowType: "ledger",
      periodDebit: row.debit,
      periodCredit: row.credit,
      closingDebit: row.closingDebit,
      closingCredit: row.closingCredit,
      closingBalance: row.closingSigned ?? row.closingDebit - row.closingCredit,
      closingBalanceType: row.closingSigned < 0 ? "Cr" : "Dr",
      branchId: (row as any).branchId,
      branch: (row as any).branch ?? ((row as any).branchName ? { name: (row as any).branchName } : null),
      agencyId: (row as any).agencyId,
      agency: (row as any).agency,
    } as TrialBalanceNode);
    return groups;
  }, []);
  const hasValues = (node: TrialBalanceNode) => [node.periodDebit, node.periodCredit, node.closingDebit, node.closingCredit, node.closingBalance].some((v) => Number(v ?? 0) !== 0);
  const ledgerName = (node: TrialBalanceNode) => node.name?.trim() || (node as any).ledgerName || (node as any).ledger?.name || (node as any).account || node.code || node.ledgerId || node.id.replace(/^ledger:/, "") || "Unnamed ledger";

  const renderNodes = (nodes: TrialBalanceNode[], depth = 0): React.ReactNode => nodes.map((node) => {
    const isGroup = (node.children?.length ?? 0) > 0 || (node.rowType === "accountingHeader" && !node.ledgerId);
    const children = node.children ?? [];
    const isExpanded = expanded.has(node.id);
    return <React.Fragment key={node.id}>
      <tr className={isGroup ? "bg-gray-50 font-semibold text-gray-800" : "hover:bg-green-50/60"}>
        <td className="px-4 py-3 whitespace-nowrap" style={{ paddingLeft: `${16 + depth * 24}px` }}>
          {isGroup ? <button type="button" aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.name}`} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); return next; })} className="mr-2 inline-flex align-middle text-gray-500 hover:text-gray-900">{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button> : <span className="mr-2 inline-block w-4" />}
          {isGroup ? (node.name?.trim() || "Unnamed group") : <button type="button" className="text-left text-green-700 hover:underline" onClick={() => openLedger(node)}>{ledgerName(node)}</button>}
          {!isGroup && node.code ? <span className="ml-2 font-mono text-xs text-gray-400">{node.code}</span> : null}
          {!isGroup && (node.branch || node.branchId) ? <span className="ml-2 text-xs text-gray-400">{displayName(node.branch) !== "-" ? displayName(node.branch) : branches.find((branch) => branch.id === node.branchId)?.name ?? ""}</span> : null}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(node.periodDebit ?? 0)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(node.periodCredit ?? 0)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(node.closingBalance ?? ((node.closingDebit ?? 0) - (node.closingCredit ?? 0)))}</td>
        <td className="px-4 py-3 text-center">{node.closingBalanceType ?? ((node.closingDebit ?? 0) > 0 ? "Dr" : (node.closingCredit ?? 0) > 0 ? "Cr" : "-")}</td>
      </tr>
      {isGroup && isExpanded ? renderNodes(children, depth + 1) : null}
    </React.Fragment>;
  });

  const exportDisabled = !tree.some(hasValues);
  return <div className="mx-auto w-full max-w-[1500px]">
    <ReportLayout title="Trial Balance" description="Period activity and closing balances by accounting group and ledger" generatedAt={data?.generatedAt} onRefresh={() => void fetchReport()} isRefreshing={loading}
      actions={<ReportExportButton disabled={exportDisabled} onExport={async () => reportApi.exportTrialBalanceExcel({ branchId, startDate, endDate })} />}
      summary={data?.summary ? [
        { title: "Total Debit", value: data.summary.totalDebit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
        { title: "Total Credit", value: data.summary.totalCredit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
        { title: "Closing Debit", value: data.summary.totalClosingDebit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
        { title: "Closing Credit", value: data.summary.totalClosingCredit, hint: "", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
      ] : []}
      toolbar={<div className="flex items-center gap-2"><label htmlFor="trial-balance-branch" className="text-sm text-gray-600">Branch</label><select id="trial-balance-branch" value={branchId} onChange={(event) => setBranchId(event.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div>} isLoading={loading} isEmpty={!loading && !error && tree.length === 0} emptyMessage="No trial balance data" emptyDescription="Try a different branch or date range.">
      {error && !loading ? <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button className="ml-2 underline" onClick={() => void fetchReport()}>Retry</button></div> : null}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-gray-100 text-xs uppercase tracking-wide text-gray-600"><tr><th className="px-4 py-3 text-left">Account</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Closing balance</th><th className="px-4 py-3 text-center">Dr/Cr</th></tr></thead>
          <tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500"><Loader2 className="mr-2 inline animate-spin" size={16} />Loading trial balance…</td></tr> : renderNodes(tree)}</tbody>
        </table>
      </div>

      <Dialog open={!!selectedLedger} onOpenChange={(open) => { if (!open) setSelectedLedger(null); }}>
        <DialogContent className="!fixed !left-auto !right-0 !top-0 !h-screen !max-h-screen !w-[min(96vw,1400px)] !max-w-none !translate-x-0 !translate-y-0 overflow-y-auto rounded-none p-5 sm:p-7">
          <DialogHeader><DialogTitle>{selectedLedger ? ledgerName(selectedLedger) : "Ledger transactions"} — vouchers</DialogTitle><DialogDescription>All voucher and journal entries for this ledger in the selected period.</DialogDescription></DialogHeader>
          {selectedLedger?.code ? <div className="text-xs text-gray-500">Ledger code: {selectedLedger.code}</div> : null}
          {transactionError ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{transactionError} <button className="ml-2 underline" onClick={() => selectedLedger && void fetchTransactions(selectedLedger, page)}>Retry</button></div> : null}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[760px] text-xs"><thead className="bg-gray-100 text-left text-gray-600"><tr>{["Date", "Voucher number", "Voucher type", "Narration", "Debit", "Credit"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">{transactionLoading ? <tr><td colSpan={6} className="p-8 text-center text-gray-500"><Loader2 className="mr-2 inline animate-spin" size={16} />Loading vouchers…</td></tr> : transactions.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-gray-500">No vouchers for this period.</td></tr> : transactions.map((txn, index) => <tr key={txn.voucherId ?? `${txn.voucherNo ?? "voucher"}-${index}`} className="align-top"><td className="whitespace-nowrap px-3 py-2">{formatDate(txn.date)}</td><td className="px-3 py-2">{txn.voucherNo ?? txn.transactionNo ?? txn.invoiceNo ?? "-"}</td><td className="px-3 py-2">{txn.voucherType ?? "-"}</td><td className="max-w-xs whitespace-normal px-3 py-2">{txn.narration ?? txn.particular ?? "-"}</td><td className="whitespace-nowrap px-3 py-2 text-right">{formatCurrency(txn.debit ?? 0)}</td><td className="whitespace-nowrap px-3 py-2 text-right">{formatCurrency(txn.credit ?? 0)}</td></tr>)}</tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 ? <div className="flex items-center justify-between text-sm text-gray-600"><span>Page {pagination.page} of {pagination.totalPages} · {pagination.totalEntries} transactions</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || transactionLoading} onClick={() => selectedLedger && void fetchTransactions(selectedLedger, page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= pagination.totalPages || transactionLoading} onClick={() => selectedLedger && void fetchTransactions(selectedLedger, page + 1)}>Next</Button></div></div> : null}
        </DialogContent>
      </Dialog>
    </ReportLayout>
  </div>;
}
