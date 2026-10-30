"use client";

import * as React from "react";
import {
  ChevronRight,
  FileText,
  Receipt,
  RefreshCcw,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  ReportLayout,
  ReportExportButton,
  ReportFilters,
  ReportFilterConfig,
  ReportFilterValues,
  SummaryCardItem,
} from "@/components/reports";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { branchApi } from "@/app/services/branch.service";
import { reportApi } from "@/app/services/report.service";
import {
  GSTR1ReportResponse,
  GSTR1Row,
  GSTR1Section,
  GSTR1SummaryLine,
} from "@/app/types/report";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { ReportBranchSelect, useReportBranchSelection } from "@/components/reports/report-branch-select";

const EMPTY_SECTIONS = [
  "B2C (Large) Invoices - 5A, 5B",
  "Exports Invoices - 6A",
  "Credit or Debit Notes (Unregistered) - 9B",
  "Amended B2B Invoices - 9A",
  "Amended B2C (Large) Invoices - 9A",
  "Amended Exports Invoices - 9A",
  "Amended Credit or Debit Notes (Registered) - 9C",
  "Amended Credit or Debit Notes (Unregistered) - 9C",
  "B2C (Small) Invoices - 7",
  "Nil Rated Invoices - 8A, 8B, 8C, 8D",
  "Amendment B2C (Small) Invoices - 10",
  "Tax Liability (Advances Received) - 11A(1), 11A(2)",
  "Adjustment of Advances - 11B(1), 11B(2)",
  "Amended Tax Liability (Advances Received) - 11A",
  "Amendment of Adjusted Advances - 11B",
  "HSN Summary - 12",
  "HSN Summary - 12 (B2B - B2C Supplies)",
  "Document Summary - 13",
];

const money = (value: number | null | undefined) => {
  const amount = Number(value || 0);
  const formatted = formatCurrency(Math.abs(amount));
  return amount < 0 ? `-${formatted}` : formatted;
};
const formatInvoiceDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function SystemGSTR1ReportPage() {
  const { addToast } = useToast();
  const { branches, selectedBranch, setSelectedBranch } = useReportBranchSelection();
  const [data, setData] = React.useState<GSTR1ReportResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ReportFilterValues>({});
  const [branchIdByName, setBranchIdByName] = React.useState<Record<string, string>>({});
  const [branchReady, setBranchReady] = React.useState(false);
  const [openSection, setOpenSection] = React.useState<GSTR1Section | null>(null);
  const [expandedParty, setExpandedParty] = React.useState<string | null>(null);
  const branchId = filters.branchId || branchIdByName[selectedBranch];

  React.useEffect(() => {
    let cancelled = false;
    void branchApi.getActive().then((response) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const branch of response.data?.branches ?? []) {
        if (branch.name && branch.id) map[branch.name] = branch.id;
      }
      setBranchIdByName(map);
      setBranchReady(true);
    }).catch(() => {
      if (!cancelled) setBranchReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    reportApi.getGSTR1Report({
      branchId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    })
      .then((response) => {
        if (!response.success || !response.data) throw new Error(response.message || "Failed to load GSTR-1 report");
        setData(response.data);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load GSTR-1 report";
        setError(message);
        addToast(message, "error");
      })
      .finally(() => setIsLoading(false));
  }, [addToast, branchId, filters.startDate, filters.endDate]);

  React.useEffect(() => {
    if (!branchReady) return;
    load();
  }, [branchReady, load]);

  const filterConfig: ReportFilterConfig[] = React.useMemo(
    () => [{ type: "branch" }, { type: "dateRange" }],
    []
  );

  const summary: SummaryCardItem[] = React.useMemo(() => {
    const s = data?.summary;
    return [
      { title: "Total Invoices", value: s?.totalInvoices ?? 0, hint: "Approved sales invoices", icon: Receipt, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
      { title: "Taxable Value", value: money(s?.totalTaxableValue), hint: "Sum of invoice subtotals", icon: FileText, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
      { title: "Total GST", value: money(s?.totalGST), hint: `CGST ${money(s?.totalCGST)} · SGST ${money(s?.totalSGST)} · IGST ${money(s?.totalIGST)}`, icon: TrendingUp, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
      { title: "Total Invoice Value", value: money(s?.totalInvoiceValue), hint: `B2B ${s?.b2bInvoices ?? 0} · B2C ${s?.b2cInvoices ?? 0}`, icon: Wallet, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    ];
  }, [data]);

  const sections = data?.sections ?? [];
  const status = data?.gstrStatus;
  const grandTotal = sections.reduce((sum, section) => ({
    voucher_count: sum.voucher_count + Number(section.voucher_count || 0),
    taxable_value: sum.taxable_value + Number(section.taxable_value || 0),
    igst_rate_amount: sum.igst_rate_amount + Number(section.igst_rate_amount || 0),
    cgst_rate_amount: sum.cgst_rate_amount + Number(section.cgst_rate_amount || 0),
    sgst_rate_amount: sum.sgst_rate_amount + Number(section.sgst_rate_amount || 0),
    gst_amount: sum.gst_amount + Number(section.gst_amount || 0),
    invoice_total: sum.invoice_total + Number(section.invoice_total || 0),
  }), { voucher_count: 0, taxable_value: 0, igst_rate_amount: 0, cgst_rate_amount: 0, sgst_rate_amount: 0, gst_amount: 0, invoice_total: 0 });

  const openParties = (section: GSTR1Section) => {
    if (!section.parties?.length) return;
    setExpandedParty(null);
    setOpenSection(section);
  };

  return (
    <ReportLayout
      title="GSTR-1 Outward Supplies"
      description="Statutory report of approved sales invoices with B2B/B2C split and GST breakup"
      generatedAt={data?.generatedAt as string | undefined}
      onRefresh={load}
      isRefreshing={isLoading}
      actions={
        <ReportExportButton
          disabled={!data}
          onExport={() => reportApi.exportGSTR1Excel({
            branchId,
            startDate: filters.startDate,
            endDate: filters.endDate,
          })}
        />
      }
      summary={summary}
      toolbar={
        <ReportFilters
          config={filterConfig}
          values={filters}
          onChange={setFilters}
          onApply={load}
          onReset={() => {
            setFilters({});
            load();
          }}
        />
      }
      isLoading={isLoading}
      isEmpty={!isLoading && !data}
      emptyMessage="No GSTR-1 data"
      emptyDescription="Try a different branch or date range."
    >
      {error && !isLoading && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <span>{error}</span>
          <button className="inline-flex items-center gap-1 font-semibold underline" onClick={load}>
            <RefreshCcw size={14} /> Retry
          </button>
        </div>
      )}

      <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Company / branch</p>
            <div className="mt-2"><ReportBranchSelect branches={branches} value={selectedBranch} onChange={setSelectedBranch} light /></div>
            <p className="mt-1 font-mono text-xs text-gray-500">GSTIN: {data?.branch?.gstin ?? data?.branch?.branchGst ?? "-"}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Reporting period</p>
            <p className="mt-1 font-medium text-gray-900">{data?.period?.label ?? "-"}</p>
            <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">{status?.filingStatus ?? "Not Filed"}</span>
          </div>
        </div>
      </div>

      {status ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Total vouchers", status.totalVouchers],
            ["Included", status.includedInReturn],
            ["Ready to upload", status.readyForUpload],
            ["Needs correction", status.uncertain],
            ["Conflicts", status.conflictsWithMasters],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b px-4 py-3">
          <p className="font-semibold text-gray-900">Return summary</p>
          <p className="text-xs text-gray-500">Click B2B invoices or credit / debit notes to open the parties from those vouchers.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Section</th>
                <th className="px-4 py-3 text-right">Vouchers</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">IGST</th>
                <th className="px-4 py-3 text-right">CGST</th>
                <th className="px-4 py-3 text-right">SGST</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">Invoice value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sections.map((section) => {
                const clickable = (section.parties?.length || 0) > 0;
                return (
                  <tr
                    key={section.key}
                    className={cn(clickable && "cursor-pointer bg-sky-50/60 transition hover:bg-amber-50/70")}
                    onClick={() => openParties(section)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <span className="inline-flex items-center gap-2">
                        {section.title}
                        {clickable ? <ChevronRight className="h-4 w-4 text-slate-400" /> : null}
                      </span>
                    </td>
                    <AmountCells row={section} />
                  </tr>
                );
              })}
              {EMPTY_SECTIONS.map((title) => (
                <tr key={title} className="text-gray-400">
                  <td className="px-4 py-3">{title}</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                </tr>
              ))}
              <tr className="bg-sky-50 font-semibold text-gray-950">
                <td className="px-4 py-3">Total</td>
                <AmountCells row={grandTotal} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <PartySidebar
        section={openSection}
        expandedParty={expandedParty}
        onExpandedPartyChange={setExpandedParty}
        onClose={() => setOpenSection(null)}
      />
    </ReportLayout>
  );
}

function AmountCell({
  value,
  className,
}: {
  value?: number | null;
  className?: string;
}) {
  const amount = Number(value || 0);
  return (
    <td className={cn("px-4 py-3 text-right tabular-nums", amount < 0 && "text-rose-700", className)}>
      {money(amount)}
    </td>
  );
}

function AmountCells({ row }: { row: { voucher_count?: number; taxable_value?: number; igst_rate_amount?: number; cgst_rate_amount?: number; sgst_rate_amount?: number; gst_amount?: number; invoice_total?: number } }) {
  return (
    <>
      <td className="px-4 py-3 text-right tabular-nums">{row.voucher_count ?? 0}</td>
      <AmountCell value={row.taxable_value} />
      <AmountCell value={row.igst_rate_amount} />
      <AmountCell value={row.cgst_rate_amount} />
      <AmountCell value={row.sgst_rate_amount} />
      <AmountCell value={row.gst_amount} />
      <AmountCell value={row.invoice_total} className="font-semibold" />
    </>
  );
}

function PartySidebar({
  section,
  expandedParty,
  onExpandedPartyChange,
  onClose,
}: {
  section: GSTR1Section | null;
  expandedParty: string | null;
  onExpandedPartyChange: (value: string | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const parties = section?.parties ?? [];

  React.useEffect(() => {
    setSearch("");
  }, [section?.key]);

  const query = search.trim().toLowerCase();
  const visibleParties = React.useMemo(() => {
    if (!query) return parties;
    return parties.filter((party) => {
      const haystack = [
        party.agency_name,
        party.customer_gstin,
        ...(party.vouchers || []).map((voucher) => voucher.invoice_number),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [parties, query]);

  return (
    <Dialog open={Boolean(section)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="left-auto right-0 top-0 flex h-dvh max-h-dvh w-full max-w-8xl translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-l p-0">
        <div className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
            <DialogTitle>{section?.title}</DialogTitle>
            <DialogDescription>
              Parties from these vouchers, in the same columns as the GSTR-1 Excel export.
            </DialogDescription>
          </DialogHeader>
          <div className="shrink-0 border-b bg-white px-6 py-3">
            <Input
              icon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search party name, GSTIN, or voucher number"
              aria-label="Search parties"
            />
            <p className="mt-2 text-xs text-slate-500">
              Showing {visibleParties.length} of {parties.length} {parties.length === 1 ? "party" : "parties"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Particulars / GSTIN</th>
                  <th className="px-4 py-3 text-left">Party Name</th>
                  <th className="px-4 py-3 text-right">Vouchers</th>
                  <th className="px-4 py-3 text-right">Taxable</th>
                  <th className="px-4 py-3 text-right">IGST</th>
                  <th className="px-4 py-3 text-right">CGST</th>
                  <th className="px-4 py-3 text-right">SGST</th>
                  <th className="px-4 py-3 text-right">GST</th>
                  <th className="px-4 py-3 text-right">Invoice value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleParties.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-500">
                      {query ? `No parties match "${search.trim()}".` : "No parties in this section."}
                    </td>
                  </tr>
                ) : visibleParties.map((party) => {
                  const key = `${party.agency_id || party.agency_name}`;
                  const open = expandedParty === key;
                  return (
                    <React.Fragment key={key}>
                      <tr
                        className="cursor-pointer transition hover:bg-amber-50/60"
                        onClick={() => onExpandedPartyChange(open ? null : key)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{party.customer_gstin || "Unregistered"}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <span className="inline-flex items-center gap-2">
                            <ChevronRight className={cn("h-4 w-4 text-slate-400 transition", open && "rotate-90")} />
                            {party.agency_name}
                          </span>
                        </td>
                        <AmountCells row={party} />
                      </tr>
                      {open ? <VoucherRows vouchers={party.vouchers || []} /> : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VoucherRows({ vouchers }: { vouchers: GSTR1Row[] }) {
  if (!vouchers.length) {
    return (
      <tr>
        <td colSpan={9} className="bg-slate-50 px-6 py-3 text-xs text-slate-500">No voucher lines for this party.</td>
      </tr>
    );
  }
  return (
    <>
      {vouchers.map((voucher) => (
        <tr key={voucher.invoice_number} className="bg-slate-50/80 text-slate-600">
          <td className="px-4 py-2 pl-8 font-mono text-xs">{voucher.invoice_number}</td>
          <td className="px-4 py-2 text-xs">{formatInvoiceDate(voucher.invoice_date)}</td>
          <td className="px-4 py-2 text-right tabular-nums">1</td>
          <AmountCell value={voucher.taxable_value} className="py-2" />
          <AmountCell value={voucher.igst_rate_amount} className="py-2" />
          <AmountCell value={voucher.cgst_rate_amount} className="py-2" />
          <AmountCell value={voucher.sgst_rate_amount} className="py-2" />
          <AmountCell value={voucher.gst_amount} className="py-2" />
          <AmountCell value={voucher.invoice_total} className="py-2" />
        </tr>
      ))}
    </>
  );
}
