"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Package, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataSelect, DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { productApi, CreateProductRecipePayload } from "@/app/services/product.service";
import { manufacturingApi } from "@/app/services/manufacturing.service";
import { Product, ProductUnit } from "@/app/types/product";

interface RecipeDraftItem {
  rowId: string;
  productId: string;
  quantity: string;
  unit: ProductUnit;
}

const EMPTY_ROW: Omit<RecipeDraftItem, "rowId"> = {
  productId: "",
  quantity: "",
  unit: "KG",
};

function makeRow(): RecipeDraftItem {
  return { ...EMPTY_ROW, rowId: `r-${Math.random().toString(36).slice(2,9)}` };
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams() as { productId?: string };
  const productId = params?.productId || "";
  const { addToast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [product, setProduct] = React.useState<Product | null>(null);
  const [productsList, setProductsList] = React.useState<Product[]>([]);

  // form
  const [form, setForm] = React.useState<any>({});

  // recipe editor state
  const [outputQuantity, setOutputQuantity] = React.useState("");
  const [outputUnit, setOutputUnit] = React.useState<ProductUnit>("KG");
  const [remarks, setRemarks] = React.useState("");
  const [items, setItems] = React.useState<RecipeDraftItem[]>([makeRow()]);

  React.useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      if (!productId) return;

      const res = await productApi.getById(productId);
      if (cancelled) return;

      if (res.success && res.data?.product) {
        setProduct(res.data.product);
        setForm({
          name: res.data.product.name,
          sku: res.data.product.sku,
          category: res.data.product.category ?? "ALL",
          description: res.data.product.description || "",
          disclaimer: res.data.product.disclaimer || "",
          hsnNo: res.data.product.hsnNo || "",
          applicableGST: res.data.product.applicableGST,
          baseUnit: res.data.product.baseUnit,
          operationalUnit: res.data.product.operationalUnit,
          density: res.data.product.density,
          minimumStockKG: res.data.product.minimumStockKG,
          sellPricePerUnit: res.data.product.sellPricePerUnit,
          productType: res.data.product.productType,
        });

        // prefill recipe editor from first recipe output if present
        const first = res.data.product.recipeOutputs?.[0];
        if (first) {
          setOutputQuantity(String(first.outputQuantity));
          setOutputUnit(first.outputUnit as ProductUnit);
          setRemarks(first.remarks || "");
          setItems(
            (first.items || []).map((it) => ({
              rowId: `r-${Math.random().toString(36).slice(2,9)}`,
              productId: it.productId,
              quantity: String(it.quantity),
              unit: it.unit as ProductUnit,
            })) || [makeRow()]
          );
        }
      }
    };

    loadProduct();

    productApi.getActive().then((res) => {
      if (res.success && res.data?.products) setProductsList(res.data.products);
    });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const updateItem = (rowId: string, patch: Partial<RecipeDraftItem>) => {
    setItems((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  };
  const addItem = () => setItems((p) => [...p, makeRow()]);
  const removeItem = (rowId: string) => setItems((p) => (p.length <= 1 ? p : p.filter((r) => r.rowId !== rowId)));

  const materialOptions = React.useMemo(() => {
    return productsList.map<DataSelectOption>((p) => ({ value: p.id, label: p.name, description: p.density ? `Density: ${p.density} kg/L` : undefined, badge: p.productType }));
  }, [productsList]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!product) return;
    setLoading(true);
    try {
      // update product fields
      const payload: any = { ...form };
      await productApi.update(product.id, payload);

      // if product is manufactured and recipe items present, create recipe (new version)
      if ((form.productType === "MANUFACTURED" || form.productType === "BOTH") && items.some(i => i.productId)) {
        const recipePayload: CreateProductRecipePayload = {
          outputQuantity: Number(outputQuantity) || 1,
          outputUnit: outputUnit,
          remarks: remarks.trim() || undefined,
          items: items
            .filter((it) => it.productId && Number(it.quantity) > 0)
            .map((it) => ({ productId: it.productId, quantity: Number(it.quantity), unit: it.unit })),
        };
        // set outputProductId implicitly via backend contract: manufacturingApi expects outputProductId in CreateRecipePayload
        // manufacturingApi.createRecipe accepts outputProductId field (see types in manufacturing types). We'll call it with outputProductId = product.id
        await manufacturingApi.createRecipe({ ...(recipePayload as any), outputProductId: product.id });
      }

      addToast("Product updated", "success");
      router.push("/inventory");
    } catch (err: any) {
      addToast(err?.message || "Failed to update product", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">Loading product…</CardContent>
        </Card>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Button variant="ghost" className="gap-2 mb-4" onClick={() => router.push("/inventory")}>
        <ArrowLeft className="h-4 w-4" />
        Back to Inventory
      </Button>

      <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
      <p className="text-gray-500 mt-1">Edit product fields and recipe (for manufactured products)</p>

      <form onSubmit={handleSave} className="mt-6 space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input value={form.sku || ""} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} required className="font-mono uppercase" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GST %</Label>
                <Input type="number" value={form.applicableGST ?? ""} onChange={(e) => setForm({ ...form, applicableGST: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div className="space-y-2">
                <Label>Sell Price *</Label>
                <Input type="number" value={form.sellPricePerUnit || ""} onChange={(e) => setForm({ ...form, sellPricePerUnit: Number(e.target.value) })} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Unit</Label>
                <select value={form.baseUnit || "KG"} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })} className="h-10 w-full border border-gray-200 rounded-md px-3 text-sm bg-white">
                  <option value="KG">KG</option>
                  <option value="LTR">LTR</option>
                  <option value="MT">MT</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Operational Unit</Label>
                <select value={form.operationalUnit || "KG"} onChange={(e) => setForm({ ...form, operationalUnit: e.target.value })} className="h-10 w-full border border-gray-200 rounded-md px-3 text-sm bg-white">
                  <option value="KG">KG</option>
                  <option value="LTR">LTR</option>
                  <option value="MT">MT</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Density (kg/L)</Label>
              <Input type="number" step="0.01" value={form.density ?? ""} onChange={(e) => setForm({ ...form, density: e.target.value ? Number(e.target.value) : undefined })} />
            </div>

            <div className="space-y-2">
              <Label>Minimum Stock (KG)</Label>
              <Input type="number" value={form.minimumStockKG ?? ""} onChange={(e) => setForm({ ...form, minimumStockKG: e.target.value ? Number(e.target.value) : undefined })} />
            </div>

            {(form.productType === "MANUFACTURED" || form.productType === "BOTH") && (
              <div className="mt-2">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Package className="h-4 w-4 text-purple-600" />Composition</h2>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2 md:col-span-1">
                      <Label>Output Quantity</Label>
                      <Input type="number" step="0.001" value={outputQuantity} onChange={(e) => setOutputQuantity(e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <Label>Output Unit</Label>
                      <select value={outputUnit} onChange={(e) => setOutputUnit(e.target.value as ProductUnit)} className="h-10 w-full border border-gray-200 rounded-md px-3 text-sm bg-white">
                        <option value="KG">KG</option>
                        <option value="LTR">LTR</option>
                        <option value="MT">MT</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <Label>Remarks</Label>
                      <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </div>
                  </div>

                  {items.map((it, idx) => (
                    <div key={it.rowId} className="grid grid-cols-1 md:grid-cols-[1.5fr_0.8fr_0.8fr_auto] gap-3 bg-white p-3 rounded-lg border border-gray-200">
                      <div>
                        <Label>Material</Label>
                        <DataSelect value={it.productId} onChange={(v) => updateItem(it.rowId, { productId: v })} options={materialOptions} placeholder="Select material" searchable clearable disablePortal />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input type="number" step="0.001" value={it.quantity} onChange={(e) => updateItem(it.rowId, { quantity: e.target.value })} />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <select value={it.unit} onChange={(e) => updateItem(it.rowId, { unit: e.target.value as ProductUnit })} className="h-10 w-full border border-gray-200 rounded-md px-3 text-sm bg-white">
                          <option value="KG">KG</option>
                          <option value="LTR">LTR</option>
                          <option value="MT">MT</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(it.rowId)} disabled={items.length <= 1} className="h-10 w-10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div>
                    <Button type="button" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1"/>Add Material</Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => router.push("/inventory")}>Cancel</Button>
              <Button type="submit" loading={loading}>Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <ToastContainer />
    </div>
  );
}
