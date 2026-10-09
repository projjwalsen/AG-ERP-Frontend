"use client";

import * as React from "react";
import { Building2, CalendarRange, CheckCircle2, FileSpreadsheet, RefreshCcw, Scale } from "lucide-react";
import { ReportExportButton } from "./report-export-button";
import { ReportLayout } from "./report-layout";
import { useToast } from "@/components/ui/toast";
import { FinancialStatementReport } from "@/app/types/report";
import { cn, formatCurrency } from "@/lib/utils";

type StatementKind = "BALANCE_SHEET" | "PROFIT_AND_LOSS";

interface FinancialStatementReportProps {
  kind: StatementKind;
  load: () => Promise<{ success: boolean; message: string; data?: FinancialStatementReport }>;
  exportReport: () => Promise<{ blob: Blob; filename: string }>;
}

const text = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const value = (cell: unknown) => typeof cell === "number" ? cell : Number(cell ?? 0);
const isAmount = (cell: unknown) => cell !== null && cell !== undefined && cell !== "" && Number.isFinite(Number(cell));

function isTotal(row: unknown[]) {
  return /^total$/i.test(text(row[0])) || /^total$/i.test(text(row[3]));
}

function isSection(row: unknown[]) {
  return !isTotal(row) && Boolean(text(row[0]) || text(row[3])) && (row[2] != null || row[5] != null);
}

function amountFor(row: unknown[], side: "left" | "right") {
  const amount = side === "left" ? row[1] ?? row[2] : row[4] ?? row[5];
  return isAmount(amount) ? value(amount) : null;
}

export function FinancialStatementReportPage({ kind, load, exportReport }: FinancialStatementReportProps) {
  const { addToast } = useToast();
  const [data, setData] = React.useState<FinancialStatementReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await load();
      if (!response.success || !response.data) throw new Error(response.message || "Failed to load financial statement");
      setData(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load financial statement";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, load]);

  React.useEffect(() => { void fetchReport(); }, [fetchReport]);

  const rows = data?.rows ?? [];
  const bodyRows = rows.slice(9);
  const totalRow = bodyRows.find(isTotal);
  const leftTotal = totalRow ? amountFor(totalRow, "left") : null;
  const rightTotal = totalRow ? amountFor(totalRow, "right") : null;
  const title = kind === "BALANCE_SHEET" ? "Balance Sheet" : "Profit & Loss";
  const isBalanced = leftTotal !== null && rightTotal !== null && Math.abs(leftTotal - rightTotal) < 0.01;

  return <div className="mx-auto w-full max-w-[1500px]">
    <ReportLayout
      title={data?.reportName || title}
      description={data?.period || "Financial statement"}
      actions={<ReportExportButton disabled={!data || bodyRows.length === 0} onExport={exportReport} />}
      summary={[
        { title: "Left-side total", value: leftTotal === null ? "—" : formatCurrency(leftTotal), hint: kind === "BALANCE_SHEET" ? "Liabilities" : "Expenses", icon: Scale, iconBg: "bg-sky-50", iconColor: "text-sky-700" },
        { title: "Right-side total", value: rightTotal === null ? "—" : formatCurrency(rightTotal), hint: kind === "BALANCE_SHEET" ? "Assets" : "Income", icon: FileSpreadsheet, iconBg: "bg-emerald-50", iconColor: "text-emerald-700" },
        { title: "Statement rows", value: bodyRows.length, hint: "Rows from source workbook", icon: FileSpreadsheet, iconBg: "bg-amber-50", iconColor: "text-amber-700" },
        { title: "Control check", value: leftTotal !== null && rightTotal !== null ? (isBalanced ? "Balanced" : "Difference") : "Source view", hint: leftTotal !== null && rightTotal !== null ? formatCurrency(Math.abs(leftTotal - rightTotal)) : "Preserved source layout", icon: CheckCircle2, iconBg: isBalanced ? "bg-green-50" : "bg-slate-100", iconColor: isBalanced ? "text-green-700" : "text-slate-600" },
      ]}
      toolbar={<StatementContext data={data} kind={kind} />}
      isLoading={loading}
      isEmpty={!loading && !error && bodyRows.length === 0}
      emptyMessage={`No ${title.toLowerCase()} data`}
      emptyDescription="The financial-statements service returned no workbook rows."
    >
      {error && !loading && <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button className="inline-flex items-center gap-1 font-semibold underline" onClick={() => void fetchReport()}><RefreshCcw size={14} /> Retry</button></div>}
      <StatementTable rows={bodyRows} kind={kind} />
    </ReportLayout>
  </div>;
}

function StatementContext({ data, kind }: { data: FinancialStatementReport | null; kind: StatementKind }) {
  return <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm md:grid-cols-[1.5fr_1fr_1fr]"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950"><Building2 size={19} /></div><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">Financial statement</p><p className="mt-1 truncate text-base font-semibold">{data?.company || "Company"}</p><p className="mt-1 truncate text-xs text-slate-400">{data?.companyDetails.address.filter(Boolean).join(" · ") || "Company details unavailable"}</p></div></div><ContextItem icon={<CalendarRange size={15} />} label="Reporting period" value={data?.period || "Not specified"} /><ContextItem icon={<FileSpreadsheet size={15} />} label="Statement" value={kind === "BALANCE_SHEET" ? "Assets & liabilities" : "Income & expenditure"} /></div>;
}

function ContextItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="border-t border-white/10 pt-3 md:border-l md:border-t-0 md:pl-5"><div className="flex items-center gap-2 text-xs text-slate-400">{icon}{label}</div><p className="mt-1 text-sm font-medium text-slate-100">{value}</p></div>; }

function StatementTable({ rows, kind }: { rows: unknown[][]; kind: StatementKind }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-950">{kind === "BALANCE_SHEET" ? "Assets and liabilities" : "Income and expenditure"}</h2><p className="mt-0.5 text-xs text-slate-500">Source workbook layout preserved, including both accounting sides.</p></div><span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:inline">Source data</span></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-500"><tr><th className="w-[30%] px-5 py-3 text-left">{kind === "BALANCE_SHEET" ? "Liabilities" : "Expenses"}</th><th className="w-[18%] px-5 py-3 text-right">Amount</th><th className="w-[30%] px-5 py-3 text-left">{kind === "BALANCE_SHEET" ? "Assets" : "Income"}</th><th className="w-[18%] px-5 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => { const total = isTotal(row); const section = isSection(row); return <tr key={`${text(row[0])}-${text(row[3])}-${index}`} className={cn("transition", total ? "bg-amber-50 font-semibold" : section ? "bg-slate-50/80 font-semibold" : "hover:bg-amber-50/40")}><td className="px-5 py-3.5 text-slate-900">{text(row[0]) || "—"}</td><td className="px-5 py-3.5 text-right tabular-nums text-slate-700">{amountFor(row, "left") === null ? "—" : formatCurrency(amountFor(row, "left")!)}</td><td className="px-5 py-3.5 text-slate-900">{text(row[3]) || "—"}</td><td className="px-5 py-3.5 text-right tabular-nums text-slate-700">{amountFor(row, "right") === null ? "—" : formatCurrency(amountFor(row, "right")!)}</td></tr>; })}</tbody></table></div></section>;
}
