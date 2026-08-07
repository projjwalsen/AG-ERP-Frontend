"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  ClipboardList,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DataSelect, DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { productApi } from "@/app/services/product.service";
import { manufacturingApi } from "@/app/services/manufacturing.service";
import { Product, ProductUnit } from "@/app/types/product";
import {
  CreateRecipePayload,
  RecipeItem,
  toFiniteNumber,
} from "@/app/types/manufacturing";
import { hasModulePermission, usePermissions } from "@/lib/usePermissions";
import { useAppSelector } from "@/app/store/hooks";

interface DraftItem {
  // local-only id for stable React keys
  rowId: string;
  productId: string;
  quantity: string;
  unit: ProductUnit;
}

const DRAFT_ROW: Omit<DraftItem, "rowId"> = {
  productId: "",
  quantity: "",
  unit: "KG",
};

function makeRow(): DraftItem {
  return { ...DRAFT_ROW, rowId: `row-${Math.random().toString(36).slice(2, 9)}` };
}

export default function NewRecipePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { permissions } = useAppSelector((state) => state.auth);
  const { canWrite } = usePermissions("PRODUCT");

  const [products, setProducts] = React.useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = React.useState(false);

  const [outputProductId, setOutputProductId] = React.useState("");
  const [outputQuantity, setOutputQuantity] = React.useState("");
  const [outputUnit, setOutputUnit] = React.useState<ProductUnit>("KG");
  const [remarks, setRemarks] = React.useState("");
  const [items, setItems] = React.useState<DraftItem[]>([makeRow()]);
  const [submitting, setSubmitting] = React.useState(false);

  // Load active products. The manufacturing flow requires that the
  // output product be MANUFACTURED or BOTH. We do that filtering on
  // the client (backend doesn't currently accept a productType filter
  // on /active-list) so the dropdown only shows eligible outputs.
  React.useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    productApi
      .getActive()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data?.products) {
          setProducts(res.data.products);
        } else {
          setProducts([]);
          if (res.message) addToast(res.message, "error");
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        addToast(err?.message || "Failed to load products", "error");
        setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  // Output products: MANUFACTURED or BOTH only. The backend rejects
  // PURCHASED with 400, so we filter on the client to keep that error
  // off the wire.
  const outputOptions: DataSelectOption[] = React.useMemo(() => {
    return products
      .filter(
        (p) => p.productType === "MANUFACTURED" || p.productType === "BOTH"
      )
      .map((p) => ({
        value: p.id,
        label: p.name,
        description: p.sku,
        badge: p.productType,
      }));
  }, [products]);

  // Raw-material products: anything except the selected output. We do
  // not restrict productType — even PURCHASED products can be inputs
  // to a recipe. We disable the currently-selected output so it cannot
  // be picked as its own component.
  const materialOptions: DataSelectOption[] = React.useMemo(() => {
    return products.map((p) => ({
      value: p.id,
      label: p.name,
      description: p.sku,
      badge: p.productType,
      disabled: p.id === outputProductId,
    }));
  }, [products, outputProductId]);

  // Reset invalid output when product list updates
  React.useEffect(() => {
    if (outputProductId && !outputOptions.find((o) => o.value === outputProductId)) {
      setOutputProductId("");
    }
  }, [outputOptions, outputProductId]);

  // Once an output is selected, strip any item rows that picked the
  // same product (or that have an empty productId).
  React.useEffect(() => {
    if (!outputProductId) return;
    setItems((prev) =>
      prev.filter(
        (it) => it.productId && it.productId !== outputProductId
      ).concat(prev.length === 0 || prev[prev.length - 1].productId ? [] : [])
    );
  }, [outputProductId]);

  // =================== Row helpers ===================

  const updateRow = (rowId: string, patch: Partial<DraftItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.rowId === rowId ? { ...it, ...patch } : it))
    );
  };

  const addRow = () => setItems((prev) => [...prev, makeRow()]);

  const removeRow = (rowId: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((it) => it.rowId !== rowId)));
  };

  // =================== Validation ===================

  const errors = React.useMemo(() => {
    const e: Record<string, string> = {};
    if (!outputProductId) e.outputProductId = "Output product is required";
    const q = Number(outputQuantity);
    if (!outputQuantity || !(q > 0)) e.outputQuantity = "Must be greater than 0";
    if (!outputUnit) e.outputUnit = "Output unit is required";

    const validItems = items.filter(
      (it) => it.productId && Number(it.quantity) > 0 && it.unit
    );
    if (validItems.length === 0) e.items = "At least one material item is required";

    // Duplicate material check (frontend mirrors backend uniqueness rule)
    const seen = new Set<string>();
    for (const it of validItems) {
      if (seen.has(it.productId)) {
        e.items = "Duplicate material products are not allowed";
        break;
      }
      seen.add(it.productId);
    }
    return e;
  }, [outputProductId, outputQuantity, outputUnit, items]);

  const isValid = Object.keys(errors).length === 0;

  // =================== Submit ===================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      addToast("Please fix the highlighted errors", "error");
      return;
    }

    const payload: CreateRecipePayload = {
      outputProductId,
      outputQuantity: Number(outputQuantity),
      outputUnit,
      remarks: remarks.trim() || undefined,
      items: items
        .filter((it) => it.productId && Number(it.quantity) > 0 && it.unit)
        .map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unit: it.unit,
        })),
    };

    setSubmitting(true);
    try {
      const res = await manufacturingApi.createRecipe(payload);
      if (res.success) {
        addToast("Recipe created", "success");
        router.push("/manufacturing");
      } else {
        addToast(res.message || "Failed to create recipe", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to create recipe", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // =================== Composition summary ===================

  const outputProduct = products.find((p) => p.id === outputProductId);
  const validItems = items.filter(
    (it) => it.productId && Number(it.quantity) > 0 && it.unit
  );
  const duplicateIds = (() => {
    const seen = new Set<string>();
    const dups = new Set<string>();
    for (const it of validItems) {
      if (seen.has(it.productId)) dups.add(it.productId);
      seen.add(it.productId);
    }
    return dups;
  })();

  // Permission gate — placed AFTER all hook calls so the hook count
  // stays stable across renders while `fetchUserAccess` is in flight.
  if (!canWrite && !hasModulePermission(permissions, "PRODUCT", "WRITE")) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            You do not have permission to create recipes.
          </CardContent>
        </Card>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Button
        variant="ghost"
        className="gap-2 mb-4"
        onClick={() => router.push("/manufacturing")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Recipes
      </Button>

      <h1 className="text-2xl font-bold text-gray-900">Create Recipe</h1>
      <p className="text-gray-500 mt-1">
        Define the bill of materials for a manufactured product
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              Output Product
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Output Product *</Label>
                <DataSelect
                  value={outputProductId}
                  onChange={setOutputProductId}
                  options={outputOptions}
                  placeholder={
                    productsLoading
                      ? "Loading products…"
                      : "Select a MANUFACTURED product"
                  }
                  searchable
                  clearable
                  invalid={!!errors.outputProductId}
                  error={errors.outputProductId}
                  disabled={productsLoading}
                  disablePortal
                />
                <p className="text-xs text-gray-500">
                  Only products with type MANUFACTURED can be recipe
                  outputs.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="outputQuantity">Output Quantity *</Label>
                <Input
                  id="outputQuantity"
                  type="number"
                  step="0.001"
                  value={outputQuantity}
                  onChange={(e) => setOutputQuantity(e.target.value)}
                  placeholder="1"
                  className={
                    errors.outputQuantity ? "border-red-400" : undefined
                  }
                />
                {errors.outputQuantity && (
                  <p className="text-xs text-red-500">{errors.outputQuantity}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="outputUnit">Output Unit *</Label>
                <select
                  id="outputUnit"
                  value={outputUnit}
                  onChange={(e) => setOutputUnit(e.target.value as ProductUnit)}
                  className="h-10 w-full border border-gray-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="KG">KG</option>
                  <option value="LTR">LTR</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="e.g., Blending of BASE OIL and ETHANOL"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-purple-600" />
                Raw Materials
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4 mr-1" />
                Add Material
              </Button>
            </div>

            {/* Available raw-material products — shown above the
                items table so the user can scan the catalogue and
                pick rows directly without having to open the
                per-row dropdown first. The output product (if
                selected) is marked unavailable because a recipe
                cannot contain its own output. */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Raw Material Products
                </p>
                <p className="text-xs text-gray-500">
                  {materialOptions.length} available
                </p>
              </div>
              {productsLoading ? (
                <div className="px-3 py-6 text-center text-sm text-gray-500">
                  Loading products…
                </div>
              ) : materialOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-gray-500">
                  No products available
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">SKU</th>
                        <th className="text-left px-3 py-2 font-medium">Type</th>
                        <th className="text-right px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialOptions.map((opt) => {
                        const isUsed = items.some(
                          (it) => it.productId === opt.value
                        );
                        return (
                          <tr
                            key={opt.value}
                            className="border-t border-gray-100 hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 text-gray-900 font-medium">
                              {opt.label}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-600">
                              {opt.description || "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {opt.badge || "—"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Append a new row pre-filled with
                                  // this product, or fill the first
                                  // empty row.
                                  setItems((prev) => {
                                    const emptyIdx = prev.findIndex(
                                      (it) => !it.productId
                                    );
                                    if (emptyIdx >= 0) {
                                      const next = [...prev];
                                      next[emptyIdx] = {
                                        ...next[emptyIdx],
                                        productId: opt.value,
                                      };
                                      return next;
                                    }
                                    return [
                                      ...prev,
                                      {
                                        ...DRAFT_ROW,
                                        rowId: makeRow().rowId,
                                        productId: opt.value,
                                      },
                                    ];
                                  });
                                }}
                                disabled={!!opt.disabled || isUsed}
                                title={
                                  opt.disabled
                                    ? "Output product cannot be a raw material"
                                    : isUsed
                                    ? "Already added to the recipe"
                                    : "Add to recipe"
                                }
                                className="text-purple-700 hover:bg-purple-50"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {errors.items && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{errors.items}</span>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-[50%]">Product</th>
                    <th className="text-right px-3 py-2 font-medium">Quantity</th>
                    <th className="text-left px-3 py-2 font-medium w-24">Unit</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const isDup = duplicateIds.has(it.productId);
                    const isSelf = it.productId === outputProductId;
                    return (
                      <tr
                        key={it.rowId}
                        className="border-t border-gray-100 align-top"
                      >
                        <td className="px-3 py-2">
                          <DataSelect
                            value={it.productId}
                            onChange={(v) => updateRow(it.rowId, { productId: v })}
                            options={materialOptions}
                            placeholder="Select product"
                            searchable
                            clearable
                            disablePortal
                          />
                          {isSelf && (
                            <p className="text-xs text-red-500 mt-1">
                              Cannot use the output product as its own material.
                            </p>
                          )}
                          {isDup && (
                            <p className="text-xs text-red-500 mt-1">
                              Duplicate material — only one row per product.
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={it.quantity}
                            onChange={(e) =>
                              updateRow(it.rowId, { quantity: e.target.value })
                            }
                            placeholder="0"
                            className="text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={it.unit}
                            onChange={(e) =>
                              updateRow(it.rowId, { unit: e.target.value as ProductUnit })
                            }
                            className="h-10 w-full border border-gray-200 rounded-md px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="KG">KG</option>
                            <option value="LTR">LTR</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRow(it.rowId)}
                            disabled={items.length <= 1}
                            className="text-red-600 hover:bg-red-50"
                            title="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Composition summary */}
        {outputProduct && validItems.length > 0 && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h2 className="text-base font-semibold text-gray-900">
                Composition Summary
              </h2>
              <p className="text-sm text-gray-600">
                To produce{" "}
                <span className="font-medium text-gray-900">
                  {outputQuantity || 1} {outputUnit}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-900">
                  {outputProduct.name}
                </span>
                :
              </p>
              <div className="space-y-1">
                {validItems.map((it) => {
                  const p = products.find((p) => p.id === it.productId);
                  return (
                    <div
                      key={it.rowId}
                      className="flex items-center justify-between text-sm border-b border-gray-100 pb-1"
                    >
                      <span className="text-gray-700">
                        {p?.name || it.productId}
                      </span>
                      <span className="font-mono text-gray-900">
                        {it.quantity} {it.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="info" dot>Draft</Badge>
                <span className="text-xs text-gray-500">
                  Recipe is created in DRAFT status and must be approved before
                  it can be used for manufacturing.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/manufacturing")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={!isValid || submitting}
          >
            <Save className="h-4 w-4 mr-2" />
            Create Recipe
          </Button>
        </div>
      </form>

      <ToastContainer />
    </div>
  );
}
