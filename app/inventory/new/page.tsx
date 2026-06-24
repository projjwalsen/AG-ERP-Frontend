"use client";

import * as React from "react";
import { Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { productApi, CreateProductPayload } from "@/app/services/product.service";
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

export default function NewProductPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const [form, setForm] = React.useState<CreateProductPayload>({
    name: "",
    sku: "",
    category: DEFAULT_CATEGORY,
    description: "",
    hsnNo: "",
    applicableGST: undefined,
    baseUnit: FIXED_UNIT,
    density: undefined,
    operationalUnit: FIXED_UNIT,
    minimumStockKG: undefined,
    sellPricePerUnit: 0,
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
    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const response = await productApi.create(form);
      if (response && response.success) {
        addToast("Product created successfully", "success");
        router.push("/inventory");
      } else {
        addToast(response?.message || "Failed to create product", "error");
        setLoading(false);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to create product";
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
                Are you sure you want to create product <span className="font-semibold text-gray-900">{form.name}</span>?
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