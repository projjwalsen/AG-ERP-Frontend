"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FilePlus2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataSelect, type DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  createDebitCreditNote,
  fetchDebitCreditNoteInvoices,
} from "@/app/store/debitCreditNotesSlice";
import { agencyApi } from "@/app/services/agency.service";
import { branchApi } from "@/app/services/branch.service";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import type { Agency } from "@/app/types/agency";
import type { Branch } from "@/app/types/branch";
import type {
  DebitCreditNoteSelectableInvoice,
  DebitCreditNoteSourceType,
  DebitCreditNoteType,
} from "@/app/types/debitCreditNote";

type GstMode = "CGST_SGST" | "IGST";

function validSourceType(value: string | null): DebitCreditNoteSourceType {
  return value === "SALE" ? "SALE" : "PURCHASE";
}

function noteTypeFromParam(value: string | null): DebitCreditNoteType {
  return value === "CREDIT" || value === "CREDIT_NOTE" ? "CREDIT_NOTE" : "DEBIT_NOTE";
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function dateInputToIso(value: string) {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function computeGstAmounts(taxableAmount: number, gstPercent: number, gstMode: GstMode) {
  const tax = roundMoney((Number(taxableAmount) || 0) * (Number(gstPercent) || 0) / 100);
  if (gstMode === "IGST") {
    return { cgstAmount: 0, sgstAmount: 0, igstAmount: tax };
  }
  const half = roundMoney(tax / 2);
  return {
    cgstAmount: half,
    sgstAmount: roundMoney(tax - half),
    igstAmount: 0,
  };
}

export default function NewDebitCreditNotePage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <NewDebitCreditNoteContent />
    </React.Suspense>
  );
}

function NewDebitCreditNoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { invoices, invoicesLoading, createLoading } = useAppSelector((state) => state.debitCreditNotes);

  const [sourceType, setSourceType] = React.useState<DebitCreditNoteSourceType>(
    validSourceType(searchParams?.get("sourceType"))
  );
  const noteType = noteTypeFromParam(searchParams?.get("noteType"));
  const [agencyId, setAgencyId] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [invoiceId, setInvoiceId] = React.useState("");
  const [invoiceSearch, setInvoiceSearch] = React.useState("");
  const [noteDate, setNoteDate] = React.useState(todayInputValue());
  const [narration, setNarration] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [taxableAmount, setTaxableAmount] = React.useState(0);
  const [gstPercent, setGstPercent] = React.useState(18);
  const [gstMode, setGstMode] = React.useState<GstMode>("CGST_SGST");
  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);

  const selectedInvoice = React.useMemo(
    () => invoices.find((invoice) => invoice.id === invoiceId) || null,
    [invoices, invoiceId]
  );

  const gstAmounts = React.useMemo(
    () => computeGstAmounts(taxableAmount, gstPercent, gstMode),
    [taxableAmount, gstPercent, gstMode]
  );

  const totalAmount = React.useMemo(
    () => roundMoney(taxableAmount + gstAmounts.cgstAmount + gstAmounts.sgstAmount + gstAmounts.igstAmount),
    [taxableAmount, gstAmounts]
  );

  async function fetchFilterOptions() {
    try {
      const [branchesRes, agenciesRes] = await Promise.all([
        branchApi.getAll({ limit: 1000 }),
        agencyApi.getAll({ limit: 1000 }),
      ]);

      if (branchesRes.success && branchesRes.data) {
        setBranches(branchesRes.data.branches || []);
      }
      if (agenciesRes.success && agenciesRes.data) {
        const allowedTypes = sourceType === "SALE" ? ["CLIENT", "BOTH"] : ["VENDOR", "BOTH"];
        setAgencies((agenciesRes.data.agencies || []).filter((agency) => allowedTypes.includes(agency.type)));
      }
    } catch (err) {
      console.error("Failed to fetch debit/credit note options", err);
    }
  }

  async function fetchInvoices() {
    try {
      await dispatch(
        fetchDebitCreditNoteInvoices({
          sourceType,
          agencyId: agencyId || undefined,
          branchId: branchId || undefined,
          search: invoiceSearch || undefined,
        })
      ).unwrap();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to fetch invoices", "error");
    }
  }

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType]);

  React.useEffect(() => {
    void fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, agencyId, branchId, invoiceSearch]);

  const invoiceOptions = invoices.map<DataSelectOption>((invoice) => ({
    value: invoice.id,
    label: invoice.invoiceNo,
    description: [invoice.agency?.name, invoice.branch?.name, formatCurrency(Number(invoice.grandTotal || 0))]
      .filter(Boolean)
      .join(" - "),
    badge: invoice.status,
  }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedInvoice) {
      addToast("Please select an invoice", "error");
      return;
    }

    if (!selectedInvoice.agency?.id || !selectedInvoice.branch?.id) {
      addToast("Selected invoice does not include agency or branch details", "error");
      return;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      addToast("Please enter a description", "error");
      return;
    }

    if (taxableAmount <= 0) {
      addToast("Taxable amount must be greater than zero", "error");
      return;
    }

    if (gstPercent < 0) {
      addToast("GST percent cannot be negative", "error");
      return;
    }

    try {
      await dispatch(
        createDebitCreditNote({
          type: noteType,
          sourceType,
          agencyId: selectedInvoice.agency.id,
          branchId: selectedInvoice.branch.id,
          saleId: sourceType === "SALE" ? selectedInvoice.id : undefined,
          purchaseId: sourceType === "PURCHASE" ? selectedInvoice.id : undefined,
          noteDate: dateInputToIso(noteDate),
          narration: narration.trim() || undefined,
          gstPercent: Number(gstPercent) || 0,
          taxableAmount: roundMoney(taxableAmount),
          cgstAmount: gstAmounts.cgstAmount,
          sgstAmount: gstAmounts.sgstAmount,
          igstAmount: gstAmounts.igstAmount,
          particulars: [{ description: trimmedDescription }],
        })
      ).unwrap();

      addToast("Debit/Credit note created successfully", "success");
      router.push(`/debit-credit-notes?sourceType=${sourceType}${sourceType === "SALE" ? "&tab=sale" : ""}`);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to create debit/credit note", "error");
    }
  };

  const sourceLabel = sourceType === "SALE" ? "Sale" : "Purchase";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4 gap-2"
          onClick={() => router.push(`/debit-credit-notes?sourceType=${sourceType}${sourceType === "SALE" ? "&tab=sale" : ""}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Debit / Credit Notes
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create {sourceLabel} Debit / Credit Note</h1>
        <p className="mt-1 text-sm text-gray-500">Choose an approved {sourceLabel.toLowerCase()} invoice and create a pending adjustment note</p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-blue-600" />
            Note Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sourceType">Source Type *</Label>
                <DataSelect
                  id="sourceType"
                  value={sourceType}
                  onChange={(value) => {
                    setSourceType(validSourceType(value));
                    setAgencyId("");
                    setBranchId("");
                    setInvoiceId("");
                  }}
                  required
                  options={[
                    { value: "PURCHASE", label: "Purchase" },
                    { value: "SALE", label: "Sale" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noteType">Note Type *</Label>
                <Input
                  id="noteType"
                  value={noteType === "DEBIT_NOTE" ? "Debit Note" : "Credit Note"}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch Filter</Label>
                <DataSelect
                  id="branch"
                  value={branchId}
                  onChange={(value) => {
                    setBranchId(value);
                    setInvoiceId("");
                  }}
                  placeholder="All Branches"
                  searchable
                  clearable
                  panelClassName="w-[420px]"
                  options={branches.map((branch) => ({
                    value: branch.id,
                    label: branch.name,
                    description: [branch.code, branch.city, branch.state].filter(Boolean).join(" - "),
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency">{sourceType === "SALE" ? "Client" : "Vendor"} Filter</Label>
                <DataSelect
                  id="agency"
                  value={agencyId}
                  onChange={(value) => {
                    setAgencyId(value);
                    setInvoiceId("");
                  }}
                  placeholder="All Agencies"
                  searchable
                  clearable
                  panelClassName="w-[460px]"
                  options={agencies.map((agency) => ({
                    value: agency.id,
                    label: agency.name,
                    description: [agency.gstin, agency.city, agency.state].filter(Boolean).join(" - "),
                    badge: agency.type,
                  }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="invoice">Invoice *</Label>
                <DataSelect
                  id="invoice"
                  value={invoiceId}
                  onChange={(value) => {
                    setInvoiceId(value);
                    const invoice = invoices.find((item) => item.id === value);
                    if (invoice?.narration && !narration) {
                      setNarration(invoice.narration);
                    }
                  }}
                  placeholder={invoicesLoading ? "Loading invoices..." : "Select Invoice"}
                  required
                  searchable
                  clearable
                  disabled={invoicesLoading}
                  panelClassName="w-[640px]"
                  options={invoiceOptions}
                />
                <Input
                  value={invoiceSearch}
                  onChange={(event) => {
                    setInvoiceSearch(event.target.value);
                    setInvoiceId("");
                  }}
                  placeholder="Search invoice number or agency"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noteDate">Note Date</Label>
                <Input id="noteDate" type="date" value={noteDate} onChange={(event) => setNoteDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="narration">Narration</Label>
                <Input
                  id="narration"
                  value={narration}
                  onChange={(event) => setNarration(event.target.value)}
                  placeholder="Damaged goods adjustment"
                />
              </div>
            </div>

            {selectedInvoice && <SelectedInvoicePanel invoice={selectedInvoice} />}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Particular</h3>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Damaged Goods"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Tax Details</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxableAmount">Taxable Amount *</Label>
                  <Input
                    id="taxableAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={taxableAmount || ""}
                    onChange={(event) => setTaxableAmount(Number(event.target.value) || 0)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstPercent">GST %</Label>
                  <Input
                    id="gstPercent"
                    type="number"
                    min="0"
                    step="0.01"
                    value={gstPercent}
                    onChange={(event) => setGstPercent(Number(event.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>GST Type *</Label>
                  <div className="inline-flex h-10 items-center rounded-md bg-gray-100 p-0.5 text-gray-600">
                    <button
                      type="button"
                      onClick={() => setGstMode("CGST_SGST")}
                      className={cn(
                        "h-9 rounded px-4 text-sm font-medium",
                        gstMode === "CGST_SGST" ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-900"
                      )}
                    >
                      CGST + SGST
                    </button>
                    <button
                      type="button"
                      onClick={() => setGstMode("IGST")}
                      className={cn(
                        "h-9 rounded px-4 text-sm font-medium",
                        gstMode === "IGST" ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-900"
                      )}
                    >
                      IGST
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3 lg:grid-cols-6">
                <div>
                  <p className="text-gray-600">Source</p>
                  <p className="text-lg font-semibold text-gray-900">{sourceLabel}</p>
                </div>
                <div>
                  <p className="text-gray-600">Note Type</p>
                  <p className="text-lg font-semibold text-blue-600">{noteType === "DEBIT_NOTE" ? "Debit Note" : "Credit Note"}</p>
                </div>
                <div>
                  <p className="text-gray-600">CGST</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(gstAmounts.cgstAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-600">SGST</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(gstAmounts.sgstAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-600">IGST</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(gstAmounts.igstAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Amount</p>
                  <p className="text-lg font-semibold text-green-700">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.push(`/debit-credit-notes?sourceType=${sourceType}${sourceType === "SALE" ? "&tab=sale" : ""}`)}>
                Cancel
              </Button>
              <Button type="submit" loading={createLoading}>
                Create Note
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ToastContainer />
    </div>
  );
}

function SelectedInvoicePanel({ invoice }: { invoice: DebitCreditNoteSelectableInvoice }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800">
        <Receipt className="h-4 w-4" />
        Selected Invoice
      </div>
      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
        <div>
          <p className="text-gray-600">Invoice No</p>
          <p className="font-semibold text-gray-900">{invoice.invoiceNo}</p>
        </div>
        <div>
          <p className="text-gray-600">Invoice Date</p>
          <p className="font-semibold text-gray-900">{invoice.invoiceDate ? formatDateTime(invoice.invoiceDate) : "-"}</p>
        </div>
        <div>
          <p className="text-gray-600">Grand Total</p>
          <p className="font-semibold text-gray-900">{formatCurrency(Number(invoice.grandTotal || 0))}</p>
        </div>
        <div>
          <p className="text-gray-600">Status</p>
          <p className="font-semibold text-gray-900">{invoice.status || "-"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-gray-600">Agency</p>
          <p className="font-semibold text-gray-900">{invoice.agency?.name || "-"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-gray-600">Branch</p>
          <p className="font-semibold text-gray-900">{invoice.branch?.name || "-"}</p>
        </div>
         <div className="md:col-span-4">
          <p className="text-gray-600">Narration</p>
          <p className="font-semibold text-gray-900">{invoice.narration || "-"}</p>
        </div>
      </div>
    </div>
  );
}
