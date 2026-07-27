"use client";

import * as React from "react";
import { Package, ArrowLeft, Plus, Trash2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { productApi, CreateProductPayload, CreateProductRecipePayload } from "@/app/services/product.service";
import { Product, ProductType, ProductUnit } from "@/app/types/product";
import { DataSelect, DataSelectOption } from "@/components/ui/data-select";
import { useRouter } from "next/navigation";

// The product category is not user-selectable — every create payload
// sends the "ALL" enum so backend listing matches regardless of which
// category the user has active.
const DEFAULT_CATEGORY = "ALL";

// Both the base unit and the operational unit are locked to "KG" on
// create — they are shown read-only so the user can see the values
// going into the payload, but cannot change them. The inventory list
// page renders the unit column as "KG" only, so changing this here
// would just create inconsistency downstream.
const FIXED_UNIT = "KG" as const;

// Default product type. Backend defaults new products to PURCHASED
// when omitted; we send it explicitly so the column is always
// present in the create payload.
const DEFAULT_PRODUCT_TYPE: ProductType = "PURCHASED";

const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string; description: string }[] = [
  { value: "PURCHASED", label: "Purchased", description: "Bought from vendors only" },
  { value: "MANUFACTURED", label: "Manufactured", description: "Produced in-house from a recipe" },
  // { value: "BOTH", label: "Both", description: "Can be purchased and manufactured" },
];

interface RecipeDraftItem {
  rowId: string;
  productId: string;
  quantity: string;
  unit: ProductUnit;
}

const RECIPE_DRAFT_ROW: Omit<RecipeDraftItem, "rowId"> = {
  productId: "",
  quantity: "",
  unit: "KG",
};

function makeRecipeRow(): RecipeDraftItem {
  return { ...RECIPE_DRAFT_ROW, rowId: `recipe-row-${Math.random().toString(36).slice(2, 9)}` };
}

export default function NewProductPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [recipeProducts, setRecipeProducts] = React.useState<Product[]>([]);
  const [recipeOutputQuantity, setRecipeOutputQuantity] = React.useState("1");
  const [recipeOutputUnit, setRecipeOutputUnit] = React.useState<ProductUnit>("KG");
  const [recipeRemarks, setRecipeRemarks] = React.useState("");
  const [recipeItems, setRecipeItems] = React.useState<RecipeDraftItem[]>([makeRecipeRow()]);

  const [form, setForm] = React.useState<CreateProductPayload>({
    name: "",
    sku: "",
    category: DEFAULT_CATEGORY,
    description: "",
    disclaimer: "",
    hsnNo: "",
    applicableGST: undefined,
    baseUnit: FIXED_UNIT,
    density: undefined,
    operationalUnit: FIXED_UNIT,
    minimumStockKG: undefined,
    sellPricePerUnit: 0,
    productType: DEFAULT_PRODUCT_TYPE,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.category) {
      addToast("Name, SKU, and category are required", "error");
      return;
    }
    if (!form.sellPricePerUnit || form.sellPricePerUnit <= 0) {
      addToast("Sell price must be greater than 0", "error");
      return;
    }
    if (!form.productType) {
      addToast("Product type is required", "error");
      return;
    }
    if (form.productType === "MANUFACTURED" && Object.keys(recipeErrors).length > 0) {
      addToast("Please fix the composition details before creating the product", "error");
      return;
    }
    setShowConfirm(true);
  };

  // Build the product-type options for the DataSelect. Kept memoized so
  // the dropdown doesn't re-derive on every keystroke.
  const productTypeOptions: DataSelectOption[] = React.useMemo(
    () =>
      PRODUCT_TYPE_OPTIONS.map((opt) => ({
        value: opt.value,
        label: opt.label,
        description: opt.description,
      })),
    []
  );

  React.useEffect(() => {
    let cancelled = false;
    productApi
      .getActive()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data?.products) {
          setRecipeProducts(res.data.products);
        } else {
          setRecipeProducts([]);
        }
      })
      .catch(() => {
        if (!cancelled) setRecipeProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateRecipeRow = (rowId: string, patch: Partial<RecipeDraftItem>) => {
    setRecipeItems((prev) => prev.map((item) => (item.rowId === rowId ? { ...item, ...patch } : item)));
  };

  const addRecipeRow = () => setRecipeItems((prev) => [...prev, makeRecipeRow()]);

  const removeRecipeRow = (rowId: string) => {
    setRecipeItems((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.rowId !== rowId)));
  };

  const recipeErrors = React.useMemo(() => {
    const errors: Record<string, string> = {};
    const outputQuantity = Number(recipeOutputQuantity);
    if (!recipeOutputQuantity || !(outputQuantity > 0)) {
      errors.recipeOutputQuantity = "Must be greater than 0";
    }

    const validItems = recipeItems.filter((item) => item.productId && Number(item.quantity) > 0 && item.unit);
    if (validItems.length === 0) {
      errors.recipeItems = "At least one material is required";
    }

    const seen = new Set<string>();
    for (const item of validItems) {
      if (seen.has(item.productId)) {
        errors.recipeItems = "Duplicate materials are not allowed";
        break;
      }
      seen.add(item.productId);
    }

    return errors;
  }, [recipeItems, recipeOutputQuantity]);

  const isRecipeValid = Object.keys(recipeErrors).length === 0;

  const handleConfirmCreate = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const recipePayload: CreateProductRecipePayload | undefined =
        form.productType === "MANUFACTURED"
          ? {
              outputQuantity: Number(recipeOutputQuantity),
              outputUnit: recipeOutputUnit,
              remarks: recipeRemarks.trim() || undefined,
              items: recipeItems
                .filter((item) => item.productId && Number(item.quantity) > 0 && item.unit)
                .map((item) => ({
                  productId: item.productId,
                  quantity: Number(item.quantity),
                  unit: item.unit,
                })),
            }
          : undefined;

      const payload: CreateProductPayload = {
        ...form,
        ...(recipePayload ? { recipe: recipePayload } : {}),
      };

      const response = await productApi.create(payload);
      if (response && response.success) {
        setLoading(false);
        addToast("Product created successfully", "success");
        router.push("/inventory");
      } else {
        addToast(response?.message || "Failed to create product", "error");
        setLoading(false);
      }
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === "object" && "response" in err &&
        err.response && typeof err.response === "object" && "data" in err.response &&
        err.response.data && typeof err.response.data === "object" && "message" in err.response.data
          ? String(err.response.data.message)
          : err instanceof Error
            ? err.message
            : "Failed to create product";
      addToast(errorMsg, "error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="gap-2 mb-4"
          onClick={() => router.push("/inventory")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
        <p className="text-gray-500 mt-1">Create a new product for inventory management</p>
      </div>

      <Card className="max-w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Product Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Motor Oil 4T"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                  className="font-mono uppercase"
                  placeholder="MOTOR_OIL_4T"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category is sent as a comma-separated list of ALL
                  categories so backend listing matches every category.
                  Hidden from the user; no UI to pick. */}
              <input type="hidden" name="category" value={form.category} />
              <div className="space-y-2">
                <Label htmlFor="hsnNo">HSN Number</Label>
                <Input
                  id="hsnNo"
                  value={form.hsnNo || ""}
                  onChange={(e) => setForm({ ...form, hsnNo: e.target.value })}
                  className="font-mono"
                  placeholder="27101910"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the product"
              />
            </div>

            {/* Product type — drives whether this product should include a
                composition section during create. Purchased products skip it. */}
            <div className="space-y-2">
              <Label htmlFor="productType">Product Type *</Label>
              <DataSelect
                id="productType"
                value={form.productType || DEFAULT_PRODUCT_TYPE}
                onChange={(value) =>
                  setForm({ ...form, productType: value as ProductType })
                }
                options={productTypeOptions}
                placeholder="Select product type"
                required
                disablePortal
              />
              <p className="text-xs text-gray-500">
                Choose <span className="font-medium">Manufactured</span> if this product will
                be produced from a composition. <span className="font-medium">Purchased</span>{" "}
                means it can only be bought from vendors.
              </p>
            </div>

            {(form.productType === "MANUFACTURED" || form.productType === "BOTH") && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Composition</h3>
                    <p className="text-xs text-gray-500">This will be sent with the product create request.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addRecipeRow}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Material
                  </Button>
                </div>

                {recipeItems.map((item, index) => {
                  const materialOptions = recipeProducts
                    .filter((product) => product.id !== form.sku)
                    .map((product) => ({
                      value: product.id,
                      label: product.name,
                      description: product.sku,
                      badge: product.productType,
                    }));

                  return (
                    <div key={item.rowId} className="grid grid-cols-1 md:grid-cols-[1.3fr_0.8fr_0.8fr_auto] gap-3 rounded-lg border border-gray-200 bg-white p-3">
                      <div className="space-y-2">
                        <Label>Material {index + 1} *</Label>
                        <DataSelect
                          value={item.productId}
                          onChange={(value) => updateRecipeRow(item.rowId, { productId: value })}
                          options={materialOptions}
                          placeholder="Select material"
                          searchable
                          clearable
                          disablePortal
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => updateRecipeRow(item.rowId, { quantity: e.target.value })}
                          placeholder="10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateRecipeRow(item.rowId, { unit: e.target.value as ProductUnit })}
                          className="h-10 w-full border border-gray-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="KG">KG</option>
                          <option value="LTR">LTR</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRecipeRow(item.rowId)}
                          disabled={recipeItems.length <= 1}
                          className="h-10 w-10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {recipeErrors.recipeItems && (
                  <p className="text-xs text-red-500">{recipeErrors.recipeItems}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipeOutputQuantity">Output Quantity *</Label>
                    <Input
                      id="recipeOutputQuantity"
                      type="number"
                      step="0.001"
                      value={recipeOutputQuantity}
                      onChange={(e) => setRecipeOutputQuantity(e.target.value)}
                      placeholder="1"
                    />
                    {recipeErrors.recipeOutputQuantity && (
                      <p className="text-xs text-red-500">{recipeErrors.recipeOutputQuantity}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipeOutputUnit">Output Unit *</Label>
                    <select
                      id="recipeOutputUnit"
                      value={recipeOutputUnit}
                      onChange={(e) => setRecipeOutputUnit(e.target.value as ProductUnit)}
                      className="h-10 w-full border border-gray-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="KG">KG</option>
                      <option value="LTR">LTR</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipeRemarks">Remarks</Label>
                  <Textarea
                    id="recipeRemarks"
                    value={recipeRemarks}
                    onChange={(e) => setRecipeRemarks(e.target.value)}
                    rows={2}
                    placeholder="e.g., Blending of BASE OIL and ETHANOL"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="disclaimer">Disclaimer</Label>
              <Textarea
                id="disclaimer"
                value={form.disclaimer || ""}
                onChange={(e) => setForm({ ...form, disclaimer: e.target.value })}
                placeholder="e.g., Keep away from direct sunlight and open flame"
                rows={3}
              />
              <p className="text-xs text-gray-500">
                Short note shown alongside the product (safety, storage, or handling info).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicableGST">GST %</Label>
                <Input
                  id="applicableGST"
                  type="number"
                  value={form.applicableGST ?? ""}
                  onChange={(e) => setForm({ ...form, applicableGST: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="18"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellPricePerUnit">Sell Price *</Label>
                <Input
                  id="sellPricePerUnit"
                  type="number"
                  value={form.sellPricePerUnit || ""}
                  onChange={(e) => setForm({ ...form, sellPricePerUnit: Number(e.target.value) })}
                  placeholder="100"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Base Unit — read-only. The form payload always sends
                  "KG" so the inventory list view (which displays a
                  single "Unit (KG)" column) stays consistent. A hidden
                  input keeps the value in the form state. */}
              <div className="space-y-2">
                <Label htmlFor="baseUnit">Base Unit</Label>
                <Input
                  id="baseUnit"
                  value={form.baseUnit}
                  readOnly
                  disabled
                  className="bg-gray-50 text-gray-600 cursor-not-allowed font-mono"
                  title="Locked to KG — see inventory list unit column"
                />
              </div>
              {/* Operational Unit — also locked to KG for the same
                  reason as Base Unit. Density becomes irrelevant when
                  both units are KG, but the field is kept below for
                  backward compat with the backend schema. */}
              <div className="space-y-2">
                <Label htmlFor="operationalUnit">Operational Unit</Label>
                <Input
                  id="operationalUnit"
                  value={form.operationalUnit}
                  readOnly
                  disabled
                  className="bg-gray-50 text-gray-600 cursor-not-allowed font-mono"
                  title="Locked to KG — see inventory list unit column"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="density">Density (kg/L)</Label>
              <Input
                id="density"
                type="number"
                step="0.01"
                value={form.density ?? ""}
                onChange={(e) => setForm({ ...form, density: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0.85"
              />
              <p className="text-xs text-gray-500">Required for unit conversion</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumStockKG">Stock Threshold (KG)</Label>
              <Input
                id="minimumStockKG"
                type="number"
                value={form.minimumStockKG ?? ""}
                onChange={(e) => setForm({ ...form, minimumStockKG: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="100"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.push("/inventory")}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Product
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
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
                <h3 className="text-lg font-semibold text-gray-900">Confirm Create Product</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to create product{" "}
                <span className="font-semibold text-gray-900">{form.name}</span>
                {form.productType && (
                  <>
                    {" "}as{" "}
                    <span className="font-semibold text-gray-900">
                      {PRODUCT_TYPE_OPTIONS.find((o) => o.value === form.productType)?.label ||
                        form.productType}
                    </span>
                  </>
                )}
                ?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button onClick={handleConfirmCreate} loading={loading}>
                  Yes, Create
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