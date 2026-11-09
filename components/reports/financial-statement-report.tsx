"use client";

import * as React from "react";
import { Building2, CalendarRange, CheckCircle2, ChevronDown, ChevronRight, FileSpreadsheet, RefreshCcw, Scale } from "lucide-react";
import { ReportExportButton } from "./report-export-button";
import { ReportLayout } from "./report-layout";
import { ReportFilters, type ReportFilterValues } from "./report-filters";
import { useToast } from "@/components/ui/toast";
import { FinancialStatementReport } from "@/app/types/report";
import { cn, formatCurrency } from "@/lib/utils";
import { ReportBranchSelect, useReportBranchSelection } from "./report-branch-select";

type StatementKind = "BALANCE_SHEET" | "PROFIT_AND_LOSS";
type StatementSide = "left" | "right";

export const FY_START_DATE = "2025-04-01";
export const FY_END_DATE = "2026-03-31";

interface StatementDateParams {
  startDate: string;
  endDate: string;
}

interface FinancialStatementReportProps {
  kind: StatementKind;
  load: (params: StatementDateParams) => Promise<{ success: boolean; message: string; data?: FinancialStatementReport }>;
  exportReport: (params: StatementDateParams) => Promise<{ blob: Blob; filename: string }>;
  /** Collapse main heads by default; click a head to show/hide its child rows. */
  collapsible?: boolean;
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

export function FinancialStatementReportPage({ kind, load, exportReport, collapsible = false }: FinancialStatementReportProps) {
  const { addToast } = useToast();
  const { branches, selectedBranch, setSelectedBranch } = useReportBranchSelection();
  const [data, setData] = React.useState<FinancialStatementReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ReportFilterValues>({
    startDate: FY_START_DATE,
    endDate: FY_END_DATE,
  });
  const [appliedDates, setAppliedDates] = React.useState<StatementDateParams>({
    startDate: FY_START_DATE,
    endDate: FY_END_DATE,
  });

  const clampDate = React.useCallback((value: string, fallback: string) => {
    if (!value) return fallback;
    if (value < FY_START_DATE) return FY_START_DATE;
    if (value > FY_END_DATE) return FY_END_DATE;
    return value;
  }, []);

  const fetchReport = React.useCallback(async (dates: StatementDateParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await load(dates);
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

  React.useEffect(() => { void fetchReport(appliedDates); }, [fetchReport, appliedDates]);

  const applyDates = () => {
    const startDate = clampDate(filters.startDate || FY_START_DATE, FY_START_DATE);
    let endDate = clampDate(filters.endDate || FY_END_DATE, FY_END_DATE);
    if (endDate < startDate) endDate = startDate;
    const next = { startDate, endDate };
    setFilters(next);
    setAppliedDates(next);
  };

  const resetDates = () => {
    const next = { startDate: FY_START_DATE, endDate: FY_END_DATE };
    setFilters(next);
    setAppliedDates(next);
  };

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
      actions={<ReportExportButton disabled={!data || bodyRows.length === 0} onExport={() => exportReport(appliedDates)} />}
      summary={[
        { title: "Left-side total", value: leftTotal === null ? "" : formatCurrency(leftTotal), hint: kind === "BALANCE_SHEET" ? "Liabilities" : "Expenses", icon: Scale, iconBg: "bg-sky-50", iconColor: "text-sky-700" },
        { title: "Right-side total", value: rightTotal === null ? "" : formatCurrency(rightTotal), hint: kind === "BALANCE_SHEET" ? "Assets" : "Income", icon: FileSpreadsheet, iconBg: "bg-emerald-50", iconColor: "text-emerald-700" },
        { title: "Statement rows", value: bodyRows.length, hint: "Rows from source workbook", icon: FileSpreadsheet, iconBg: "bg-amber-50", iconColor: "text-amber-700" },
        { title: "Control check", value: leftTotal !== null && rightTotal !== null ? (isBalanced ? "Balanced" : "Difference") : "Source view", hint: leftTotal !== null && rightTotal !== null ? formatCurrency(Math.abs(leftTotal - rightTotal)) : "Preserved source layout", icon: CheckCircle2, iconBg: isBalanced ? "bg-green-50" : "bg-slate-100", iconColor: isBalanced ? "text-green-700" : "text-slate-600" },
      ]}
      toolbar={
        <div className="space-y-3">
          <StatementContext data={data} kind={kind} branches={branches} selectedBranch={selectedBranch} onBranchChange={setSelectedBranch} />
          <ReportFilters
            config={[{ type: "dateRange", minDate: FY_START_DATE, maxDate: FY_END_DATE }]}
            values={filters}
            onChange={setFilters}
            onApply={applyDates}
            onReset={resetDates}
          />
        </div>
      }
      isLoading={loading}
      isEmpty={!loading && !error && bodyRows.length === 0}
      emptyMessage={`No ${title.toLowerCase()} data`}
      emptyDescription="The financial-statements service returned no workbook rows."
    >
      {error && !loading && <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button className="inline-flex items-center gap-1 font-semibold underline" onClick={() => void fetchReport(appliedDates)}><RefreshCcw size={14} /> Retry</button></div>}
      <StatementTable rows={bodyRows} kind={kind} collapsible={collapsible} />
    </ReportLayout>
  </div>;
}

function StatementContext({ data, kind, branches, selectedBranch, onBranchChange }: { data: FinancialStatementReport | null; kind: StatementKind; branches: string[]; selectedBranch: string; onBranchChange: (value: string) => void }) {
  return <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm md:grid-cols-[1.5fr_1fr_1fr]"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950"><Building2 size={19} /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">Company / branch</p><div className="mt-2"><ReportBranchSelect branches={branches} value={selectedBranch} onChange={onBranchChange} /></div><p className="mt-2 truncate text-xs text-slate-400">{data?.companyDetails.address.filter(Boolean).join(" · ") || "Company details unavailable"}</p></div></div><ContextItem icon={<CalendarRange size={15} />} label="Reporting period" value={data?.period || "Not specified"} /><ContextItem icon={<FileSpreadsheet size={15} />} label="Statement" value={kind === "BALANCE_SHEET" ? "Assets & liabilities" : "Income & expenditure"} /></div>;
}

function ContextItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="border-t border-white/10 pt-3 md:border-l md:border-t-0 md:pl-5"><div className="flex items-center gap-2 text-xs text-slate-400">{icon}{label}</div><p className="mt-1 text-sm font-medium text-slate-100">{value}</p></div>; }

function sideName(row: unknown[], side: StatementSide) {
  return text(side === "left" ? row[0] : row[3]);
}

function isSideSectionHead(row: unknown[], side: StatementSide) {
  if (isTotal(row) || !sideName(row, side)) return false;
  return side === "left" ? row[2] != null : row[5] != null;
}

function isSideDetail(row: unknown[], side: StatementSide) {
  if (isTotal(row) || !sideName(row, side)) return false;
  return side === "left" ? row[2] == null : row[5] == null;
}

/** Map each side's detail rows back to the section-head row index that owns them. */
function buildSectionChildren(rows: unknown[][]) {
  const leftParent = new Map<number, number>();
  const rightParent = new Map<number, number>();
  const leftChildCount = new Map<number, number>();
  const rightChildCount = new Map<number, number>();
  let leftHead: number | null = null;
  let rightHead: number | null = null;

  rows.forEach((row, index) => {
    if (isTotal(row)) {
      leftHead = null;
      rightHead = null;
      return;
    }

    if (isSideSectionHead(row, "left")) {
      leftHead = index;
      leftChildCount.set(index, 0);
    } else if (isSideDetail(row, "left") && leftHead !== null) {
      leftParent.set(index, leftHead);
      leftChildCount.set(leftHead, (leftChildCount.get(leftHead) ?? 0) + 1);
    } else if (sideName(row, "left")) {
      leftHead = null;
    }

    if (isSideSectionHead(row, "right")) {
      rightHead = index;
      rightChildCount.set(index, 0);
    } else if (isSideDetail(row, "right") && rightHead !== null) {
      rightParent.set(index, rightHead);
      rightChildCount.set(rightHead, (rightChildCount.get(rightHead) ?? 0) + 1);
    } else if (sideName(row, "right")) {
      rightHead = null;
    }
  });

  return { leftParent, rightParent, leftChildCount, rightChildCount };
}

function sectionKey(side: StatementSide, headIndex: number) {
  return `${side}:${headIndex}`;
}

function StatementTable({ rows, kind, collapsible = false }: { rows: unknown[][]; kind: StatementKind; collapsible?: boolean }) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const groups = React.useMemo(() => buildSectionChildren(rows), [rows]);

  React.useEffect(() => {
    setExpanded(new Set());
  }, [rows]);

  const toggle = (side: StatementSide, headIndex: number) => {
    const key = sectionKey(side, headIndex);
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderLabel = (
    row: unknown[],
    index: number,
    side: StatementSide,
    label: string
  ) => {
    if (!collapsible || !label) return label || "";

    const childCount = side === "left" ? groups.leftChildCount.get(index) : groups.rightChildCount.get(index);
    const isHead = isSideSectionHead(row, side) && (childCount ?? 0) > 0;
    if (!isHead) return label;

    const open = expanded.has(sectionKey(side, index));
    return (
      <button
        type="button"
        onClick={() => toggle(side, index)}
        className="inline-flex max-w-full items-center gap-1.5 text-left hover:text-amber-700"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={15} className="shrink-0 text-slate-400" /> : <ChevronRight size={15} className="shrink-0 text-slate-400" />}
        <span className="truncate">{label}</span>
      </button>
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            {kind === "BALANCE_SHEET" ? "Assets and liabilities" : "Income and expenditure"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {collapsible
              ? "Click a main head to expand or collapse its line items."
              : "Source workbook layout preserved, including both accounting sides."}
          </p>
        </div>
        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:inline">
          {collapsible ? "Collapsible" : "Source data"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="w-[30%] px-5 py-3 text-left">{kind === "BALANCE_SHEET" ? "Liabilities" : "Expenses"}</th>
              <th className="w-[18%] px-5 py-3 text-right">Amount</th>
              <th className="w-[30%] px-5 py-3 text-left">{kind === "BALANCE_SHEET" ? "Assets" : "Income"}</th>
              <th className="w-[18%] px-5 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => {
              const total = isTotal(row);
              const section = isSection(row);

              const leftParent = groups.leftParent.get(index);
              const rightParent = groups.rightParent.get(index);
              const hideLeft = collapsible && leftParent !== undefined && !expanded.has(sectionKey("left", leftParent));
              const hideRight = collapsible && rightParent !== undefined && !expanded.has(sectionKey("right", rightParent));

              if (collapsible && hideLeft && hideRight) return null;

              const leftLabel = hideLeft ? "" : sideName(row, "left");
              const rightLabel = hideRight ? "" : sideName(row, "right");
              const leftAmount = hideLeft ? null : amountFor(row, "left");
              const rightAmount = hideRight ? null : amountFor(row, "right");
              const showLeft = !hideLeft && (leftLabel || leftAmount !== null);
              const showRight = !hideRight && (rightLabel || rightAmount !== null);

              if (collapsible && !total && !showLeft && !showRight) return null;

              return (
                <tr
                  key={`${text(row[0])}-${text(row[3])}-${index}`}
                  className={cn(
                    "transition",
                    total ? "bg-amber-50 font-semibold" : section ? "bg-slate-50/80 font-semibold" : "hover:bg-amber-50/40"
                  )}
                >
                  <td className="px-5 py-3.5 text-slate-900">{showLeft ? renderLabel(row, index, "left", leftLabel) : ""}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                    {leftAmount === null ? "" : formatCurrency(leftAmount)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-900">{showRight ? renderLabel(row, index, "right", rightLabel) : ""}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                    {rightAmount === null ? "" : formatCurrency(rightAmount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
