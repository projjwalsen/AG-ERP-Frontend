"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Factory,
  Plus,
  RefreshCcw,
  Eye,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ArrowDown,
  ArrowUp,
  Package,
  Layers,
  IndianRupee,
  Save,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout";
import { DataSelect, DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppSelector } from "@/app/store/hooks";
import { hasModulePermission, usePermissions } from "@/lib/usePermissions";
import { manufacturingApi } from "@/app/services/manufacturing.service";
import { branchApi } from "@/app/services/branch.service";
import { inventoryApi } from "@/app/services/inventory.service";
import { productApi } from "@/app/services/product.service";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import {
  ManufacturePreview,
  ProductManufacture,
  ProductManufactureStatus,
  ProductRecipe,
  toFiniteNumber,
} from "@/app/types/manufacturing";
import { ProductUnit } from "@/app/types/product";
import { Branch } from "@/app/types/branch";
import { AvailableBatch, InventorySummaryRecord } from "@/app/types/inventory";

// =====================================================================
// Status badge
// =====================================================================

function ManufactureStatusBadge({ status }: { status: ProductManufactureStatus | string }) {
  const config: Record<string, { variant: "default" | "success" | "warning" | "error" | "secondary" | "info" | "purple" | "outline"; icon: React.ElementType; label: string }> = {
    DRAFT: { variant: "outline", icon: Clock, label: "Draft" },
    APPROVED: { variant: "success", icon: CheckCircle2, label: "Approved" },
    REJECTED: { variant: "error", icon: XCircle, label: "Rejected" },
  };
  const c = config[status] || { variant: "outline" as const, icon: Clock, label: status };
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} dot>
      <Icon className="h-3 w-3 mr-1" />
      {c.label}
    </Badge>
  );
}

// =====================================================================
// Confirm approve modal — full impact disclosure
// =====================================================================

function ConfirmApproveManufactureModal({
  open,
  manufacture,
  preview,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  manufacture: ProductManufacture | null;
  preview: ManufacturePreview | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || !manufacture) return null;
  const totalCost = preview?.totalManufacturingCost ?? manufacture.totalManufacturingCost;
  const unitCost = preview?.unitManufacturingCost ?? manufacture.unitManufacturingCost;
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
              <span className="text-gray-500">Batch: </span>
              <span className="font-mono text-gray-900">
                {manufacture.outputBatchNo}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Total cost: </span>
              <span className="font-medium text-gray-900">
                {formatCurrency(totalCost || 0)}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Unit cost: </span>
              <span className="font-medium text-gray-900">
                {formatCurrency(unitCost || 0)} / {manufacture.outputUnit}
              </span>
            </p>
          </div>

          {preview && preview.allocations.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">
                Will consume (FIFO)
              </p>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">Material</th>
                      <th className="text-left px-2 py-1.5 font-medium">Batch</th>
                      <th className="text-right px-2 py-1.5 font-medium">Qty</th>
                      <th className="text-right px-2 py-1.5 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.allocations.map((a, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-2 py-1.5 text-gray-900">
                          {a.productName}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-gray-600">
                          {a.batchNo}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {a.quantity} {a.unit}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {formatCurrency(a.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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

// =====================================================================
// Reject modal
// =====================================================================

function RejectManufactureModal({
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

// =====================================================================
// Detail dialog (after approval) — shows inventory + voucher
// =====================================================================

function ManufactureDetailModal({
  open,
  manufacture,
  inventoryBefore,
  inventoryAfter,
  summary,
  onClose,
}: {
  open: boolean;
  manufacture: ProductManufacture | null;
  inventoryBefore: AvailableBatch[];
  inventoryAfter: AvailableBatch[];
  summary: InventorySummaryRecord | null;
  onClose: () => void;
}) {
  if (!open || !manufacture) return null;
  const approved = manufacture.status === "APPROVED";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Manufacturing — {manufacture.outputBatchNo}
              </h3>
              <p className="text-sm text-gray-500">
                {manufacture.outputProduct?.name || "—"} · {manufacture.status}
              </p>
            </div>
            <ManufactureStatusBadge status={manufacture.status} />
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
            {manufacture.approvedAt && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Approved</p>
                <p className="text-gray-900">{formatDateTime(manufacture.approvedAt)}</p>
              </div>
            )}
          </div>

          {manufacture.remarks && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Remarks</p>
              <p className="text-sm text-gray-900 whitespace-pre-line">
                {manufacture.remarks}
              </p>
            </div>
          )}

          {approved && manufacture.consumptions && manufacture.consumptions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-red-500" />
                Materials Consumed
              </p>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">Product</th>
                      <th className="text-right px-2 py-1.5 font-medium">Qty</th>
                      <th className="text-right px-2 py-1.5 font-medium">Unit Cost</th>
                      <th className="text-right px-2 py-1.5 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manufacture.consumptions.map((c) => (
                      <tr key={c.id} className="border-t border-gray-100">
                        <td className="px-2 py-1.5 text-gray-900">{c.productId}</td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {c.quantity} {c.unit}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {formatCurrency(c.unitCost || 0)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {formatCurrency(c.totalCost || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {approved && manufacture.voucher && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm space-y-1">
              <p className="font-medium text-green-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Voucher created
              </p>
              <p className="text-green-800">
                Voucher No:{" "}
                <span className="font-mono">{manufacture.voucher.voucherNo}</span>
              </p>
              <p className="text-green-800">
                Type: {manufacture.voucher.voucherType}
              </p>
            </div>
          )}

          {approved && inventoryAfter.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" />
                Output Batch Inventory
              </p>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">Batch</th>
                      <th className="text-right px-2 py-1.5 font-medium">Available (KG)</th>
                      <th className="text-right px-2 py-1.5 font-medium">Available (LTR)</th>
                      <th className="text-right px-2 py-1.5 font-medium">Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryAfter.map((b) => (
                      <tr key={b.id} className="border-t border-gray-100">
                        <td className="px-2 py-1.5 font-mono text-gray-900">
                          {b.batchNo}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {b.availableQtyKG}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {b.availableQtyLTR}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {formatCurrency(b.purchasePrice || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {approved && summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm space-y-1">
              <p className="font-medium text-blue-900 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Inventory summary for {summary.name}
              </p>
              <p className="text-blue-800">
                Total stock:{" "}
                <span className="font-mono">{summary.totalStockKG} KG</span> /{" "}
                <span className="font-mono">{summary.totalStockLTR} LTR</span>{" "}
                across {summary.branchCount} branch(es)
              </p>
            </div>
          )}

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

// =====================================================================
// New-manufacture modal — preview, then create
// =====================================================================

function NewManufactureDialog({
  open,
  recipes,
  branches,
  onClose,
  onCreated,
}: {
  open: boolean;
  recipes: ProductRecipe[];
  branches: Branch[];
  onClose: () => void;
  onCreated: (m: ProductManufacture) => void;
}) {
  const { addToast } = useToast();
  const { user } = useAppSelector((state) => state.auth);

  // Approved recipes only — backend /preview rejects others.
  const approvedRecipes = React.useMemo(
    () => recipes.filter((r) => r.status === "APPROVED" || r.status === "LOCKED"),
    [recipes]
  );

  const recipeOptions: DataSelectOption[] = React.useMemo(
    () =>
      approvedRecipes.map((r) => ({
        value: r.id,
        label: r.outputProduct?.name || "—",
        description: `v${r.version} · ${r.items?.length || 0} items · ${r.outputQuantity} ${r.outputUnit}`,
        badge: r.status,
      })),
    [approvedRecipes]
  );

  const branchOptions: DataSelectOption[] = React.useMemo(
    () => branches.map((b) => ({ value: b.id, label: b.name, description: b.code })),
    [branches]
  );

  // Single-branch user: lock to their branch; otherwise require a pick.
  const isSingleBranch = user?.branchAccessType === "SELECTED" && !!user?.branchId;
  const defaultBranchId = isSingleBranch ? user!.branchId! : "";

  const [recipeId, setRecipeId] = React.useState("");
  const [branchId, setBranchId] = React.useState(defaultBranchId);
  const [outputQuantity, setOutputQuantity] = React.useState("");
  const [remarks, setRemarks] = React.useState("");
  const [preview, setPreview] = React.useState<ManufacturePreview | null>(null);
  const [previewing, setPreviewing] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      setRecipeId("");
      setBranchId(defaultBranchId);
      setOutputQuantity("");
      setRemarks("");
      setPreview(null);
    }
  }, [open, defaultBranchId]);

  // If recipe list updates, drop the preview (recipe may have changed)
  React.useEffect(() => {
    setPreview(null);
  }, [recipeId, branchId, outputQuantity]);

  if (!open) return null;

  const selectedRecipe = approvedRecipes.find((r) => r.id === recipeId);

  const canPreview =
    !!recipeId && !!branchId && Number(outputQuantity) > 0;

  const handlePreview = async () => {
    if (!canPreview) return;
    setPreviewing(true);
    setPreview(null);
    try {
      const res = await manufacturingApi.preview({
        recipeId,
        branchId,
        outputQuantity: Number(outputQuantity),
      });
      if (res.success && res.data) {
        setPreview(res.data);
        if (res.data.canManufacture) {
          addToast("Preview loaded — ready to create manufacturing document", "success");
        } else {
          addToast("Stock is insufficient for this output quantity", "error");
        }
      } else {
        addToast(res.message || "Failed to load preview", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load preview", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const handleCreate = async () => {
    if (!preview || !preview.canManufacture) return;
    setCreating(true);
    try {
      const res = await manufacturingApi.createManufacture({
        recipeId,
        branchId,
        outputQuantity: Number(outputQuantity),
        remarks: remarks.trim() || undefined,
      });
      if (res.success && res.data?.manufacture) {
        addToast("Manufacturing document created in DRAFT", "success");
        onCreated(res.data.manufacture);
      } else {
        addToast(res.message || "Failed to create manufacturing document", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to create manufacturing document", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <Factory className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              New Manufacturing
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2 md:col-span-2">
              <Label>Approved Recipe *</Label>
              <DataSelect
                value={recipeId}
                onChange={setRecipeId}
                options={recipeOptions}
                placeholder="Select an approved recipe"
                searchable
                clearable
                disablePortal
              />
              {approvedRecipes.length === 0 && (
                <p className="text-xs text-amber-700">
                  No approved recipes available. Approve a recipe first.
                </p>
              )}
            </div>

            {!isSingleBranch && (
              <div className="space-y-2">
                <Label>Branch *</Label>
                <DataSelect
                  value={branchId}
                  onChange={setBranchId}
                  options={branchOptions}
                  placeholder="Select branch"
                  searchable
                  clearable
                  disablePortal
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Output Quantity *</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={outputQuantity}
                onChange={(e) => setOutputQuantity(e.target.value)}
                placeholder="100"
              />
              {selectedRecipe && (
                <p className="text-xs text-gray-500">
                  Recipe defines 1 batch = {toFiniteNumber(selectedRecipe.outputQuantity)} {selectedRecipe.outputUnit}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mfg-remarks">Remarks</Label>
            <Textarea
              id="mfg-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="e.g., E20 production batch"
            />
          </div>

          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={previewing || creating}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                loading={previewing}
                disabled={!canPreview || previewing || creating}
              >
                Preview Cost & Stock
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                loading={creating}
                disabled={!preview || !preview.canManufacture || creating}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Create DRAFT
              </Button>
            </div>
          </div>

          {/* Preview panel */}
          {preview && (
            <div className="border-t border-gray-200 pt-3 space-y-3">
              {preview.canManufacture ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  All raw materials are available — manufacturing can proceed.
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm space-y-2">
                  <p className="font-medium text-red-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Insufficient stock
                  </p>
                  <ul className="text-red-800 list-disc pl-5 space-y-0.5">
                    {preview.insufficient.map((s, i) => (
                      <li key={i}>
                        Insufficient stock of {s.productName}. Required:{" "}
                        {s.requiredQuantity} {s.unit}, Available: {s.availableQuantity}{" "}
                        {s.unit}, Shortage: {s.shortage} {s.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.allocations.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">
                    FIFO Allocations
                  </p>
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left px-2 py-1.5 font-medium">Material</th>
                          <th className="text-left px-2 py-1.5 font-medium">Batch</th>
                          <th className="text-right px-2 py-1.5 font-medium">Qty</th>
                          <th className="text-right px-2 py-1.5 font-medium">Unit Cost</th>
                          <th className="text-right px-2 py-1.5 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.allocations.map((a, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-2 py-1.5 text-gray-900">
                              {a.productName}
                            </td>
                            <td className="px-2 py-1.5 font-mono text-gray-600">
                              {a.batchNo}
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono">
                              {a.quantity} {a.unit}
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono">
                              {formatCurrency(a.unitCost)}
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono">
                              {formatCurrency(a.totalCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-md p-3 text-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total manufacturing cost</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(preview.totalManufacturingCost)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Unit cost</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(preview.unitManufacturingCost)} / {selectedRecipe?.outputUnit || ""}
                  </p>
                </div>
              </div>

              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                <AlertTriangle className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
                Creating a DRAFT document does not change inventory or
                accounting. Inventory is only impacted on approval.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================================
// Main page
// =====================================================================

export default function ManufacturesPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { permissions, user } = useAppSelector((state) => state.auth);
  const { canView, canWrite } = usePermissions("PRODUCT");

  const [manufactures, setManufactures] = React.useState<ProductManufacture[]>([]);
  const [recipes, setRecipes] = React.useState<ProductRecipe[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ProductManufactureStatus | "">("");

  const [viewing, setViewing] = React.useState<ProductManufacture | null>(null);
  const [viewInventoryBefore, setViewInventoryBefore] = React.useState<AvailableBatch[]>([]);
  const [viewInventoryAfter, setViewInventoryAfter] = React.useState<AvailableBatch[]>([]);
  const [viewSummary, setViewSummary] = React.useState<InventorySummaryRecord | null>(null);
  const [approving, setApproving] = React.useState<ProductManufacture | null>(null);
  const [rejecting, setRejecting] = React.useState<ProductManufacture | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const [newOpen, setNewOpen] = React.useState(false);

  // Effective branch for the current user
  const isSingleBranch = user?.branchAccessType === "SELECTED" && !!user?.branchId;
  const effectiveBranchId = isSingleBranch ? user!.branchId! : undefined;

  // Permission gate
  if (!canView && !hasModulePermission(permissions, "PRODUCT", "VIEW")) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            You do not have permission to view manufacturing documents.
          </CardContent>
        </Card>
      </div>
    );
  }

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const [mfgRes, recipeRes, branchRes] = await Promise.all([
        manufacturingApi.listManufactures(
          statusFilter ? { status: statusFilter } : undefined
        ),
        manufacturingApi.listRecipes({ status: "APPROVED" }),
        branchApi.getActive().catch(() => ({ success: false, message: "", data: undefined })),
      ]);
      if (mfgRes.success && mfgRes.data?.manufactures) {
        setManufactures(mfgRes.data.manufactures);
      } else {
        setManufactures([]);
      }
      if (recipeRes.success && recipeRes.data?.recipes) {
        setRecipes(recipeRes.data.recipes);
      } else {
        setRecipes([]);
      }
      if (branchRes.success && branchRes.data?.branches) {
        setBranches(branchRes.data.branches);
      } else {
        setBranches([]);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load manufacturing data", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, statusFilter]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  // After a DRAFT is created, refresh the list and open its detail view
  const handleCreated = async (m: ProductManufacture) => {
    setNewOpen(false);
    addToast(
      `DRAFT ${m.outputBatchNo} created. Approve to consume raw materials and add finished goods.`,
      "info"
    );
    await loadAll();
    setViewing(m);
    await loadInventoryForView(m);
  };

  // Load inventory (batches + summary) for the detail dialog
  const loadInventoryForView = async (m: ProductManufacture) => {
    if (!m.outputProductId || !m.branchId) {
      setViewInventoryBefore([]);
      setViewInventoryAfter([]);
      setViewSummary(null);
      return;
    }
    try {
      // available batches in the branch for this product
      const batchesRes = await inventoryApi.getAvailableBatches({
        branchId: m.branchId,
        productId: m.outputProductId,
      });
      setViewInventoryAfter(batchesRes.data || []);

      // product summary
      const summaryRes = await inventoryApi.getSummary({
        productId: m.outputProductId,
        limit: 1,
      });
      const rec = summaryRes.data?.data?.[0] || null;
      setViewSummary(rec);
      setViewInventoryBefore([]);
    } catch (err) {
      // non-fatal — UI just shows what we have
      setViewInventoryAfter([]);
      setViewSummary(null);
    }
  };

  const handleApprove = async () => {
    if (!approving) return;
    setActionLoading(true);
    try {
      const res = await manufacturingApi.approveManufacture(approving.id);
      if (res.success && res.data?.manufacture) {
        addToast(
          `Manufacturing ${res.data.manufacture.outputBatchNo} approved. Inventory updated, voucher created.`,
          "success"
        );
        setApproving(null);
        await loadAll();
        setViewing(res.data.manufacture);
        await loadInventoryForView(res.data.manufacture);
      } else {
        addToast(res.message || "Failed to approve manufacturing", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to approve manufacturing", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (remarks: string) => {
    if (!rejecting) return;
    setActionLoading(true);
    try {
      const res = await manufacturingApi.rejectManufacture(rejecting.id, { remarks });
      if (res.success) {
        addToast("Manufacturing rejected", "success");
        setRejecting(null);
        await loadAll();
      } else {
        addToast(res.message || "Failed to reject manufacturing", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to reject manufacturing", "error");
    } finally {
      setActionLoading(false);
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
        m.remarks?.toLowerCase().includes(q) ||
        m.id?.toLowerCase().includes(q)
    );
  }, [manufactures, search]);

  // For the confirm-approve modal we need the preview-cost numbers — pull
  // them from the most-recently-fetched preview stored in the viewed doc,
  // otherwise just use the values the doc already has.
  const previewForApproval: ManufacturePreview | null = React.useMemo(() => {
    if (!approving) return null;
    return {
      recipe: approving.recipe || ({} as ProductRecipe),
      outputQuantity: toFiniteNumber(approving.outputQuantity),
      canManufacture: true,
      allocations: (approving.consumptions || []).map((c) => ({
        productId: c.productId,
        productName: c.productId, // best-effort
        batchId: c.batchId,
        batchNo: c.batchId,
        quantity: toFiniteNumber(c.quantity),
        unit: c.unit,
        unitCost: c.unitCost || 0,
        totalCost: c.totalCost || 0,
      })),
      insufficient: [],
      totalManufacturingCost: approving.totalManufacturingCost || 0,
      unitManufacturingCost: approving.unitManufacturingCost || 0,
    };
  }, [approving]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Button
        variant="ghost"
        className="gap-2 mb-4"
        onClick={() => router.push("/dashboard")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <PageHeader
        title="Manufacturing"
        description="Create and approve manufacturing documents from approved recipes"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadAll} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => router.push("/manufacturing")}>
              <ClipboardList />
              <span className="ml-2">Recipes</span>
            </Button>
            {canWrite && (
              <Button
                onClick={() => setNewOpen(true)}
                disabled={recipes.length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Manufacturing
              </Button>
            )}
          </div>
        }
      />

      <Card className="mt-4">
        <CardContent className="pt-6 space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by batch, product, SKU, or remarks"
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  (e.target.value || "") as ProductManufactureStatus | ""
                )
              }
              className="h-10 border border-gray-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Factory className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm">No manufacturing documents found</p>
              {canWrite && recipes.length > 0 && (
                <Button className="mt-4" onClick={() => setNewOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create one
                </Button>
              )}
              {canWrite && recipes.length === 0 && (
                <p className="text-xs mt-2 text-amber-700">
                  You need at least one APPROVED recipe to create a manufacturing document.
                </p>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Batch</th>
                    <th className="text-left px-3 py-2 font-medium">Output</th>
                    <th className="text-left px-3 py-2 font-medium">Branch</th>
                    <th className="text-right px-3 py-2 font-medium">Qty</th>
                    <th className="text-right px-3 py-2 font-medium">Cost</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Created</th>
                    <th className="text-right px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-gray-900">
                        {m.outputBatchNo}
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">
                          {m.outputProduct?.name || "—"}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {m.outputProduct?.sku || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {branches.find((b) => b.id === m.branchId)?.name ||
                          m.branchId}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700">
                        {toFiniteNumber(m.outputQuantity)} {m.outputUnit}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700">
                        {formatCurrency(m.totalManufacturingCost || 0)}
                      </td>
                      <td className="px-3 py-2">
                        <ManufactureStatusBadge status={m.status} />
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              setViewing(m);
                              await loadInventoryForView(m);
                            }}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canWrite && m.status === "DRAFT" && (
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
                          {m.status === "APPROVED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (m.outputProductId) {
                                  router.push(
                                    `/purchase-sales/new-sale?productId=${m.outputProductId}&batchId=${m.outputBatchId || ""}`
                                  );
                                } else {
                                  router.push("/purchase-sales/new-sale");
                                }
                              }}
                              title="Sell this product"
                              className="text-blue-700 hover:bg-blue-50"
                            >
                              <IndianRupee className="h-4 w-4" />
                            </Button>
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

      <NewManufactureDialog
        open={newOpen}
        recipes={recipes}
        branches={branches}
        onClose={() => setNewOpen(false)}
        onCreated={handleCreated}
      />

      <ConfirmApproveManufactureModal
        open={!!approving}
        manufacture={approving}
        preview={previewForApproval}
        loading={actionLoading}
        onCancel={() => setApproving(null)}
        onConfirm={handleApprove}
      />

      <RejectManufactureModal
        open={!!rejecting}
        manufacture={rejecting}
        loading={actionLoading}
        onCancel={() => setRejecting(null)}
        onConfirm={handleReject}
      />

      <ManufactureDetailModal
        open={!!viewing}
        manufacture={viewing}
        inventoryBefore={viewInventoryBefore}
        inventoryAfter={viewInventoryAfter}
        summary={viewSummary}
        onClose={() => setViewing(null)}
      />

      <ToastContainer />
    </div>
  );
}

// Local icon alias to avoid an extra import statement in the JSX
function ClipboardListIcon() {
  return <ClipboardList className="h-4 w-4" />;
}
