"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  ClipboardList,
  Eye,
  Search,
  RefreshCcw,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout";
import { formatDate, formatDateTime } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppSelector } from "@/app/store/hooks";
import { manufacturingApi } from "@/app/services/manufacturing.service";
import {
  ProductRecipe,
  ProductRecipeStatus,
  toFiniteNumber,
} from "@/app/types/manufacturing";

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
function RecipeViewModal({
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
            <Badge variant="outline" dot>
              <Clock className="h-3 w-3 mr-1" />
              {recipe.status}
            </Badge>
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
            {recipe.remarks && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase">Remarks</p>
                <p className="text-gray-900 whitespace-pre-line">{recipe.remarks}</p>
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

// ============== APPROVE MODAL ==============
function ApproveModal({
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

// ============== REJECT MODAL ==============
function RejectModal({
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

// ============== MAIN PAGE ==============
export default function PendingRecipesPage() {
  const { addToast } = useToast();
  const { permissions } = useAppSelector((state) => state.auth);

  const canView = hasModulePermission(permissions, "PRODUCT", "VIEW");
  const canWrite = hasModulePermission(permissions, "PRODUCT", "WRITE");

  const [recipes, setRecipes] = React.useState<ProductRecipe[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const [viewing, setViewing] = React.useState<ProductRecipe | null>(null);
  const [approving, setApproving] = React.useState<ProductRecipe | null>(null);
  const [rejecting, setRejecting] = React.useState<ProductRecipe | null>(null);

  const refetchQueue = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await manufacturingApi.listRecipes({ status: "DRAFT" });
      if (res.success && res.data?.recipes) {
        setRecipes(res.data.recipes);
      } else {
        setRecipes([]);
        if (res.message) addToast(res.message, "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load pending recipes", "error");
      setRecipes([]);
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
      const res = await manufacturingApi.approveRecipe(approving.id);
      if (res.success) {
        addToast("Recipe approved successfully", "success");
        setApproving(null);
        await refetchQueue();
      } else {
        addToast(res.message || "Failed to approve recipe", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to approve recipe", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (remarks: string) => {
    if (!rejecting) return;
    setSubmitting(true);
    try {
      const res = await manufacturingApi.rejectRecipe(rejecting.id, { remarks });
      if (res.success) {
        addToast("Recipe rejected", "success");
        setRejecting(null);
        await refetchQueue();
      } else {
        addToast(res.message || "Failed to reject recipe", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to reject recipe", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.outputProduct?.name?.toLowerCase().includes(q) ||
        r.outputProduct?.sku?.toLowerCase().includes(q) ||
        r.remarks?.toLowerCase().includes(q)
    );
  }, [recipes, search]);

  const stats = React.useMemo(() => {
    const total = recipes.length;
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const todayCount = recipes.filter((r) =>
      formatDate(r.createdAt).startsWith(todayPrefix)
    ).length;
    return { total, todayCount };
  }, [recipes]);

  if (!canView) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/manufacturing">
            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
              <ArrowLeft className="h-4 w-4" />
              Back to Recipes
            </Button>
          </Link>
        </div>
        <PageHeader
          title="Pending Recipe Approvals"
          description="Review and approve draft recipes awaiting manager approval"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Manufacturing", href: "/manufacturing" },
            { label: "Recipes", href: "/manufacturing" },
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
        <Link href="/manufacturing">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Recipes
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Pending Recipe Approvals"
        description="Review and approve draft recipes awaiting manager approval"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Manufacturing", href: "/manufacturing" },
          { label: "Recipes", href: "/manufacturing" },
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
          hint="Draft recipes in queue"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Today Pending"
          value={stats.todayCount}
          hint="Created today"
          icon={Calendar}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Approved Today"
          value={stats.total}
          hint="In current queue"
          icon={CheckCircle2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by product, SKU, or remarks…"
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
              <p className="text-sm font-medium text-gray-900">
                Queue is empty
              </p>
              <p className="text-xs text-gray-500 mt-1">
                There are no draft recipes awaiting approval.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Output Product</th>
                    <th className="text-left px-4 py-3 font-medium">Version</th>
                    <th className="text-left px-4 py-3 font-medium">Items</th>
                    <th className="text-left px-4 py-3 font-medium">Output Qty</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {r.outputProduct?.name || "—"}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {r.outputProduct?.sku || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">v{r.version}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono">
                        {toFiniteNumber(r.outputQuantity)} {r.outputUnit}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" dot>
                          <Clock className="h-3 w-3 mr-1" />
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {formatDateTime(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewing(r)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canWrite && (
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

      <RecipeViewModal
        open={!!viewing}
        recipe={viewing}
        onClose={() => setViewing(null)}
      />

      <ApproveModal
        open={!!approving}
        recipe={approving}
        loading={submitting}
        onCancel={() => setApproving(null)}
        onConfirm={handleApprove}
      />

      <RejectModal
        open={!!rejecting}
        recipe={rejecting}
        loading={submitting}
        onCancel={() => setRejecting(null)}
        onConfirm={handleReject}
      />

      <ToastContainer />
    </div>
  );
}
