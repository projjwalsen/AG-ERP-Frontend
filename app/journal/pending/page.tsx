"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Calendar,
  FileText,
  Eye,
  Search,
  RefreshCcw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppSelector } from "@/app/store/hooks";
import { branchApi } from "@/app/services/branch.service";
import { journalApi, journalHeadApi } from "@/app/services/journal.service";
import {
  Journal,
  JournalHead,
} from "@/app/types/journal";
import { Branch } from "@/app/types/branch";

// ============== STAT CARD ==============
function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1.5 truncate">
              {value}
            </p>
            {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
          </div>
          <div className={`shrink-0 p-2.5 rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============== CONFIRM APPROVE MODAL ==============
function ConfirmApproveModal({
  open,
  journal,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  journal: Journal | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || !journal) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-sm w-full">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-full">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Approve Journal Entry
            </h3>
          </div>
          <p className="text-gray-600 mb-2">
            Approve journal entry of{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(Number(journal.amount) || 0)}
            </span>{" "}
            for{" "}
            <span className="font-semibold text-gray-900">
              {journal.journalHead?.name || "—"}
            </span>
            ?
          </p>
          <p className="text-xs text-gray-500 mb-6">
            This posts the entry to the ledger and locks it from further edits.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              loading={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Yes, Approve
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== REJECTION MODAL ==============
function RejectModal({
  open,
  journal,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  journal: Journal | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");

  // Reset the textarea whenever the modal opens for a new journal.
  React.useEffect(() => {
    if (open) setReason("");
  }, [open, journal?.id]);

  if (!open || !journal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Reject Journal Entry
            </h3>
          </div>
          <p className="text-gray-600 mb-4">
            Reject journal entry of{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(Number(journal.amount) || 0)}
            </span>{" "}
            for{" "}
            <span className="font-semibold text-gray-900">
              {journal.journalHead?.name || "—"}
            </span>
            ?
          </p>
          <div className="space-y-2 mb-4">
            <Label htmlFor="reject-reason">Reason for rejection (optional)</Label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g., Missing supporting document"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={loading}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(reason.trim())}
              loading={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== VIEW JOURNAL MODAL (inline) ==============
function ViewJournalInline({ journal }: { journal: Journal }) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase">Status</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            Pending
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
              <p className="font-medium">{journal.paymentThrough}</p>
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

      {journal.createdBy && (
        <div className="border rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase mb-2">Created By</p>
          <p className="font-medium">{journal.createdBy.name}</p>
          <p className="text-sm text-gray-500">{journal.createdBy.email || "-"}</p>
          {journal.createdAt && (
            <p className="text-xs text-gray-400 mt-1">{formatDateTime(journal.createdAt)}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============== PAGE ==============
export default function PendingJournalPage() {
  const { addToast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [journals, setJournals] = React.useState<Journal[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [journalHeads, setJournalHeads] = React.useState<JournalHead[]>([]);
  const [search, setSearch] = React.useState<string>("");
  const [branchFilter, setBranchFilter] = React.useState<string>("");
  const [headFilter, setHeadFilter] = React.useState<string>("");

  const [approveOpen, setApproveOpen] = React.useState<boolean>(false);
  const [rejectOpen, setRejectOpen] = React.useState<boolean>(false);
  const [viewJournal, setViewJournal] = React.useState<Journal | null>(null);
  const [activeJournal, setActiveJournal] = React.useState<Journal | null>(null);

  const permissions = useAppSelector((s: any) => s?.auth?.permissions ?? []);
  const canApprove = hasModulePermission(permissions, "JOURNAL", "APPROVE");

  React.useEffect(() => {
    let cancelled = false;
    const loadFilters = async () => {
      try {
        const [b, h] = await Promise.all([
          branchApi.getActive(),
          journalHeadApi.list({ isActive: true }),
        ]);
        if (cancelled) return;
        if (b.success && b.data) setBranches(b.data.branches || []);
        if (h.success && h.data) setJournalHeads(h.data.journalHeads || []);
      } catch {
        // Non-critical — picker just stays empty.
      }
    };
    loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await journalApi.getAll({
        status: "PENDING",
        page: 1,
        limit: 200,
        search: search.trim() || undefined,
        branchId: branchFilter || undefined,
        journalHeadId: headFilter || undefined,
      });
      setJournals(res.data?.journals ?? []);
    } catch (err: any) {
      addToast(err?.message || "Failed to load pending journals", "error");
    } finally {
      setLoading(false);
    }
  }, [search, branchFilter, headFilter, addToast]);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  // Stat cards derive from the in-memory list (PENDING only, max 200).
  const stats = React.useMemo(() => {
    const total = journals.length;
    const totalAmount = journals.reduce(
      (s, j) => s + (Number(j.amount) || 0),
      0
    );
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const todayCount = journals.filter((j) =>
      String(j.journalDate || "").startsWith(todayPrefix)
    ).length;
    const inwardCount = journals.filter(
      (j) => j.journalHead?.type === "INWARD"
    ).length;
    const outwardCount = journals.filter(
      (j) => j.journalHead?.type === "OUTWARD"
    ).length;
    return { total, totalAmount, todayCount, inwardCount, outwardCount };
  }, [journals]);

  const openApprove = (j: Journal) => {
    setActiveJournal(j);
    setApproveOpen(true);
  };

  const openReject = (j: Journal) => {
    setActiveJournal(j);
    setRejectOpen(true);
  };

  const handleApprove = async () => {
    if (!activeJournal) return;
    setSubmitting(true);
    try {
      const res = await journalApi.approve(activeJournal.id);
      if (res.success) {
        addToast(
          `Journal entry for ${activeJournal.journalHead?.name || "—"} approved`,
          "success"
        );
        setApproveOpen(false);
        setActiveJournal(null);
        refetch();
      } else {
        addToast(res.message || "Failed to approve journal", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to approve journal", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!activeJournal) return;
    setSubmitting(true);
    try {
      const res = await journalApi.reject(
        activeJournal.id,
        reason || undefined
      );
      if (res.success) {
        addToast(
          `Journal entry for ${activeJournal.journalHead?.name || "—"} rejected`,
          "success"
        );
        setRejectOpen(false);
        setActiveJournal(null);
        refetch();
      } else {
        addToast(res.message || "Failed to reject journal", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to reject journal", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <PageHeader
          title="Pending Journal Approvals"
          description="Approve or reject pending journal entries before they post to the ledger"
          breadcrumbs={[
            { label: "Journals", href: "/journal" },
            { label: "Pending Approvals" },
          ]}
          actions={
            <Link href="/journal">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Journals
              </Button>
            </Link>
          }
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
          <StatCard
            title="Pending"
            value={stats.total}
            hint="Awaiting approval"
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <StatCard
            title="Total Amount"
            value={formatCurrency(stats.totalAmount)}
            hint="Sum of pending entries"
            icon={IndianRupee}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Posted Today"
            value={stats.todayCount}
            hint="Created today"
            icon={Calendar}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            title="Inward"
            value={stats.inwardCount}
            hint="Money coming in"
            icon={ArrowDownToLine}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            title="Outward"
            value={stats.outwardCount}
            hint="Money going out"
            icon={ArrowUpFromLine}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
          />
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm mb-5">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search remarks, head, branch..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select
                value={headFilter}
                onChange={(e) => setHeadFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Heads</option>
                {journalHeads.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.type})
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Queue */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : journals.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-200 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">All caught up!</p>
                <p className="text-sm text-gray-500 mt-1">
                  No pending journal entries to review.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Branch
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Head
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Payment
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {journals.map((j) => (
                      <tr key={j.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {formatDateTime(j.journalDate)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {j.branch?.name || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-100 rounded-lg">
                              <FileText className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            <span className="text-sm font-medium">
                              {j.journalHead?.name || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              j.journalHead?.type === "INWARD"
                                ? "success"
                                : "error"
                            }
                            className={
                              j.journalHead?.type === "INWARD"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }
                          >
                            {j.journalHead?.type || "-"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(Number(j.amount) || 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{j.paymentMode}</span>
                            {j.paymentThrough && (
                              <span className="text-xs text-gray-500">
                                via {j.paymentThrough}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => setViewJournal(j)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                            {canApprove && (
                              <>
                                <Button
                                  size="sm"
                                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => openApprove(j)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => openReject(j)}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmApproveModal
        open={approveOpen}
        journal={activeJournal}
        loading={submitting}
        onCancel={() => {
          if (!submitting) {
            setApproveOpen(false);
            setActiveJournal(null);
          }
        }}
        onConfirm={handleApprove}
      />

      <RejectModal
        open={rejectOpen}
        journal={activeJournal}
        loading={submitting}
        onCancel={() => {
          if (!submitting) {
            setRejectOpen(false);
            setActiveJournal(null);
          }
        }}
        onConfirm={handleReject}
      />

      {/* View modal (inline-style, same chrome as confirm modals) */}
      {viewJournal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-full">
                  <FileText className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Journal Details
                </h3>
              </div>
              <ViewJournalInline journal={viewJournal} />
              <div className="flex justify-end mt-6">
                <Button
                  variant="outline"
                  onClick={() => setViewJournal(null)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
