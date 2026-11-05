"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react";
import { ReportLayout } from "@/components/reports";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { reportApi } from "@/app/services/report.service";
import { ledgerApi } from "@/app/services/ledger.service";
import { TrialBalanceNode, TrialBalanceResponse, TrialBalanceTransaction } from "@/app/types/report";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import * as XLSX from "xlsx";

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN");
}

export default function TrialBalancePage() {
  return <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}><TrialBalanceContent /></React.Suspense>;
}

function TrialBalanceContent() {
  const { addToast } = useToast();
  const [data, setData] = React.useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [selectedLedger, setSelectedLedger] = React.useState<TrialBalanceNode | null>(null);
  const [transactions, setTransactions] = React.useState<TrialBalanceTransaction[]>([]);
  const [transactionLoading, setTransactionLoading] = React.useState(false);
  const [transactionError, setTransactionError] = React.useState<string | null>(null);
  const [transactionPage, setTransactionPage] = React.useState(1);
  const [transactionPagination, setTransactionPagination] = React.useState<{ page: number; totalPages: number; totalEntries: number; limit: number } | null>(null);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await reportApi.getTrialBalanceReport({ includeZero: false });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load trial balance");
      setData(res.data); setExpanded(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load trial balance";
      setError(message); addToast(message, "error");
    } finally { setLoading(false); }
  }, [addToast]);

  React.useEffect(() => { void fetchReport(); }, [fetchReport]);

  const fetchTransactions = React.useCallback(async (ledger: TrialBalanceNode, requestedPage: number) => {
    const ledgerId = ledger.ledgerId ?? ledger.id.replace(/^ledger:/, "");
    if (!ledgerId) { setTransactionError("This ledger does not have an id to load its vouchers."); return; }
    setTransactionLoading(true); setTransactionError(null);
    try {
      const response = await ledgerApi.getLedgerStatement(ledgerId, { page: requestedPage, limit: 1000 });
      if (!response.success || !response.data) throw new Error(response.message || "Unable to load ledger vouchers");
      const entries = response.data.entries ?? [];
      setTransactions(entries as unknown as TrialBalanceTransaction[]);
      const meta = response.data.meta;
      setTransactionPagination(meta ? { page: meta.page ?? requestedPage, totalPages: meta.totalPages ?? 1, totalEntries: meta.total ?? entries.length, limit: meta.limit ?? 1000 } : null);
      setTransactionPage(requestedPage);
    } catch (err) {
      setTransactions([]); setTransactionPagination(null);
      setTransactionError(err instanceof Error ? err.message : "Unable to load ledger vouchers");
    } finally { setTransactionLoading(false); }
  }, []);

  const openLedger = (ledger: TrialBalanceNode) => {
    setSelectedLedger(ledger); setTransactions([]); setTransactionPagination(null); setTransactionPage(1);
    void fetchTransactions(ledger, 1);
  };

  const exportLedger = React.useCallback(async () => {
    if (!selectedLedger) return;
    const ledgerId = selectedLedger.ledgerId ?? selectedLedger.id.replace(/^ledger:/, "");
    if (!ledgerId) return;
    try {
      const first = await ledgerApi.getLedgerStatement(ledgerId, { page: 1, limit: 1000 });
      if (!first.success || !first.data) throw new Error(first.message || "Unable to export ledger vouchers");
      const allEntries = [...(first.data.entries ?? [])] as TrialBalanceTransaction[];
      const totalPages = first.data.meta?.totalPages ?? 1;
      for (let page = 2; page <= totalPages; page += 1) {
        const response = await ledgerApi.getLedgerStatement(ledgerId, { page, limit: 1000 });
        if (!response.success || !response.data) throw new Error(response.message || "Unable to export ledger vouchers");
        allEntries.push(...((response.data.entries ?? []) as TrialBalanceTransaction[]));
      }
      const rows = allEntries.map((entry) => ({
        Date: formatDate(entry.date),
        "Voucher Number": entry.voucherNo ?? entry.transactionNo ?? entry.invoiceNo ?? "",
        "Voucher Type": entry.voucherType ?? "",
        Narration: entry.narration ?? entry.particular ?? "",
        Debit: Number(entry.debit ?? 0),
        Credit: Number(entry.credit ?? 0),
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [{ wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 80 }, { wch: 16 }, { wch: 16 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vouchers");
      const workbookBytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blobUrl = URL.createObjectURL(new Blob([workbookBytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${nameOf(selectedLedger).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "ledger"}-vouchers.xlsx`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
      addToast("Ledger vouchers exported successfully", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Unable to export ledger vouchers", "error");
    }
  }, [addToast, selectedLedger]);

  const tree = data?.tree?.length ? data.tree : (data?.rows ?? []).reduce<TrialBalanceNode[]>((groups, row) => {
    const groupId = row.groupId || row.parentGroup || "ungrouped";
    let group = groups.find((item) => item.id === `group:${groupId}`);
    if (!group) { group = { id: `group:${groupId}`, name: row.parentGroup || "Ungrouped", rowType: "accountingHeader", children: [] }; groups.push(group); }
    group.children!.push({ id: row.ledgerId || row.id || `${groupId}:${row.account}`, ledgerId: row.ledgerId, name: row.account, code: row.ledgerCode, rowType: "ledger", openingDebit: row.openingDebit, openingCredit: row.openingCredit, periodDebit: row.periodDebit ?? row.transactionDebit ?? 0, periodCredit: row.periodCredit ?? row.transactionCredit ?? 0, closingDebit: row.closingDebit, closingCredit: row.closingCredit, closingBalance: row.closingSigned ?? row.closingDebit - row.closingCredit, closingBalanceType: row.closingSigned < 0 ? "Cr" : row.closingSigned > 0 ? "Dr" : "-" });
    return groups;
  }, []);
  const hasValues = (node: TrialBalanceNode) => [node.openingDebit, node.openingCredit, node.periodDebit, node.periodCredit, node.closingBalance].some((value) => Number(value ?? 0) !== 0);
  const nameOf = (node: TrialBalanceNode) => node.name?.trim() || node.code || node.ledgerId || "Unnamed ledger";

  const renderNodes = (nodes: TrialBalanceNode[], depth = 0): React.ReactNode => nodes.map((node) => {
    const isGroup = (node.children?.length ?? 0) > 0 || (node.rowType === "accountingHeader" && !node.ledgerId);
    const isExpanded = expanded.has(node.id);
    return <React.Fragment key={node.id}><tr className={isGroup ? "bg-gray-50 font-semibold text-gray-800" : "hover:bg-green-50/60"}>
      <td className="whitespace-nowrap px-4 py-3" style={{ paddingLeft: `${16 + depth * 24}px` }}>{isGroup ? <button type="button" aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.name}`} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); return next; })} className="mr-2 inline-flex align-middle text-gray-500">{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button> : <span className="mr-2 inline-block w-4" />}{isGroup ? (node.name || "Unnamed group") : <button type="button" className="text-left text-green-700 hover:underline" onClick={() => openLedger(node)}>{nameOf(node)}</button>}</td>
      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(node.openingDebit ?? 0)}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(node.openingCredit ?? 0)}</td>{/* Transaction debit hidden temporarily */}{/* <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(node.periodDebit ?? 0)}</td> */}{/* Transaction credit hidden temporarily */}{/* <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(node.periodCredit ?? 0)}</td> */}<td className="px-4 py-3 text-right tabular-nums">{formatCurrency(node.closingDebit ?? 0)}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(node.closingCredit ?? 0)}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Math.abs(node.closingBalance ?? ((node.closingDebit ?? 0) - (node.closingCredit ?? 0))))}</td><td className="px-4 py-3 text-center">{node.closingBalanceType ?? "-"}</td>
    </tr>{isGroup && isExpanded ? renderNodes(node.children ?? [], depth + 1) : null}</React.Fragment>;
  });

  const exportDisabled = !tree.some(hasValues);
  return <div className="mx-auto w-full max-w-[1500px]"><ReportLayout title="Trial Balance" description="Database-backed period activity and closing balances by accounting group and ledger" generatedAt={data?.generatedAt} onRefresh={() => void fetchReport()} isRefreshing={loading} actions={<ReportExportButton disabled={exportDisabled} onExport={async () => reportApi.exportTrialBalanceExcel({ includeZero: false })} />} summary={data?.summary ? [{ title: "Opening debit", value: data.summary.totalOpeningDebit ?? 0, hint: "Opening position", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" }, { title: "Opening credit", value: data.summary.totalOpeningCredit ?? 0, hint: "Opening position", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" }, { title: "Closing debit", value: data.summary.totalClosingDebit, hint: "Closing position", icon: Download, iconBg: "bg-emerald-50", iconColor: "text-emerald-700" }, { title: "Closing credit", value: data.summary.totalClosingCredit, hint: "Closing position", icon: Download, iconBg: "bg-amber-50", iconColor: "text-amber-700" }] : []} isLoading={loading} isEmpty={!loading && !error && tree.length === 0} emptyMessage="No trial balance data" emptyDescription="The database-backed trial-balance endpoint returned no accounts.">
    {error && !loading ? <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button className="ml-2 underline" onClick={() => void fetchReport()}>Retry</button></div> : null}
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white"><table className="w-full min-w-[820px] text-sm"><thead className="border-b bg-slate-950 text-xs uppercase tracking-wide text-slate-300"><tr><th className="px-4 py-3 text-left">Particulars</th><th className="px-4 py-3 text-right">Opening debit</th><th className="px-4 py-3 text-right">Opening credit</th>{/* Transaction columns hidden temporarily */}{/* <th className="px-4 py-3 text-right">Transaction debit</th><th className="px-4 py-3 text-right">Transaction credit</th> */}<th className="px-4 py-3 text-right">Closing debit</th><th className="px-4 py-3 text-right">Closing credit</th><th className="px-4 py-3 text-right">Closing balance</th><th className="px-4 py-3 text-center">Dr/Cr</th></tr></thead><tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500"><Loader2 className="mr-2 inline animate-spin" size={16} />Loading trial balance…</td></tr> : renderNodes(tree)}</tbody></table></div>
    <Dialog open={!!selectedLedger} onOpenChange={(open) => { if (!open) setSelectedLedger(null); }}>
      <DialogContent className="!fixed !left-auto !right-0 !top-0 !h-screen !max-h-screen !w-[min(96vw,1400px)] !max-w-none !translate-x-0 !translate-y-0 overflow-y-auto rounded-none p-5 sm:p-7">
        <DialogHeader><DialogTitle>{selectedLedger ? nameOf(selectedLedger) : "Ledger transactions"} — vouchers</DialogTitle><DialogDescription>All voucher and journal entries connected to this ledger.</DialogDescription><div className="pt-2"><Button type="button" variant="outline" size="sm" disabled={!selectedLedger || transactionLoading || transactions.length === 0} onClick={() => void exportLedger}><Download size={15} className="mr-2" />Export vouchers</Button></div></DialogHeader>
        {selectedLedger?.code ? <div className="text-xs text-gray-500">Ledger code: {selectedLedger.code}</div> : null}
        {transactionError ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{transactionError}<button className="ml-3 underline" onClick={() => selectedLedger && void fetchTransactions(selectedLedger, transactionPage)}>Retry</button></div> : null}
        <div className="overflow-x-auto rounded-lg border border-gray-200"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-300"><tr>{["Date", "Voucher number", "Voucher type", "Narration", "Debit", "Credit"].map((heading) => <th key={heading} className={`px-4 py-3 ${heading === "Debit" || heading === "Credit" ? "text-right" : "text-left"}`}>{heading}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{transactionLoading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500"><Loader2 className="mr-2 inline animate-spin" size={16} />Loading vouchers…</td></tr> : transactions.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No connected vouchers found.</td></tr> : transactions.map((transaction, index) => <tr key={transaction.voucherId ?? `${transaction.voucherNo ?? "voucher"}-${index}`} className="hover:bg-green-50/60"><td className="whitespace-nowrap px-4 py-3">{formatDate(transaction.date)}</td><td className="px-4 py-3">{transaction.voucherNo ?? transaction.transactionNo ?? transaction.invoiceNo ?? "-"}</td><td className="px-4 py-3">{transaction.voucherType ?? "-"}</td><td className="max-w-[420px] px-4 py-3">{transaction.narration ?? transaction.particular ?? "-"}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(transaction.debit ?? 0)}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(transaction.credit ?? 0)}</td></tr>)}</tbody></table></div>
        {transactionPagination && transactionPagination.totalPages > 1 ? <div className="flex items-center justify-between text-sm text-gray-600"><span>Page {transactionPagination.page} of {transactionPagination.totalPages} · {transactionPagination.totalEntries} entries</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={transactionPage <= 1 || transactionLoading} onClick={() => selectedLedger && void fetchTransactions(selectedLedger, transactionPage - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={transactionPage >= transactionPagination.totalPages || transactionLoading} onClick={() => selectedLedger && void fetchTransactions(selectedLedger, transactionPage + 1)}>Next</Button></div></div> : null}
      </DialogContent>
    </Dialog>
  </ReportLayout></div>;
}
