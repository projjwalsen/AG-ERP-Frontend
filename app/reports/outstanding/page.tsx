"use client";

import * as React from "react";
import { ArrowDownToLine, ArrowUpFromLine, Building2, CalendarRange, CheckCircle2, CircleDollarSign, FileSpreadsheet, List, RefreshCcw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ReportLayout } from "@/components/reports";
import { useToast } from "@/components/ui/toast";
import { reportApi } from "@/app/services/report.service";
import { OutstandingAgingRow, OutstandingBackendType, OutstandingLedgerRow, OutstandingReportResponse } from "@/app/types/report";
import { cn, formatCurrency } from "@/lib/utils";

type ReportType = "AR" | "AP";
type ViewMode = "ledger" | "aging";
const backendType = (type: ReportType): OutstandingBackendType => type === "AR" ? "RECEIVABLE" : "PAYABLE";
const isLedgerRow = (row: unknown): row is OutstandingLedgerRow => Boolean(row && typeof row === "object" && "account" in row);
const money = (value: number | null | undefined) => formatCurrency(value ?? 0);

export default function OutstandingReportPage() {
  const { addToast } = useToast();
  const [type, setType] = React.useState<ReportType>("AR");
  const [view, setView] = React.useState<ViewMode>("ledger");
  const [data, setData] = React.useState<OutstandingReportResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await reportApi.getsrv1APARReport(backendType(type));
      if (!response.success || !response.data) throw new Error(response.message || "Failed to load outstanding report");
      setData(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load outstanding report";
      setError(message); addToast(message, "error");
    } finally { setLoading(false); }
  }, [addToast, type]);

  React.useEffect(() => { void load(); }, [load]);

  const ledgerRows = React.useMemo(() => ((data?.rows ?? []) as unknown[]).filter(isLedgerRow), [data]);
  const agingRows = data?.agingRows ?? [];
  const summary = data?.summary;
  const diagnostics = data?.diagnostics;
  const isReceivable = type === "AR";
  const outstandingTotal = diagnostics?.agingOutstandingTotal as number | undefined;
  const ledgerColumns = data?.layout?.columns ?? [
    { key: "account", label: "Particulars" }, { key: "openingBalance", label: "Opening Balance" },
    { key: "transactionDebit", label: "Transaction Debit" }, { key: "transactionCredit", label: "Transaction Credit" }, { key: "closingBalance", label: "Closing Balance" },
  ];

  return <ReportLayout
    title={data?.reportName ?? (isReceivable ? "Accounts Receivable" : "Accounts Payable")}
    description={data?.branchHeading ?? data?.period?.label ?? "SRV1 AP / AR report"}
    generatedAt={data?.generatedAt} onRefresh={() => void load()} isRefreshing={loading}
    actions={<ReportExportButton disabled={!data || ledgerRows.length === 0} onExport={() => reportApi.exportsrv1APARExcel(backendType(type))} />}
    summary={[
      { title: "Ledgers", value: summary?.totalLedgers ?? ledgerRows.length, hint: "Accounts in source report", icon: List, iconBg: "bg-sky-50", iconColor: "text-sky-700" },
      { title: "Opening balance", value: money(summary?.openingBalance), hint: "Opening position", icon: CircleDollarSign, iconBg: "bg-slate-100", iconColor: "text-slate-700" },
      { title: "Debit movement", value: money(summary?.transactionDebit), hint: "Transactions in period", icon: ArrowDownToLine, iconBg: "bg-emerald-50", iconColor: "text-emerald-700" },
      { title: "Credit movement", value: money(summary?.transactionCredit), hint: "Transactions in period", icon: ArrowUpFromLine, iconBg: "bg-amber-50", iconColor: "text-amber-700" },
      { title: "Closing balance", value: money(summary?.closingBalance), hint: `${agingRows.length} parties · ${money(outstandingTotal)}`, icon: Users, iconBg: "bg-violet-50", iconColor: "text-violet-700" },
    ]}
    toolbar={<div className="space-y-4"><ReportContext data={data} /><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><div className="flex items-center gap-2"><span className="hidden pl-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:inline">View report</span><SegmentedButton active={type === "AR"} onClick={() => setType("AR")}><ArrowDownToLine size={15} /> Receivable</SegmentedButton><SegmentedButton active={type === "AP"} onClick={() => setType("AP")}><ArrowUpFromLine size={15} /> Payable</SegmentedButton></div><div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1"><ViewButton active={view === "ledger"} onClick={() => setView("ledger")}><FileSpreadsheet size={15} /> Ledger summary</ViewButton><ViewButton active={view === "aging"} onClick={() => setView("aging")}><Users size={15} /> Aging parties</ViewButton></div></div></div>}
    isLoading={loading} isEmpty={!loading && !error && (view === "ledger" ? ledgerRows.length === 0 : agingRows.length === 0)} emptyMessage="No outstanding report data" emptyDescription="The AP / AR service returned no rows for this report."
  >
    {error && !loading && <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button className="inline-flex items-center gap-1 font-semibold underline" onClick={() => void load()}><RefreshCcw size={14} /> Retry</button></div>}
    {view === "ledger" ? <LedgerTable rows={ledgerRows} columns={ledgerColumns} /> : <AgingTable rows={agingRows} isReceivable={isReceivable} />}
    {view === "aging" && <Diagnostics data={data} />}
  </ReportLayout>;
}

function ReportContext({ data }: { data: OutstandingReportResponse | null }) {
  const details = data?.companyDetails;
  return <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm md:grid-cols-[1.5fr_1fr_1fr]"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950"><Building2 size={19} /></div><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">Report context</p><p className="mt-1 truncate text-base font-semibold">{data?.company ?? "Company"}</p><p className="mt-1 truncate text-xs text-slate-400">{details?.addressLines?.filter(Boolean).join(" · ") || data?.group || "Sundry accounts"}</p></div></div><ContextItem icon={<CalendarRange size={15} />} label="Reporting period" value={data?.period?.label || "Not specified"} /><ContextItem icon={<FileSpreadsheet size={15} />} label="Source group" value={data?.group || "AP / AR"} /></div>;
}

function ContextItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="border-t border-white/10 pt-3 md:border-l md:border-t-0 md:pl-5"><div className="flex items-center gap-2 text-xs text-slate-400">{icon}{label}</div><p className="mt-1 text-sm font-medium text-slate-100">{value}</p></div>; }
function SegmentedButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={cn("inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition", active ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>{children}</button>; }
function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={cn("inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition", active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900")}>{children}</button>; }

function LedgerTable({ rows, columns }: { rows: OutstandingLedgerRow[]; columns: Array<{ key: string; label: string; section?: string }> }) {
  return <TableShell title="Ledger balances" subtitle="Balances and movements returned by the AP / AR service."><table className="w-full min-w-[860px] text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-500"><tr>{columns.map(column => <th key={column.key} className={cn("px-5 py-3 text-left font-semibold", column.key !== "account" && "text-right")}>{column.section && <span className="mr-1 text-slate-400">{column.section} /</span>}{column.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.account} className="transition hover:bg-amber-50/40">{columns.map(column => { const value = row[column.key as keyof OutstandingLedgerRow]; return <td key={column.key} className={cn("px-5 py-3.5", column.key !== "account" && "text-right tabular-nums", column.key === "account" && "font-medium text-slate-900", column.key === "closingBalance" && "font-semibold text-slate-950")}>{column.key === "account" ? value : money(value as number | null)}</td>; })}</tr>)}</tbody></table></TableShell>;
}

function AgingTable({ rows, isReceivable }: { rows: OutstandingAgingRow[]; isReceivable: boolean }) {
  return <TableShell title={isReceivable ? "Receivable parties" : "Payable parties"} subtitle="Parties grouped from the pending bill source, with the oldest bill age shown."><table className="w-full min-w-[980px] text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-3 text-left">Code</th><th className="px-5 py-3 text-left">{isReceivable ? "Customer" : "Vendor"}</th><th className="px-5 py-3 text-left">Branch</th><th className="px-5 py-3 text-left">GSTIN</th><th className="px-5 py-3 text-right">Outstanding</th><th className="px-5 py-3 text-center">Balance</th><th className="px-5 py-3 text-right">Oldest age</th><th className="px-5 py-3 text-right">Bills</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={`${row.partyCode}-${row.agencyName}`} className="transition hover:bg-amber-50/40"><td className="px-5 py-3.5 font-mono text-xs text-slate-500">{row.partyCode}</td><td className="px-5 py-3.5 font-medium text-slate-900">{row.agencyName}</td><td className="px-5 py-3.5 text-slate-600">{row.branch || "—"}</td><td className="px-5 py-3.5 font-mono text-xs text-slate-500">{row.gstin || "—"}</td><td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-950">{money(row.outstandingAmount)}</td><td className="px-5 py-3.5 text-center"><Badge variant="secondary">{row.balanceType}</Badge></td><td className="px-5 py-3.5 text-right tabular-nums text-slate-700">{row.agingDays}d</td><td className="px-5 py-3.5 text-right tabular-nums text-slate-700">{row.billCount}</td></tr>)}</tbody></table></TableShell>;
}

function TableShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-950">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{subtitle}</p></div><span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:inline">Service data</span></div><div className="overflow-x-auto">{children}</div></section>; }
function Diagnostics({ data }: { data: OutstandingReportResponse | null }) { const diagnostics = data?.diagnostics; if (!diagnostics) return null; const matched = diagnostics.transactionTotalsMatchSource === true; return <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600"><CheckCircle2 size={15} className={matched ? "text-emerald-600" : "text-slate-400"} /><span>{matched ? "Transaction totals reconcile with the source report." : "Source reconciliation is not available."}</span><span className="ml-auto text-slate-400">{String(diagnostics.pendingBillRows ?? 0)} pending bills · {String(diagnostics.agingParties ?? 0)} parties</span></div>; }
