"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Factory,
  Plus,
  RefreshCcw,
  Eye,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout";
import { formatDateTime } from "@/lib/utils";
import { hasModulePermission, usePermissions } from "@/lib/usePermissions";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppSelector } from "@/app/store/hooks";
import { manufacturingApi } from "@/app/services/manufacturing.service";
import {
  ProductRecipe,
  ProductRecipeStatus,
  toFiniteNumber,
} from "@/app/types/manufacturing";

// =====================================================================
// Status badge helper — shared between recipe + manufacture pages
// =====================================================================

function StatusBadge({ status }: { status: ProductRecipeStatus | string }) {
  const config: Record<string, { variant: "default" | "success" | "warning" | "error" | "secondary" | "info" | "purple" | "outline"; icon: React.ElementType; label: string }> = {
    DRAFT: { variant: "outline", icon: Clock, label: "Draft" },
    APPROVED: { variant: "success", icon: CheckCircle2, label: "Approved" },
    LOCKED: { variant: "secondary", icon: Lock, label: "Locked" },
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
// Confirm-approve modal
// =====================================================================

function ConfirmApproveRecipeModal({
  open,
  recipe,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  recipe: ProductRecipe | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || !recipe) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-full">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Approve Recipe</h3>
          </div>
          <p className="text-gray-600 mb-2">
            Approve recipe for{" "}
            <span className="font-semibold text-gray-900">
              {recipe.outputProduct?.name || "—"}
            </span>{" "}
            (v{recipe.version})?
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Approving locks any other approved recipe for the same product and
            makes this the active production recipe.
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

// =====================================================================
// Reject modal
// =====================================================================

function RejectRecipeModal({
  open,
  recipe,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  recipe: ProductRecipe | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = React.useState("");

  React.useEffect(() => {
    if (open) setRemarks("");
  }, [open, recipe?.id]);

  if (!open || !recipe) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Reject Recipe</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Reject recipe for{" "}
            <span className="font-semibold text-gray-900">
              {recipe.outputProduct?.name || "—"}
            </span>
            ?
          </p>
          <div className="space-y-2 mb-4">
            <Label htmlFor="recipe-reject-remarks">Reason for rejection</Label>
            <Textarea
              id="recipe-reject-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="e.g., Please correct the ethanol quantity"
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
// Detail dialog
// =====================================================================

function RecipeDetailModal({
  open,
  recipe,
  onClose,
}: {
  open: boolean;
  recipe: ProductRecipe | null;
  onClose: () => void;
}) {
  if (!open || !recipe) return null;

  const totalItems = recipe.items?.length || 0;
  const totalQuantity = (recipe.items || []).reduce(
    (acc, it) => acc + toFiniteNumber(it.quantity),
    0
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {recipe.outputProduct?.name || "Recipe"} — v{recipe.version}
              </h3>
              <p className="text-sm text-gray-500">
                SKU: {recipe.outputProduct?.sku || "—"}
              </p>
            </div>
            <StatusBadge status={recipe.status} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase">Output</p>
              <p className="font-medium text-gray-900">
                {toFiniteNumber(recipe.outputQuantity)} {recipe.outputUnit}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Items</p>
              <p className="font-medium text-gray-900">{totalItems}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Created</p>
              <p className="text-gray-900">{formatDateTime(recipe.createdAt)}</p>
            </div>
            {recipe.approvedAt && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Approved</p>
                <p className="text-gray-900">{formatDateTime(recipe.approvedAt)}</p>
              </div>
            )}
            {recipe.remarks && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase">Remarks</p>
                <p className="text-gray-900 whitespace-pre-line">
                  {recipe.remarks}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">
              Composition ({totalItems} item{totalItems !== 1 ? "s" : ""})
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Material</th>
                    <th className="text-right px-3 py-2 font-medium">Quantity</th>
                    <th className="text-left px-3 py-2 font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {(recipe.items || []).map((it) => (
                    <tr key={it.id || it.productId} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-900">
                        {it.product?.name || it.productId}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {toFiniteNumber(it.quantity)}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{it.unit}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-3 py-2 text-gray-600 font-medium">
                      Total raw material
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium text-gray-900">
                      {totalQuantity.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-gray-500">mixed</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

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
// Main page
// =====================================================================

export default function ManufacturingRecipesPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { permissions } = useAppSelector((state) => state.auth);
  const { canView, canWrite } = usePermissions("PRODUCT");

  const [recipes, setRecipes] = React.useState<ProductRecipe[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ProductRecipeStatus | "">("");

  const [viewing, setViewing] = React.useState<ProductRecipe | null>(null);
  const [approving, setApproving] = React.useState<ProductRecipe | null>(null);
  const [rejecting, setRejecting] = React.useState<ProductRecipe | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const loadRecipes = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await manufacturingApi.listRecipes(
        statusFilter ? { status: statusFilter } : undefined
      );
      if (res.success && res.data?.recipes) {
        setRecipes(res.data.recipes);
      } else {
        setRecipes([]);
        if (res.message) addToast(res.message, "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load recipes", "error");
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [addToast, statusFilter]);

  React.useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleApprove = async () => {
    if (!approving) return;
    setActionLoading(true);
    try {
      const res = await manufacturingApi.approveRecipe(approving.id);
      if (res.success) {
        addToast("Recipe approved successfully", "success");
        setApproving(null);
        await loadRecipes();
      } else {
        addToast(res.message || "Failed to approve recipe", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to approve recipe", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (remarks: string) => {
    if (!rejecting) return;
    setActionLoading(true);
    try {
      const res = await manufacturingApi.rejectRecipe(rejecting.id, { remarks });
      if (res.success) {
        addToast("Recipe rejected", "success");
        setRejecting(null);
        await loadRecipes();
      } else {
        addToast(res.message || "Failed to reject recipe", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to reject recipe", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.outputProduct?.name?.toLowerCase().includes(q) ||
        r.outputProduct?.sku?.toLowerCase().includes(q) ||
        r.remarks?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q)
    );
  }, [recipes, search]);

  // Permission gate — read-only when no PRODUCT:VIEW
  if (!canView && !hasModulePermission(permissions, "PRODUCT", "VIEW")) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            You do not have permission to view manufacturing recipes.
          </CardContent>
        </Card>
      </div>
    );
  }

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
        title="Manufacturing Recipes"
        description="Manage recipes (Bill of Materials) for manufactured products"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadRecipes} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/manufacturing/manufactures")}
            >
              <Factory className="h-4 w-4 mr-2" />
              Manufactures
            </Button>
            {canWrite && (
              <Button onClick={() => router.push("/manufacturing/recipes/new")}>
                <Plus className="h-4 w-4 mr-2" />
                New Recipe
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
                placeholder="Search by product, SKU, or remarks"
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter((e.target.value || "") as ProductRecipeStatus | "")
              }
              className="h-10 border border-gray-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="LOCKED">Locked</option>
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
              <ClipboardList className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm">No recipes found</p>
              {canWrite && (
                <Button
                  className="mt-4"
                  onClick={() => router.push("/manufacturing/recipes/new")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first recipe
                </Button>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Output Product</th>
                    <th className="text-left px-3 py-2 font-medium">Version</th>
                    <th className="text-left px-3 py-2 font-medium">Items</th>
                    <th className="text-left px-3 py-2 font-medium">Output Qty</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Created</th>
                    <th className="text-right px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">
                          {r.outputProduct?.name || "—"}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {r.outputProduct?.sku || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-gray-700">v{r.version}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {r.items?.length || 0}
                      </td>
                      <td className="px-3 py-2 text-gray-700 font-mono">
                        {toFiniteNumber(r.outputQuantity)} {r.outputUnit}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">
                        {formatDateTime(r.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewing(r)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canWrite && r.status === "DRAFT" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setApproving(r)}
                                title="Approve"
                                className="text-green-700 hover:bg-green-50"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRejecting(r)}
                                title="Reject"
                                className="text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {r.status !== "DRAFT" && (
                            <span
                              className="text-xs text-gray-400 px-2"
                              title="Approved/locked recipes cannot be modified"
                            >
                              locked
                            </span>
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

      <ConfirmApproveRecipeModal
        open={!!approving}
        recipe={approving}
        loading={actionLoading}
        onCancel={() => setApproving(null)}
        onConfirm={handleApprove}
      />

      <RejectRecipeModal
        open={!!rejecting}
        recipe={rejecting}
        loading={actionLoading}
        onCancel={() => setRejecting(null)}
        onConfirm={handleReject}
      />

      <RecipeDetailModal
        open={!!viewing}
        recipe={viewing}
        onClose={() => setViewing(null)}
      />

      <ToastContainer />
    </div>
  );
}
