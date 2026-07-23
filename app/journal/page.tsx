"use client";

import * as React from "react";
import {
  BookOpen, Plus, Search, Edit, Eye, MoreHorizontal, RefreshCw,
  Tag, FileText, Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { DataSelect, type DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { branchApi } from "@/app/services/branch.service";
import { JournalImportButton } from "@/app/components/import/JournalImportButton";
import {
  journalApi,
  journalHeadApi,
  CreateJournalHeadPayload,
  CreateJournalPayload,
  UpdateJournalPayload,
  UpdateJournalHeadPayload,
} from "@/app/services/journal.service";
import {
  Journal,
  JournalHead,
  JournalStatus,
  PaymentMode,
  PaymentType,
} from "@/app/types/journal";
import { Branch } from "@/app/types/branch";
import { formatCurrency, formatDateTime } from "@/lib/utils";

// ============== CONSTANTS ==============
const statusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-amber-100", text: "text-amber-700" },
  APPROVED: { bg: "bg-green-100", text: "text-green-700" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700" },
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const paymentModeOptions: PaymentMode[] = ["ONLINE", "OFFLINE"];
const paymentThroughOptions: PaymentType[] = [
  "CASH",
  "NEFT",
  "RTGS",
  "UPI",
  "CHEQUE",
  "DD",
  "BANK_DEPOSIT",
];

const paymentThroughLabels: Record<string, string> = {
  CASH: "Cash",
  NEFT: "NEFT",
  RTGS: "RTGS",
  UPI: "UPI",
  CHEQUE: "Cheque",
  DD: "DD",
  BANK_DEPOSIT: "Bank Deposit",
};

// Convert "YYYY-MM-DD" → ISO timestamp the backend expects.
function dateInputToIso(d: string): string {
  if (!d) return "";
  return `${d}T00:00:00.000Z`;
}

function isoToDateInput(iso?: string): string {
  if (!iso) return "";
  // Take the YYYY-MM-DD prefix; works for both date and ISO strings.
  return iso.slice(0, 10);
}

export default function JournalPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <JournalContent />
    </React.Suspense>
  );
}

function JournalContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BookOpen className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Journal Management</h1>
            <p className="text-gray-500 mt-1">
              Manage journal heads and post manual journal entries (inward / outward)
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="journals" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6 bg-gray-100">
          <TabsTrigger value="journals" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Journals
          </TabsTrigger>
          <TabsTrigger value="heads" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Journal Heads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journals">
          <JournalsTab />
        </TabsContent>

        <TabsContent value="heads">
          <JournalHeadsTab />
        </TabsContent>
      </Tabs>

      <ToastContainer />
    </div>
  );
}

// ============== JOURNALS TAB ==============
function JournalsTab() {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [journals, setJournals] = React.useState<Journal[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [journalHeads, setJournalHeads] = React.useState<JournalHead[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState("");
  const [headFilter, setHeadFilter] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<{ total: number; totalPages: number; page: number; limit: number } | null>(null);

  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedJournal, setSelectedJournal] = React.useState<Journal | null>(null);

  React.useEffect(() => {
    fetchBranches();
    fetchJournalHeads();
  }, []);

  React.useEffect(() => {
    fetchJournals(currentPage);
  }, [currentPage, statusFilter, branchFilter, headFilter, fromDate, toDate]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, branchFilter, headFilter, fromDate, toDate]);

  React.useEffect(() => {
    fetchJournals(1);
  }, [searchTerm]);

  const fetchBranches = async () => {
    try {
      const res = await branchApi.getActive();
      if (res.success && res.data) {
        setBranches(res.data.branches || []);
      } else {
        // Make the empty-dropdown case debuggable instead of silently failing.
        addToast(res.message || "Failed to load branches", "error");
      }
    } catch (err: any) {
      console.error("Failed to fetch branches", err);
      addToast(err?.message || "Failed to load branches", "error");
    }
  };

  const fetchJournalHeads = async () => {
    try {
      const res = await journalHeadApi.list();
      if (res.success && res.data) {
        setJournalHeads(res.data.journalHeads || []);
      } else {
        addToast(res.message || "Failed to load journal heads", "error");
      }
    } catch (err: any) {
      console.error("Failed to fetch journal heads", err);
      addToast(err?.message || "Failed to load journal heads", "error");
    }
  };

  const fetchJournals = async (page: number) => {
    setLoading(true);
    try {
      const response = await journalApi.getAll({
        page,
        limit: 10,
        search: searchTerm || undefined,
        status: (statusFilter as JournalStatus) || undefined,
        branchId: branchFilter || undefined,
        journalHeadId: headFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setJournals(response.data?.journals ?? []);
      if (response.data && "pagination" in response.data) {
        setPagination((response.data as any).pagination);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load journals", "error");
    } finally {
      setLoading(false);
    }
  };

  // Create now lives at /journal/new — the form is a dedicated route,
  // not a modal. We only need to keep state for the (rare) edit case
  // and for the view modal.
  const handleCreate = () => {
    // No-op; navigation handled by the "+ New Journal" link below.
  };
  void handleCreate;

  const handleEdit = (journal: Journal) => {
    setSelectedJournal(journal);
    setEditModalOpen(true);
  };

  const handleView = async (journal: Journal) => {
    setViewModalOpen(true);
    try {
      const res = await journalApi.getById(journal.id);
      if (res.success && res.data) {
        setSelectedJournal(res.data.journal);
      } else {
        addToast(res.message || "Failed to load journal", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load journal", "error");
    }
  };

  const clearFilters = () => {
    setStatusFilter("");
    setBranchFilter("");
    setHeadFilter("");
    setFromDate("");
    setToDate("");
    setSearchTerm("");
  };

  const hasFilters = statusFilter || branchFilter || headFilter || fromDate || toDate || searchTerm;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Journal Entries</h2>
          <p className="text-sm text-gray-500">Post, view, and approve manual journal entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/journal/pending">
            <Button variant="outline" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending Approvals
            </Button>
          </Link>
          <JournalImportButton
            label="Import Register"
            variant="outline"
            onCompleted={() => fetchJournals(currentPage)}
          />
          <Link href="/journal/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Journal
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search remarks, head, branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={headFilter}
          onChange={(e) => setHeadFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Heads</option>
          {journalHeads.map((h) => (
            <option key={h.id} value={h.id}>{h.name} ({h.type})</option>
          ))}
        </select>
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-[160px]"
          title="From date"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="w-[160px]"
          title="To date"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => fetchJournals(currentPage)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : journals.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Head</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {journals.map((j) => (
                    <tr key={j.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {formatDateTime(j.journalDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-100 rounded-lg">
                            <FileText className="h-3.5 w-3.5 text-indigo-600" />
                          </div>
                          <span className="text-sm font-medium">{j.journalHead?.name || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{j.branch?.name || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">
                          {j.journalHead?.type || "-"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(Number(j.amount) || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{j.paymentMode}</span>
                          {j.paymentThrough && (
                            <span className="text-xs text-gray-500">
                              via {paymentThroughLabels[j.paymentThrough] || j.paymentThrough}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[j.status]?.bg} ${statusColors[j.status]?.text}`}>
                          {statusLabels[j.status] || j.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => handleView(j)}>
                              <Eye className="mr-2 h-4 w-4" />View
                            </DropdownMenuItem>
                            {j.status === "PENDING" && (
                              <DropdownMenuItem onClick={() => handleEdit(j)}>
                                <Edit className="mr-2 h-4 w-4" />Edit
                              </DropdownMenuItem>
                            )}
                            {/* Approval and rejection live on the dedicated
                                /journal/pending page so they have a
                                confirmation flow that's hard to miss. */}
                            {j.status === "PENDING" && (
                              <DropdownMenuItem asChild>
                                <Link href="/journal/pending">
                                  <Clock className="mr-2 h-4 w-4" />
                                  Go to Pending Approvals
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No journals found</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Create First Journal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Journal Modal — create has moved to /journal/new */}
      {editModalOpen && selectedJournal && (
        <JournalFormModal
          open={editModalOpen}
          mode="edit"
          journal={selectedJournal}
          branches={branches}
          journalHeads={journalHeads}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedJournal(null);
          }}
          onSuccess={() => {
            setEditModalOpen(false);
            setSelectedJournal(null);
            fetchJournals(currentPage);
          }}
        />
      )}

      {/* View Journal Modal */}
      {viewModalOpen && selectedJournal && (
        <ViewJournalModal
          open={viewModalOpen}
          journal={selectedJournal}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedJournal(null);
          }}
        />
      )}
    </div>
  );
}

// ============== JOURNAL HEADS TAB ==============
function JournalHeadsTab() {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [heads, setHeads] = React.useState<JournalHead[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedHead, setSelectedHead] = React.useState<JournalHead | null>(null);

  React.useEffect(() => {
    fetchHeads();
  }, [searchTerm, typeFilter]);

  const fetchHeads = async () => {
    setLoading(true);
    try {
      const res = await journalHeadApi.list({
        search: searchTerm || undefined,
        type: (typeFilter as any) || undefined,
      });
      setHeads(res.data?.journalHeads ?? []);
    } catch (err: any) {
      addToast(err?.message || "Failed to load journal heads", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedHead(null);
    setCreateModalOpen(true);
  };

  const handleEdit = (head: JournalHead) => {
    setSelectedHead(head);
    setEditModalOpen(true);
  };

  const handleView = async (head: JournalHead) => {
    setViewModalOpen(true);
    try {
      const res = await journalHeadApi.getById(head.id);
      if (res.success && res.data) {
        setSelectedHead(res.data.journalHead);
      } else {
        addToast(res.message || "Failed to load journal head", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load journal head", "error");
    }
  };

  const handleToggleStatus = async (head: JournalHead) => {
    try {
      const newStatus = !(head.isActive ?? true);
      const res = await journalHeadApi.update(head.id, { isActive: newStatus });
      if (res.success) {
        addToast(`Journal Head ${newStatus ? "activated" : "deactivated"} successfully`, "success");
        fetchHeads();
      } else {
        addToast(res.message || "Failed to update status", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to update status", "error");
    }
  };

  const handleDelete = async (head: JournalHead) => {
    if (!window.confirm(`Delete journal head "${head.name}"? This cannot be undone.`)) return;
    try {
      const res = await journalHeadApi.remove(head.id);
      if (res.success) {
        addToast("Journal Head deleted successfully", "success");
        fetchHeads();
      } else {
        addToast(res.message || "Failed to delete journal head", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to delete journal head", "error");
    }
  };

  const onModalSuccess = () => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setSelectedHead(null);
    fetchHeads();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Journal Heads</h2>
          <p className="text-sm text-gray-500">Categories of journal entries (auto-create ledger)</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Journal Head
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Types</option>
          <option value="INWARD">Inward</option>
          <option value="OUTWARD">Outward</option>
        </select>
        <Button variant="outline" size="sm" onClick={fetchHeads}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : heads.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ledger</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {heads.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-100 rounded-lg">
                            <Tag className="h-4 w-4 text-indigo-600" />
                          </div>
                          <span className="font-medium text-gray-900">{h.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={h.type === "INWARD" ? "success" : "error"} className={h.type === "INWARD" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {h.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {h.ledger ? (
                          <div className="flex flex-col">
                            <span className="font-mono text-xs">{h.ledger.code}</span>
                            <span className="text-xs text-gray-500">{h.ledger.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(h.isActive ?? true) ? "success" : "error"} className={(h.isActive ?? true) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {(h.isActive ?? true) ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => handleView(h)}>
                              <Eye className="mr-2 h-4 w-4" />View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(h)}>
                              <Edit className="mr-2 h-4 w-4" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(h)}
                              className={(h.isActive ?? true) ? "text-red-600" : "text-green-600"}
                            >
                              {(h.isActive ?? true) ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(h)}
                              className="text-red-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No journal heads found</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Add First Journal Head
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Journal Head Modal */}
      {(createModalOpen || editModalOpen) && (
        <JournalHeadFormModal
          open={createModalOpen || editModalOpen}
          mode={createModalOpen ? "create" : "edit"}
          journalHead={selectedHead}
          onClose={() => {
            setCreateModalOpen(false);
            setEditModalOpen(false);
            setSelectedHead(null);
          }}
          onSuccess={onModalSuccess}
        />
      )}

      {/* View Journal Head Modal */}
      {viewModalOpen && selectedHead && (
        <ViewJournalHeadModal
          open={viewModalOpen}
          journalHead={selectedHead}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedHead(null);
          }}
        />
      )}
    </div>
  );
}

// ============== JOURNAL FORM MODAL ==============
function JournalFormModal({
  open,
  mode,
  journal,
  branches,
  journalHeads,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  journal: Journal | null;
  branches: Branch[];
  journalHeads: JournalHead[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [form, setForm] = React.useState<CreateJournalPayload & { type: "" | "INWARD" | "OUTWARD" }>({
    branchId: "",
    journalHeadId: "",
    type: "",
    amount: 0,
    paymentMode: "OFFLINE",
    paymentThrough: "CASH",
    remarks: "",
    journalDate: "",
  });

  // Initialise the form whenever the modal is opened OR the linked journal
  // changes. We intentionally DON'T depend on `open` here — the picker's
  // `setOpen(false)` on selection would otherwise wipe the picked values.
  React.useEffect(() => {
    if (!open) return;
    if (journal && mode === "edit") {
      const head = journalHeads.find((h) => h.id === journal.journalHeadId);
      setForm({
        branchId: journal.branchId,
        journalHeadId: journal.journalHeadId,
        // Drives which heads populate the picker. Pre-populate from the
        // linked head so editing an existing journal keeps the right side.
        type: head?.type ?? "",
        amount: Number(journal.amount) || 0,
        paymentMode: journal.paymentMode,
        paymentThrough: journal.paymentThrough,
        remarks: journal.remarks || "",
        journalDate: isoToDateInput(journal.journalDate),
      });
    } else {
      setForm({
        branchId: "",
        journalHeadId: "",
        type: "",
        amount: 0,
        paymentMode: "OFFLINE",
        paymentThrough: "CASH",
        remarks: "",
        journalDate: "",
      });
    }
  }, [journal, mode, open, journalHeads]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.branchId) {
      addToast("Branch is required", "error");
      return;
    }
    if (!form.type) {
      addToast("Type (INWARD / OUTWARD) is required", "error");
      return;
    }
    if (!form.journalHeadId) {
      addToast("Journal Head is required", "error");
      return;
    }
    // Sanity-check: selected head must match the chosen type, otherwise the
    // backend will reject it with a type-mismatch error.
    const linkedHead = journalHeads.find((h) => h.id === form.journalHeadId);
    if (linkedHead && linkedHead.type !== form.type) {
      addToast(`Selected head is ${linkedHead.type}; please pick a ${form.type} head`, "error");
      return;
    }
    if (!form.amount || form.amount <= 0) {
      addToast("Amount must be greater than 0", "error");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const payload = {
        branchId: form.branchId,
        journalHeadId: form.journalHeadId,
        amount: Number(form.amount),
        paymentMode: form.paymentMode,
        paymentThrough: form.paymentThrough,
        remarks: form.remarks?.trim() || undefined,
        journalDate: form.journalDate
          ? dateInputToIso(form.journalDate)
          : undefined,
      };

      const res = mode === "create"
        ? await journalApi.create(payload)
        : await journalApi.update(journal!.id, payload as UpdateJournalPayload);

      if (res.success) {
        addToast(
          mode === "create" ? "Journal created successfully" : "Journal updated successfully",
          "success"
        );
        onSuccess();
      } else {
        addToast(res.message || "Failed to save journal", "error");
        setLoading(false);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to save journal", "error");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            {mode === "create" ? "Create Journal" : "Edit Journal"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="journal-branch">Branch *</Label>
            <DataSelect
              id="journal-branch"
              value={form.branchId}
              onChange={(v) => setForm({ ...form, branchId: v })}
              placeholder="Select Branch"
              required
              searchable
              clearable
              // The modal uses a Radix dialog overlay; rendering the panel
              // through a portal would put it on document.body and the
              // dialog's outside-click handler would intercept the pick.
              // Render inline so the panel lives in the same stacking context.
              disablePortal
              panelClassName="w-full"
              options={branches.map<DataSelectOption>((b) => ({
                value: b.id,
                label: b.name,
                description: [b.code, b.city, b.state].filter(Boolean).join(" • "),
              }))}
            />
          </div>

          {/* Type picker gates which Journal Heads appear in the next field.
              INWARD = money coming in, OUTWARD = money going out. The user
              picks the type first, then sees only heads of that side. */}
          <div className="space-y-2">
            <Label>Type *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["INWARD", "OUTWARD"] as const).map((t) => {
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      // Resetting the head keeps type + head consistent.
                      setForm({ ...form, type: t, journalHeadId: "" })
                    }
                    className={
                      "h-10 rounded-lg border text-sm font-medium transition-colors " +
                      (active
                        ? t === "INWARD"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50")
                    }
                  >
                    {t === "INWARD" ? "Inward (money in)" : "Outward (money out)"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="journal-head">Journal Head *</Label>
            <DataSelect
              id="journal-head"
              value={form.journalHeadId}
              onChange={(v) => setForm({ ...form, journalHeadId: v })}
              placeholder={
                form.type ? `Select ${form.type} Journal Head` : "Select type first"
              }
              required
              searchable
              clearable
              disablePortal
              panelClassName="w-full"
              // Without a chosen type, no heads render — keeps the user from
              // booking a journal whose head side disagrees with the head.
              options={form.type
                ? journalHeads
                    .filter((h) => h.type === form.type)
                    .map<DataSelectOption>((h) => ({
                      value: h.id,
                      label: h.name,
                      description: h.ledger
                        ? `${h.ledger.code ?? ""}${h.ledger.name ? " • " + h.ledger.name : ""}`
                        : undefined,
                      badge: h.type,
                    }))
                : []}
              disabled={!form.type}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="journal-amount">Amount *</Label>
              <Input
                id="journal-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
                placeholder="1000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="journal-date">Journal Date</Label>
              <Input
                id="journal-date"
                type="date"
                value={form.journalDate}
                onChange={(e) => setForm({ ...form, journalDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="journal-payment-mode">Payment Mode *</Label>
              <select
                id="journal-payment-mode"
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value as PaymentMode })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                {paymentModeOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="journal-payment-through">Payment Through</Label>
              <select
                id="journal-payment-through"
                value={form.paymentThrough || "CASH"}
                onChange={(e) => setForm({ ...form, paymentThrough: e.target.value as PaymentType })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {paymentThroughOptions.map((p) => (
                  <option key={p} value={p}>{paymentThroughLabels[p] || p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="journal-remarks">Remarks</Label>
            <Textarea
              id="journal-remarks"
              value={form.remarks || ""}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              rows={3}
              placeholder="Optional note..."
            />
          </div>

          {showConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="max-w-sm w-full mx-4">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {mode === "create" ? "Confirm Create Journal" : "Confirm Update Journal"}
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    {mode === "create" ? "Create" : "Update"} journal entry of{" "}
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(Number(form.amount) || 0)}
                    </span>?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                    <Button onClick={handleConfirmSave} loading={loading}>
                      Yes, {mode === "create" ? "Create" : "Update"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">
              {mode === "create" ? "Create Journal" : "Update Journal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============== VIEW JOURNAL MODAL ==============
function ViewJournalModal({
  open,
  journal,
  onClose,
}: {
  open: boolean;
  journal: Journal;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Journal Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[journal.status]?.bg} ${statusColors[journal.status]?.text}`}>
                {statusLabels[journal.status] || journal.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Amount</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(Number(journal.amount) || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Date</p>
              <p className="font-medium">{formatDateTime(journal.journalDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Branch</p>
              <p className="font-medium">{journal.branch?.name || "-"}</p>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase">Journal Head</p>
              <p className="font-medium">{journal.journalHead?.name || "-"}</p>
              <Badge variant="outline" className="capitalize mt-1">
                {journal.journalHead?.type || "-"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Payment Mode</p>
                <p className="font-medium">{journal.paymentMode}</p>
              </div>
              {journal.paymentThrough && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Payment Through</p>
                  <p className="font-medium">
                    {paymentThroughLabels[journal.paymentThrough] || journal.paymentThrough}
                  </p>
                </div>
              )}
            </div>
          </div>

          {journal.remarks && (
            <div className="border rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Remarks</p>
              <p className="text-sm whitespace-pre-line">{journal.remarks}</p>
            </div>
          )}

          {journal.voucher && (
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <p className="text-xs text-gray-500 uppercase">Voucher</p>
              <p className="font-mono font-medium">{journal.voucher.voucherNo}</p>
              <p className="text-xs text-gray-500">{journal.voucher.voucherType}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase mb-2">Created By</p>
              <p className="font-medium">{journal.createdBy?.name || "-"}</p>
              <p className="text-sm text-gray-500">{journal.createdBy?.email || "-"}</p>
              {journal.createdAt && (
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(journal.createdAt)}</p>
              )}
            </div>
            {journal.approvedBy && (
              <div className="border rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase mb-2">Action By</p>
                <p className="font-medium">{journal.approvedBy.name}</p>
                <p className="text-sm text-gray-500">{journal.approvedBy.email || "-"}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== JOURNAL HEAD FORM MODAL ==============
function JournalHeadFormModal({
  open,
  mode,
  journalHead,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  journalHead: JournalHead | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [form, setForm] = React.useState<CreateJournalHeadPayload>({
    name: "",
    type: "INWARD",
  });

  React.useEffect(() => {
    if (journalHead && mode === "edit") {
      setForm({
        name: journalHead.name,
        type: journalHead.type,
      });
    } else {
      setForm({ name: "", type: "INWARD" });
    }
  }, [journalHead, mode, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      addToast("Name is required", "error");
      return;
    }
    if (!form.type) {
      addToast("Type is required", "error");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
      };

      const res = mode === "create"
        ? await journalHeadApi.create(payload)
        : await journalHeadApi.update(journalHead!.id, payload as UpdateJournalHeadPayload);

      if (res.success) {
        addToast(
          mode === "create" ? "Journal Head created successfully" : "Journal Head updated successfully",
          "success"
        );
        onSuccess();
      } else {
        addToast(res.message || "Failed to save journal head", "error");
        setLoading(false);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to save journal head", "error");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-600" />
            {mode === "create" ? "Add Journal Head" : "Edit Journal Head"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jh-name">Name *</Label>
            <Input
              id="jh-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Salary Payable"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jh-type">Type *</Label>
            <select
              id="jh-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="INWARD">Inward</option>
              <option value="OUTWARD">Outward</option>
            </select>
            <p className="text-xs text-gray-500">
              INWARD: money coming in (Debit Cash/Bank, Credit head). OUTWARD: money going out (Debit head, Credit Cash/Bank).
            </p>
          </div>

          {showConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="max-w-sm w-full mx-4">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {mode === "create" ? "Confirm Create" : "Confirm Update"}
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    {mode === "create" ? "Create" : "Update"} journal head{" "}
                    <span className="font-semibold text-gray-900">{form.name}</span>?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                    <Button onClick={handleConfirmSave} loading={loading}>
                      Yes, {mode === "create" ? "Create" : "Update"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">
              {mode === "create" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============== VIEW JOURNAL HEAD MODAL ==============
function ViewJournalHeadModal({
  open,
  journalHead,
  onClose,
}: {
  open: boolean;
  journalHead: JournalHead;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-600" />
            Journal Head Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase">Name</p>
              <p className="font-medium">{journalHead.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Type</p>
              <Badge variant={journalHead.type === "INWARD" ? "success" : "error"} className={journalHead.type === "INWARD" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                {journalHead.type}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Status</p>
              <Badge variant={(journalHead.isActive ?? true) ? "success" : "error"} className={(journalHead.isActive ?? true) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                {(journalHead.isActive ?? true) ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          {journalHead.ledger && (
            <div className="border rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Linked Ledger</p>
              <p className="font-mono text-sm">{journalHead.ledger.code}</p>
              <p className="font-medium">{journalHead.ledger.name}</p>
              <p className="text-xs text-gray-500">
                {journalHead.ledger.category} • {journalHead.ledger.nature}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}