"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Calendar,
  Factory,
  Eye,
  Search,
  RefreshCcw,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Layers,
  Package,
  IndianRupee as RupeeIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppSelector } from "@/app/store/hooks";
import { branchApi } from "@/app/services/branch.service";
import { manufacturingApi } from "@/app/services/manufacturing.service";
import {
  ManufacturePreview,
  ProductManufacture,
  toFiniteNumber,
} from "@/app/types/manufacturing";
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

// ============== VIEW MODAL ==============
function ViewModal({
  open,
  manufacture,
  branchName,
  onClose,
}: {
  open: boolean;
  manufacture: ProductManufacture | null;
  branchName: string;
  onClose: () => void;
}) {
  if (!open || !manufacture) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Manufacturing — {manufacture.outputBatchNo}
              </h3>
              <p className="text-sm text-gray-500">
                {manufacture.outputProduct?.name || "—"} · {branchName}
              </p>
            </div>
            <Badge variant="outline" dot>
              <Clock className="h-3 w-3 mr-1" />
              {manufacture.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase">Output Qty</p>
              <p className="font-medium text-gray-900">
                {toFiniteNumber(manufacture.outputQuantity)} {manufacture.outputUnit}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Cost</p>
              <p className="font-medium text-gray-900">
                {formatCurrency(manufacture.totalManufacturingCost || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Unit Cost</p>
              <p className="font-medium text-gray-900">
                {formatCurrency(manufacture.unitManufacturingCost || 0)} / {manufacture.outputUnit}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Created</p>
              <p className="text-gray-900">{formatDateTime(manufacture.createdAt)}</p>
            </div>
          </div>

          {manufacture.remarks && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Remarks</p>
              <p className="text-sm text-gray-900 whitespace-pre-line">
                {manufacture.remarks}
              </p>
            </div>
          )}

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            <AlertTriangle className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
            DRAFT documents have not yet impacted inventory or accounting.
            Inventory and ledger entries are created on approval.
          </p>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== APPROVE MODAL ==============
function ApproveModal({
  open,
  manufacture,
  branchName,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  manufacture: ProductManufacture | null;
  branchName: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || !manufacture) return null;
  const totalCost = manufacture.totalManufacturingCost || 0;
  const unitCost = manufacture.unitManufacturingCost || 0;
  const outQty = toFiniteNumber(manufacture.outputQuantity);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Approve Manufacturing
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            Approving this manufacturing document will:
          </p>
          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
            <li>Consume raw materials using FIFO</li>
            <li>Add finished product inventory</li>
            <li>Create product ledger movements</li>
            <li>Create an accounting voucher</li>
          </ul>

          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p>
              <span className="text-gray-500">Output: </span>
              <span className="font-medium text-gray-900">
                {outQty} {manufacture.outputUnit}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-900">
                {manufacture.outputProduct?.name || "—"}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Branch: </span>
              <span className="font-medium text-gray-900">{branchName}</span>
            </p>
            <p>
              <span className="text-gray-500">Batch: </span>
              <span className="font-mono text-gray-900">
                {manufacture.outputBatchNo}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Total cost: </span>
              <span className="font-medium text-gray-900">
                {formatCurrency(totalCost)}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Unit cost: </span>
              <span className="font-medium text-gray-900">
                {formatCurrency(unitCost)} / {manufacture.outputUnit}
              </span>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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

// ============== REJECT MODAL ==============
function RejectModal({
  open,
  manufacture,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  manufacture: ProductManufacture | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = React.useState("");
  React.useEffect(() => {
    if (open) setRemarks("");
  }, [open, manufacture?.id]);
  if (!open || !manufacture) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Reject Manufacturing
            </h3>
          </div>
          <p className="text-gray-600 mb-4">
            Reject manufacturing document{" "}
            <span className="font-mono text-gray-900">
              {manufacture.outputBatchNo}
            </span>
            ?
          </p>
          <div className="space-y-2 mb-4">
            <Label htmlFor="mfg-reject-remarks">Reason for rejection</Label>
            <Textarea
              id="mfg-reject-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="e.g., Recipe needs adjustment before production"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(remarks.trim())}
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

// ============== MAIN PAGE ==============
export default function PendingManufacturesPage() {
  const { addToast } = useToast();
  const { permissions } = useAppSelector((state) => state.auth);

  const canView = hasModulePermission(permissions, "PRODUCT", "VIEW");
  const canWrite = hasModulePermission(permissions, "PRODUCT", "WRITE");

  const [manufactures, setManufactures] = React.useState<ProductManufacture[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const [viewing, setViewing] = React.useState<ProductManufacture | null>(null);
  const [approving, setApproving] = React.useState<ProductManufacture | null>(null);
  const [rejecting, setRejecting] = React.useState<ProductManufacture | null>(null);

  const branchName = React.useCallback(
    (id: string) => branches.find((b) => b.id === id)?.name || id,
    [branches]
  );

  const refetchQueue = React.useCallback(async () => {
    setLoading(true);
    try {
      const [mfgRes, branchRes] = await Promise.all([
        manufacturingApi.listManufactures({ status: "DRAFT" }),
        branchApi.getActive().catch(() => ({ success: false, message: "", data: undefined })),
      ]);
      if (mfgRes.success && mfgRes.data?.manufactures) {
        setManufactures(mfgRes.data.manufactures);
      } else {
        setManufactures([]);
        if (mfgRes.message) addToast(mfgRes.message, "error");
      }
      if (branchRes.success && branchRes.data?.branches) {
        setBranches(branchRes.data.branches);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load pending manufacturing", "error");
      setManufactures([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    refetchQueue();
  }, [refetchQueue]);

  const handleApprove = async () => {
    if (!approving) return;
    setSubmitting(true);
    try {
      const res = await manufacturingApi.approveManufacture(approving.id);
      if (res.success && res.data?.manufacture) {
        addToast(
          `Manufacturing ${res.data.manufacture.outputBatchNo} approved. Inventory updated, voucher created.`,
          "success"
        );
        setApproving(null);
        await refetchQueue();
      } else {
        addToast(res.message || "Failed to approve manufacturing", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to approve manufacturing", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (remarks: string) => {
    if (!rejecting) return;
    setSubmitting(true);
    try {
      const res = await manufacturingApi.rejectManufacture(rejecting.id, { remarks });
      if (res.success) {
        addToast("Manufacturing rejected", "success");
        setRejecting(null);
        await refetchQueue();
      } else {
        addToast(res.message || "Failed to reject manufacturing", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to reject manufacturing", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return manufactures;
    return manufactures.filter(
      (m) =>
        m.outputBatchNo?.toLowerCase().includes(q) ||
        m.outputProduct?.name?.toLowerCase().includes(q) ||
        m.outputProduct?.sku?.toLowerCase().includes(q) ||
        m.remarks?.toLowerCase().includes(q)
    );
  }, [manufactures, search]);

  const stats = React.useMemo(() => {
    const total = manufactures.length;
    const totalCost = manufactures.reduce(
      (s, m) => s + (m.totalManufacturingCost || 0),
      0
    );
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const todayCount = manufactures.filter((m) =>
      formatDate(m.createdAt).startsWith(todayPrefix)
    ).length;
    return { total, totalCost, todayCount };
  }, [manufactures]);

  if (!canView) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/manufacturing/manufactures">
            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
              <ArrowLeft className="h-4 w-4" />
              Back to Manufactures
            </Button>
          </Link>
        </div>
        <PageHeader
          title="Pending Manufacturing Approvals"
          description="Review and approve draft manufacturing documents"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Manufacturing", href: "/manufacturing" },
            { label: "Manufactures", href: "/manufacturing/manufactures" },
            { label: "Pending" },
          ]}
        />
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              You do not have permission to view the pending queue
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ask your administrator to grant the{" "}
              <code className="font-mono text-[11px]">PRODUCT:VIEW</code>{" "}
              permission.
            </p>
          </CardContent>
        </Card>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/manufacturing/manufactures">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Manufactures
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Pending Manufacturing Approvals"
        description="Review and approve draft manufacturing documents"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Manufacturing", href: "/manufacturing" },
          { label: "Manufactures", href: "/manufacturing/manufactures" },
          { label: "Pending" },
        ]}
        actions={
          <Button variant="outline" className="gap-2" onClick={refetchQueue}>
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Pending"
          value={stats.total}
          hint="Draft documents in queue"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(stats.totalCost)}
          hint="Awaiting approval"
          icon={RupeeIcon}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Today Pending"
          value={stats.todayCount}
          hint="Created today"
          icon={Calendar}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by batch, product, SKU, or remarks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">Queue is empty</p>
              <p className="text-xs text-gray-500 mt-1">
                There are no draft manufacturing documents awaiting approval.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Batch</th>
                    <th className="text-left px-4 py-3 font-medium">Output</th>
                    <th className="text-left px-4 py-3 font-medium">Branch</th>
                    <th className="text-right px-4 py-3 font-medium">Qty</th>
                    <th className="text-right px-4 py-3 font-medium">Cost</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-gray-900">
                        {m.outputBatchNo}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {m.outputProduct?.name || "—"}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {m.outputProduct?.sku || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {branchName(m.branchId)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {toFiniteNumber(m.outputQuantity)} {m.outputUnit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {formatCurrency(m.totalManufacturingCost || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" dot>
                          <Clock className="h-3 w-3 mr-1" />
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewing(m)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canWrite && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setApproving(m)}
                                title="Approve"
                                className="text-green-700 hover:bg-green-50"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRejecting(m)}
                                title="Reject"
                                className="text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" />
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

      <ViewModal
        open={!!viewing}
        manufacture={viewing}
        branchName={viewing ? branchName(viewing.branchId) : ""}
        onClose={() => setViewing(null)}
      />

      <ApproveModal
        open={!!approving}
        manufacture={approving}
        branchName={approving ? branchName(approving.branchId) : ""}
        loading={submitting}
        onCancel={() => setApproving(null)}
        onConfirm={handleApprove}
      />

      <RejectModal
        open={!!rejecting}
        manufacture={rejecting}
        loading={submitting}
        onCancel={() => setRejecting(null)}
        onConfirm={handleReject}
      />

      <ToastContainer />
    </div>
  );
}
