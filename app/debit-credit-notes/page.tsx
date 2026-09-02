"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, FilePlus2, Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataSelect, type DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  DebitCreditNoteDetailsDialog,
  DebitCreditNotePdfDialog,
  DebitCreditNoteTable,
} from "@/app/debit-credit-notes/components/debit-credit-note-table";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchAllDebitCreditNotes,
  fetchDebitCreditNoteInvoices,
} from "@/app/store/debitCreditNotesSlice";
import { agencyApi } from "@/app/services/agency.service";
import { branchApi } from "@/app/services/branch.service";
import { debitCreditNoteApi } from "@/app/services/debitCreditNote.service";
import { downloadBlob } from "@/lib/download";
import { hasModulePermission } from "@/lib/usePermissions";
import type { Agency } from "@/app/types/agency";
import type { Branch } from "@/app/types/branch";
import {
  DebitCreditNote,
  DebitCreditNoteSourceType,
  DebitCreditNoteStatus,
  DebitCreditNoteType,
} from "@/app/types/debitCreditNote";

type DebitCreditNotesTab = "debit" | "credit";

export default function DebitCreditNotesPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <DebitCreditNotesContent />
    </React.Suspense>
  );
}

function DebitCreditNotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { notes, invoices, isLoading, invoicesLoading, pagination } = useAppSelector((state) => state.debitCreditNotes);
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);

  const canView = hasModulePermission(userPermissions, "SALE", "VIEW");
  const canWrite = hasModulePermission(userPermissions, "SALE", "WRITE");
  const canApprove = hasModulePermission(userPermissions, "SALE", "APPROVE");

  const initialSourceType = searchParams?.get("sourceType");
  const initialNoteType = searchParams?.get("type");
  const tabFromUrl = searchParams?.get("tab");
  const activeTab: DebitCreditNotesTab =
    tabFromUrl === "credit" ||
    tabFromUrl === "sale" ||
    tabFromUrl === "sales" ||
    initialNoteType === "CREDIT_NOTE" ||
    (!initialNoteType && initialSourceType === "SALE")
      ? "credit"
      : "debit";

  const [currentTab, setCurrentTab] = React.useState(activeTab);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<DebitCreditNoteStatus | "">((searchParams?.get("status") as DebitCreditNoteStatus) || "");
  const [sourceTypeFilter, setSourceTypeFilter] = React.useState<DebitCreditNoteSourceType | "">(
    initialSourceType === "SALE" || initialSourceType === "PURCHASE" ? initialSourceType : ""
  );
  const [agencyFilter, setAgencyFilter] = React.useState(searchParams?.get("agencyId") || "");
  const [branchFilter, setBranchFilter] = React.useState(searchParams?.get("branchId") || "");
  const [invoiceFilter, setInvoiceFilter] = React.useState(searchParams?.get("saleId") || searchParams?.get("purchaseId") || "");
  const [currentPage, setCurrentPage] = React.useState(Number(searchParams?.get("page")) || 1);
  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [detailsModal, setDetailsModal] = React.useState<{ open: boolean; note: DebitCreditNote | null }>({ open: false, note: null });
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [pdfPreview, setPdfPreview] = React.useState<{ open: boolean; note: DebitCreditNote | null; objectUrl: string | null }>({ open: false, note: null, objectUrl: null });
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [downloadLoading, setDownloadLoading] = React.useState(false);

  const noteType: DebitCreditNoteType = currentTab === "credit" ? "CREDIT_NOTE" : "DEBIT_NOTE";

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
        setAgencies(agenciesRes.data.agencies || []);
      }
    } catch (err) {
      console.error("Failed to fetch debit/credit filters", err);
    }
  }

  async function fetchNotes() {
    try {
      await dispatch(
        fetchAllDebitCreditNotes({
          page: currentPage,
          limit: 10,
          sourceType: sourceTypeFilter || undefined,
          status: statusFilter || undefined,
          type: noteType,
          agencyId: agencyFilter || undefined,
          branchId: branchFilter || undefined,
          saleId: sourceTypeFilter === "SALE" && invoiceFilter ? invoiceFilter : undefined,
          purchaseId: sourceTypeFilter === "PURCHASE" && invoiceFilter ? invoiceFilter : undefined,
        })
      ).unwrap();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to fetch debit/credit notes", "error");
    }
  }

  async function fetchInvoices() {
    if (!sourceTypeFilter) return;

    try {
      await dispatch(
        fetchDebitCreditNoteInvoices({
          sourceType: sourceTypeFilter,
          agencyId: agencyFilter || undefined,
          branchId: branchFilter || undefined,
        })
      ).unwrap();
    } catch (err) {
      console.error("Failed to fetch debit/credit invoices", err);
    }
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (sourceTypeFilter) params.set("sourceType", sourceTypeFilter);
    if (currentTab === "credit") params.set("tab", "credit");
    if (currentPage > 1) params.set("page", String(currentPage));
    if (statusFilter) params.set("status", statusFilter);
    params.set("type", noteType);
    if (agencyFilter) params.set("agencyId", agencyFilter);
    if (branchFilter) params.set("branchId", branchFilter);
    if (invoiceFilter && sourceTypeFilter) {
      params.set(sourceTypeFilter === "SALE" ? "saleId" : "purchaseId", invoiceFilter);
    }

    router.replace(`/debit-credit-notes?${params.toString()}`, { scroll: false });
  }

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchFilterOptions();
  }, []);

  React.useEffect(() => {
    if (!canView) return;
    void fetchNotes();
    void fetchInvoices();
    updateUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, noteType, sourceTypeFilter, currentPage, statusFilter, agencyFilter, branchFilter, invoiceFilter]);

  React.useEffect(() => {
    return () => {
      if (pdfPreview.objectUrl) URL.revokeObjectURL(pdfPreview.objectUrl);
    };
  }, [pdfPreview.objectUrl]);

  const handleTabChange = (value: string) => {
    const nextTab = value === "credit" ? "credit" : "debit";
    setCurrentTab(nextTab);
    setCurrentPage(1);
    setInvoiceFilter("");
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setSourceTypeFilter("");
    setAgencyFilter("");
    setBranchFilter("");
    setInvoiceFilter("");
    setCurrentPage(1);
  };

  const handleViewDetails = async (note: DebitCreditNote) => {
    setDetailsLoading(true);
    setDetailsModal({ open: true, note: null });
    try {
      const response = await debitCreditNoteApi.getById(note.id);
      if (response.success && response.data) {
        setDetailsModal({ open: true, note: response.data });
      } else {
        addToast(response.message || "Failed to fetch debit/credit note details", "error");
        setDetailsModal({ open: false, note: null });
      }
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to fetch debit/credit note details", "error");
      setDetailsModal({ open: false, note: null });
    } finally {
      setDetailsLoading(false);
    }
  };

  const closePdfPreview = () => {
    setPdfPreview((prev) => {
      if (prev.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return { open: false, note: null, objectUrl: null };
    });
  };

  const handlePreviewPdf = async (note: DebitCreditNote) => {
    setPdfLoading(true);
    try {
      const { blob } = await debitCreditNoteApi.previewPdf(note.id);
      const objectUrl = URL.createObjectURL(blob);
      setPdfPreview((prev) => {
        if (prev.objectUrl) URL.revokeObjectURL(prev.objectUrl);
        return { open: true, note, objectUrl };
      });
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to generate debit/credit note PDF", "error");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!pdfPreview.note) return;
    setDownloadLoading(true);
    try {
      const { blob, filename } = await debitCreditNoteApi.downloadPdf(pdfPreview.note.id);
      downloadBlob(blob, filename);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to download debit/credit note PDF", "error");
    } finally {
      setDownloadLoading(false);
    }
  };

  const filteredNotes = React.useMemo(() => {
    if (!searchTerm) return notes;
    const term = searchTerm.toLowerCase();
    return notes.filter((note) => {
      const ref = note.sale?.invoiceNo || note.purchase?.invoiceNo || "";
      return (
        note.noteNo?.toLowerCase().includes(term) ||
        ref.toLowerCase().includes(term) ||
        note.agency?.name?.toLowerCase().includes(term) ||
        note.branch?.name?.toLowerCase().includes(term) ||
        note.particulars.some((particular) => particular.description.toLowerCase().includes(term))
      );
    });
  }, [notes, searchTerm]);

  const invoiceOptions = invoices.map<DataSelectOption>((invoice) => ({
    value: invoice.id,
    label: invoice.invoiceNo,
    description: [invoice.agency?.name, invoice.branch?.name].filter(Boolean).join(" - "),
    badge: invoice.status,
  }));

  const filterBar = (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <DataSelect
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v as DebitCreditNoteStatus | ""); setCurrentPage(1); }}
          placeholder="All Status"
          clearable
          options={[
            { value: "PENDING", label: "Pending" },
            { value: "APPROVED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" },
          ]}
        />
        <DataSelect
          value={sourceTypeFilter}
          onChange={(v) => {
            setSourceTypeFilter(v as DebitCreditNoteSourceType | "");
            setCurrentPage(1);
            setInvoiceFilter("");
          }}
          placeholder="All Sources"
          clearable
          options={[
            { value: "PURCHASE", label: "Purchase" },
            { value: "SALE", label: "Sale" },
          ]}
        />
        <DataSelect
          value={branchFilter}
          onChange={(v) => { setBranchFilter(v); setCurrentPage(1); setInvoiceFilter(""); }}
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
        <DataSelect
          value={agencyFilter}
          onChange={(v) => { setAgencyFilter(v); setCurrentPage(1); setInvoiceFilter(""); }}
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
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DataSelect
          value={invoiceFilter}
          onChange={(v) => { setInvoiceFilter(v); setCurrentPage(1); }}
          placeholder={
            !sourceTypeFilter
              ? "Select a source to filter invoices"
              : invoicesLoading
                ? "Loading invoices..."
                : "All Invoices"
          }
          searchable
          clearable
          disabled={!sourceTypeFilter || invoicesLoading}
          panelClassName="w-[560px]"
          options={invoiceOptions}
          className="md:max-w-xl md:flex-1"
        />
        <Button type="button" variant="outline" onClick={resetFilters}>
          Clear Filters
        </Button>
      </div>
    </div>
  );

  const notesList = (
    <>
      {filterBar}

      {isLoading ? (
        <Card className="mt-6">
          <CardContent className="space-y-3 p-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </CardContent>
        </Card>
      ) : filteredNotes.length > 0 ? (
        <DebitCreditNoteTable
          notes={filteredNotes}
          pagination={pagination}
          onPageChange={setCurrentPage}
          onViewDetails={handleViewDetails}
          onPreviewPdf={handlePreviewPdf}
          pdfLoading={pdfLoading}
        />
      ) : (
        <Card className="mt-6">
          <CardContent className="p-12 text-center text-gray-500">
            <Receipt className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p>No debit/credit notes found for this view.</p>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debit / Credit Notes</h1>
          <p className="mt-1 text-sm text-gray-500">Review debit and credit note adjustments against purchase and sales invoices</p>
        </div>
        <div className="flex items-center gap-2">
          {canApprove && (
            <Button variant="outline" className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50" onClick={() => router.push(`/debit-credit-notes/pending?tab=${currentTab}`)}>
              <CheckCircle2 className="h-4 w-4" />
              Pending Approvals
            </Button>
          )}
          {canWrite && (
            <Button className="gap-2" onClick={() => router.push(`/debit-credit-notes/new?noteType=${currentTab === "credit" ? "CREDIT" : "DEBIT"}`)}>
              <FilePlus2 className="h-4 w-4" />
              Create Note
            </Button>
          )}
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2 bg-gray-100">
          <TabsTrigger value="debit" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Debit Note
          </TabsTrigger>
          <TabsTrigger value="credit" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Credit Note
          </TabsTrigger>
        </TabsList>

        <TabsContent value="debit">{notesList}</TabsContent>
        <TabsContent value="credit">{notesList}</TabsContent>
      </Tabs>

      <DebitCreditNoteDetailsDialog
        note={detailsModal.note}
        loading={detailsLoading}
        onClose={() => setDetailsModal({ open: false, note: null })}
      />
      <DebitCreditNotePdfDialog
        open={pdfPreview.open}
        objectUrl={pdfPreview.objectUrl}
        title={pdfPreview.note?.noteNo ? `${pdfPreview.note.noteNo} PDF` : "Debit / Credit Note PDF"}
        onClose={closePdfPreview}
        onDownload={handleDownloadPdf}
        downloadLoading={downloadLoading}
      />

      <ToastContainer />
    </div>
  );
}
