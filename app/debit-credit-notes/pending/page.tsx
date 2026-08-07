"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  DebitCreditNoteDetailsDialog,
  DebitCreditNotePdfDialog,
  DebitCreditNoteTable,
} from "@/app/debit-credit-notes/components/debit-credit-note-table";
import { debitCreditNoteApi } from "@/app/services/debitCreditNote.service";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchAllDebitCreditNotes,
  rejectDebitCreditNote,
} from "@/app/store/debitCreditNotesSlice";
import type { DebitCreditNote, DebitCreditNoteSourceType } from "@/app/types/debitCreditNote";
import { downloadBlob } from "@/lib/download";
import { hasModulePermission } from "@/lib/usePermissions";

type DebitCreditNotesTab = "purchase" | "sale";

function tabToSourceType(tab: DebitCreditNotesTab): DebitCreditNoteSourceType {
  return tab === "sale" ? "SALE" : "PURCHASE";
}

export default function PendingDebitCreditNotesPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <PendingDebitCreditNotesContent />
    </React.Suspense>
  );
}

function PendingDebitCreditNotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { notes, isLoading, pagination } = useAppSelector((state) => state.debitCreditNotes);
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);

  const canApprove = hasModulePermission(userPermissions, "SALE", "APPROVE");

  const tabFromUrl = searchParams?.get("tab");
  const activeTab: DebitCreditNotesTab = tabFromUrl === "sale" ? "sale" : "purchase";
  const [currentTab, setCurrentTab] = React.useState<DebitCreditNotesTab>(activeTab);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [approveModal, setApproveModal] = React.useState<{ open: boolean; note: DebitCreditNote | null }>({ open: false, note: null });
  const [rejectModal, setRejectModal] = React.useState<{ open: boolean; note: DebitCreditNote | null }>({ open: false, note: null });
  const [rejectionRemarks, setRejectionRemarks] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);
  const [detailsModal, setDetailsModal] = React.useState<{ note: DebitCreditNote | null }>({ note: null });
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [pdfPreview, setPdfPreview] = React.useState<{ open: boolean; note: DebitCreditNote | null; objectUrl: string | null }>({ open: false, note: null, objectUrl: null });
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [downloadLoading, setDownloadLoading] = React.useState(false);

  async function fetchPendingNotes(sourceType: DebitCreditNotesTab = currentTab, page = currentPage) {
    try {
      await dispatch(
        fetchAllDebitCreditNotes({
          page,
          limit: 10,
          status: "PENDING",
          sourceType: tabToSourceType(sourceType),
        })
      ).unwrap();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to fetch pending debit/credit notes", "error");
    }
  }

  React.useEffect(() => {
    if (!canApprove) return;
    void fetchPendingNotes(currentTab, currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canApprove, currentTab, currentPage]);

  React.useEffect(() => {
    return () => {
      if (pdfPreview.objectUrl) URL.revokeObjectURL(pdfPreview.objectUrl);
    };
  }, [pdfPreview.objectUrl]);

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

  const handleTabChange = (value: string) => {
    const nextTab: DebitCreditNotesTab = value === "sale" ? "sale" : "purchase";
    setCurrentTab(nextTab);
    setCurrentPage(1);

    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (nextTab === "purchase") params.delete("tab");
    else params.set("tab", nextTab);

    const query = params.toString();
    router.replace(query ? `/debit-credit-notes/pending?${query}` : "/debit-credit-notes/pending", { scroll: false });
  };

  const handleApprove = async () => {
    if (!approveModal.note) return;
    setActionLoading(true);
    try {
      const note = approveModal.note;
      const { blob } = await debitCreditNoteApi.approvePdf(note.id);
      const objectUrl = URL.createObjectURL(blob);
      setApproveModal({ open: false, note: null });
      setPdfPreview((prev) => {
        if (prev.objectUrl) URL.revokeObjectURL(prev.objectUrl);
        return { open: true, note: { ...note, status: "APPROVED" }, objectUrl };
      });
      addToast("Debit/Credit note approved successfully", "success");
      await fetchPendingNotes(currentTab, currentPage);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to approve debit/credit note", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.note || !rejectionRemarks.trim()) {
      addToast("Please provide rejection reason", "error");
      return;
    }
    setActionLoading(true);
    try {
      await dispatch(rejectDebitCreditNote({ noteId: rejectModal.note.id, remarks: rejectionRemarks.trim() })).unwrap();
      setRejectModal({ open: false, note: null });
      setRejectionRemarks("");
      addToast("Debit/Credit note rejected", "success");
      await fetchPendingNotes(currentTab, currentPage);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to reject debit/credit note", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = async (note: DebitCreditNote) => {
    setDetailsLoading(true);
    setDetailsModal({ note: null });
    try {
      const response = await debitCreditNoteApi.getById(note.id);
      if (response.success && response.data) {
        setDetailsModal({ note: response.data });
      } else {
        addToast(response.message || "Failed to fetch debit/credit note details", "error");
      }
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to fetch debit/credit note details", "error");
    } finally {
      setDetailsLoading(false);
    }
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

  const closePdfPreview = () => {
    setPdfPreview((prev) => {
      if (prev.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return { open: false, note: null, objectUrl: null };
    });
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

  const pendingList = (
    <>
      <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search pending notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <span className="text-sm text-gray-500">{filteredNotes.length} pending</span>
      </div>

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
          onApprove={(note) => setApproveModal({ open: true, note })}
          onReject={(note) => setRejectModal({ open: true, note })}
          showApprovalActions
          pdfLoading={pdfLoading}
          actionLoading={actionLoading}
        />
      ) : (
        <Card className="mt-6">
          <CardContent className="p-12 text-center text-gray-500">
            <Receipt className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p>No pending debit/credit notes found.</p>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div>
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => router.push(`/debit-credit-notes?tab=${currentTab}`)}>
          <ArrowLeft className="h-4 w-4" />
          Back to Debit / Credit Notes
        </Button>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending Debit / Credit Note Approvals</h1>
            <p className="mt-1 text-sm text-gray-500">Review and approve pending debit/credit notes</p>
          </div>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2 bg-gray-100">
          <TabsTrigger value="purchase" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Purchase
          </TabsTrigger>
          <TabsTrigger value="sale" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Sale
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchase">{pendingList}</TabsContent>
        <TabsContent value="sale">{pendingList}</TabsContent>
      </Tabs>

      <Dialog open={approveModal.open} onOpenChange={(open) => !open && setApproveModal({ open: false, note: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Debit / Credit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Approve {approveModal.note?.noteNo} and post its accounting effect?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveModal({ open: false, note: null })}>Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-700" disabled={actionLoading} onClick={handleApprove}>{actionLoading ? "Approving..." : "Approve"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectModal.open} onOpenChange={(open) => !open && setRejectModal({ open: false, note: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Debit / Credit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Please provide a reason for rejecting {rejectModal.note?.noteNo}.</p>
            <Label htmlFor="reject-remarks">Rejection reason</Label>
            <Textarea id="reject-remarks" value={rejectionRemarks} onChange={(e) => setRejectionRemarks(e.target.value)} placeholder="Required reason for rejection" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectModal({ open: false, note: null })}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" disabled={actionLoading} onClick={handleReject}>{actionLoading ? "Rejecting..." : "Reject"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DebitCreditNoteDetailsDialog
        note={detailsModal.note}
        loading={detailsLoading}
        onClose={() => setDetailsModal({ note: null })}
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
