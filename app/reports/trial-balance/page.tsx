"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react";
import { ReportLayout } from "@/components/reports";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { reportApi } from "@/app/services/report.service";
import { branchApi } from "@/app/services/branch.service";
import { Branch } from "@/app/types/branch";
import { TrialBalanceNode, TrialBalanceResponse } from "@/app/types/report";
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
  const { addToast } = useToast();
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [data, setData] = React.useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());

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
      const res = await reportApi.getsrv1TrialBalanceReport();
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
  }, [addToast]);

  React.useEffect(() => { void fetchReport(); }, [fetchReport]);

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
      openingDebit: row.openingDebit,
      openingCredit: row.openingCredit,
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
  const hasValues = (node: TrialBalanceNode) => [node.openingDebit, node.openingCredit, node.closingDebit, node.closingCredit, node.closingBalance].some((v) => Number(v ?? 0) !== 0);
  const ledgerName = (node: TrialBalanceNode) => node.name?.trim() || (node as any).ledgerName || (node as any).ledger?.name || (node as any).account || node.code || node.ledgerId || node.id.replace(/^ledger:/, "") || "Unnamed ledger";

  const renderNodes = (nodes: TrialBalanceNode[], depth = 0): React.ReactNode => nodes.map((node) => {
    const isGroup = (node.children?.length ?? 0) > 0 || (node.rowType === "accountingHeader" && !node.ledgerId);
    const children = node.children ?? [];
    const isExpanded = expanded.has(node.id);
    return <React.Fragment key={node.id}>
      <tr className={isGroup ? "bg-gray-50 font-semibold text-gray-800" : "hover:bg-green-50/60"}>
        <td className="px-4 py-3 whitespace-nowrap" style={{ paddingLeft: `${16 + depth * 24}px` }}>
          {isGroup ? <button type="button" aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.name}`} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); return next; })} className="mr-2 inline-flex align-middle text-gray-500 hover:text-gray-900">{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button> : <span className="mr-2 inline-block w-4" />}
          {isGroup ? (node.name?.trim() || "Unnamed group") : <span className="text-slate-800">{ledgerName(node)}</span>}
          {!isGroup && node.code ? <span className="ml-2 font-mono text-xs text-gray-400">{node.code}</span> : null}
          {!isGroup && (node.branch || node.branchId) ? <span className="ml-2 text-xs text-gray-400">{displayName(node.branch) !== "-" ? displayName(node.branch) : branches.find((branch) => branch.id === node.branchId)?.name ?? ""}</span> : null}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(node.openingDebit ?? 0)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(node.openingCredit ?? 0)}</td>
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
      actions={<ReportExportButton disabled={exportDisabled} onExport={async () => reportApi.exportsrv1TrialBalanceExcel()} />}
      summary={data?.summary ? [
        { title: "Opening debit", value: data.summary.totalOpeningDebit ?? 0, hint: "Opening position", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
        { title: "Opening credit", value: data.summary.totalOpeningCredit ?? 0, hint: "Opening position", icon: Download, iconBg: "bg-gray-100", iconColor: "text-gray-600" },
        { title: "Closing debit", value: data.summary.totalClosingDebit, hint: "Closing position", icon: Download, iconBg: "bg-emerald-50", iconColor: "text-emerald-700" },
        { title: "Closing credit", value: data.summary.totalClosingCredit, hint: "Closing position", icon: Download, iconBg: "bg-amber-50", iconColor: "text-amber-700" },
      ] : []}
      toolbar={<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"><span className="font-medium text-slate-800">{data?.branch?.name ?? "SRV1 company"}</span><span className="text-slate-500">{data?.period?.label ?? "Selected source period"}</span><span className={data?.summary?.isClosingBalanced ? "text-emerald-700" : "text-rose-700"}>{data?.summary?.isClosingBalanced ? "Closing balances" : "Closing difference"}: {formatCurrency(data?.summary?.closingDifference ?? 0)}</span></div>} isLoading={loading} isEmpty={!loading && !error && tree.length === 0} emptyMessage="No trial balance data" emptyDescription="The SRV1 trial-balance source returned no accounts.">
      {error && !loading ? <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button className="ml-2 underline" onClick={() => void fetchReport()}>Retry</button></div> : null}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b bg-slate-950 text-xs uppercase tracking-wide text-slate-300"><tr><th className="px-4 py-3 text-left">Particulars</th><th className="px-4 py-3 text-right">Opening debit</th><th className="px-4 py-3 text-right">Opening credit</th><th className="px-4 py-3 text-right">Transaction debit</th><th className="px-4 py-3 text-right">Transaction credit</th><th className="px-4 py-3 text-right">Closing balance</th><th className="px-4 py-3 text-center">Dr/Cr</th></tr></thead>
          <tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500"><Loader2 className="mr-2 inline animate-spin" size={16} />Loading trial balance…</td></tr> : renderNodes(tree)}</tbody>
        </table>
      </div>

    </ReportLayout>
  </div>;
}
