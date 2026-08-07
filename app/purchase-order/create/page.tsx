"use client";

import * as React from "react";
import { ArrowLeft, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataSelect, type DataSelectOption } from "@/components/ui/data-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { useAppDispatch } from "@/app/store/hooks";
import { createPurchaseOrder } from "@/app/store/purchaseOrdersSlice";
import { agencyApi } from "@/app/services/agency.service";
import { branchApi } from "@/app/services/branch.service";
import { productApi } from "@/app/services/product.service";
import type { Agency } from "@/app/types/agency";
import type { Branch } from "@/app/types/branch";
import type { Product, ProductUnit } from "@/app/types/product";
import { formatCurrency } from "@/lib/utils";

interface PurchaseOrderFormItem {
  id: string;
  productId: string;
  quantity: number;
  unit: ProductUnit;
  purchasePrice: number;
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    agencyId: "",
    branchId: "",
    remarks: "",
  });
  const [items, setItems] = React.useState<PurchaseOrderFormItem[]>([
    { id: "1", productId: "", quantity: 0, unit: "KG", purchasePrice: 0 },
  ]);

  React.useEffect(() => {
    const fetchFormData = async () => {
      setLoading(true);
      try {
        const [branchesRes, agenciesRes, productsRes] = await Promise.all([
          branchApi.getActive(),
          agencyApi.getAll(),
          productApi.getActive(),
        ]);

        if (branchesRes.success && branchesRes.data) setBranches(branchesRes.data.branches || []);
        if (agenciesRes.success && agenciesRes.data) {
          setAgencies(
            (agenciesRes.data.agencies || []).filter(
              (agency: Agency) => agency.type === "VENDOR" || agency.type === "BOTH"
            )
          );
        }
        if (productsRes.success && productsRes.data) {
          setProducts(Array.isArray(productsRes.data.products) ? productsRes.data.products : []);
        }
      } catch (error: unknown) {
        addToast(error instanceof Error ? error.message : "Failed to load form data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [addToast]);

  const handleAddItem = () => {
    const nextId = String(Math.max(...items.map((item) => Number(item.id) || 0)) + 1);
    setItems([...items, { id: nextId, productId: "", quantity: 0, unit: "KG", purchasePrice: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      addToast("At least one item is required", "error");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = <K extends keyof PurchaseOrderFormItem>(
    id: string,
    field: K,
    value: PurchaseOrderFormItem[K]
  ) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const subtotal = React.useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.purchasePrice || 0), 0),
    [items]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.agencyId || !formData.branchId) {
      addToast("Please select vendor and branch", "error");
      return;
    }

    const validItems = items.filter((item) => item.productId && item.quantity > 0 && item.purchasePrice >= 0);
    if (!validItems.length) {
      addToast("Please add at least one valid item", "error");
      return;
    }

    const productIds = validItems.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      addToast("Same product cannot be added twice in one purchase order", "error");
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(
        createPurchaseOrder({
          agencyId: formData.agencyId,
          branchId: formData.branchId,
          remarks: formData.remarks.trim() || undefined,
          items: validItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unit: item.unit,
            purchasePrice: Number(item.purchasePrice),
          })),
        })
      ).unwrap();
      addToast("Purchase order created successfully", "success");
      router.push("/purchase-order");
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : String(error || "Failed to create purchase order"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => router.push("/purchase-order")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase Order
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create Purchase Order</h1>
        <p className="mt-1 text-gray-500">Raise a vendor PO for approval before invoice entry</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Purchase Order Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch *</Label>
                <DataSelect
                  id="branch"
                  value={formData.branchId}
                  onChange={(value) => setFormData({ ...formData, branchId: value })}
                  placeholder={loading ? "Loading branches..." : "Select Branch"}
                  required
                  searchable
                  clearable
                  options={branches.map<DataSelectOption>((branch) => ({
                    value: branch.id,
                    label: branch.name,
                    description: [branch.code, branch.city, branch.state].filter(Boolean).join(" - "),
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency">Vendor *</Label>
                <DataSelect
                  id="agency"
                  value={formData.agencyId}
                  onChange={(value) => setFormData({ ...formData, agencyId: value })}
                  placeholder={loading ? "Loading vendors..." : "Select Vendor"}
                  required
                  searchable
                  clearable
                  panelClassName="w-[420px]"
                  options={agencies.map<DataSelectOption>((agency) => ({
                    value: agency.id,
                    label: agency.name,
                    description: [agency.contactPerson, agency.email, agency.gstin].filter(Boolean).join(" - "),
                    badge: agency.type,
                  }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleAddItem}>
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr className="border-b">
                      <th className="min-w-[360px] px-4 py-3 text-left font-semibold">Product</th>
                      <th className="px-4 py-3 text-right font-semibold">Qty</th>
                      <th className="px-4 py-3 text-left font-semibold">Unit</th>
                      <th className="px-4 py-3 text-right font-semibold">Price</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => {
                      const amount = Number(item.quantity || 0) * Number(item.purchasePrice || 0);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="min-w-[360px] px-2 py-3">
                            <DataSelect
                              value={item.productId}
                              onChange={(value) => {
                                const product = products.find((p) => p.id === value);
                                handleItemChange(item.id, "productId", value);
                                if (product?.baseUnit) handleItemChange(item.id, "unit", product.baseUnit);
                              }}
                              placeholder="Select Product"
                              required
                              searchable
                              triggerClassName="h-10 px-2 text-base"
                              panelClassName="w-[640px]"
                              options={products.map<DataSelectOption>((product) => ({
                                value: product.id,
                                label: product.name,
                                description: product.availableStockKG ? `Available Stock: ${product.availableStockKG}` : undefined,
                                badge: product.baseUnit,
                              }))}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={item.quantity || ""}
                              onChange={(event) =>
                                handleItemChange(item.id, "quantity", Number(event.target.value) || 0)
                              }
                              className="text-right"
                              required
                            />
                          </td>
                          <td className="px-4 py-3">
                            <DataSelect
                              value={item.unit}
                              onChange={(value) => handleItemChange(item.id, "unit", value as ProductUnit)}
                              required
                              triggerClassName="h-10 px-2"
                              panelClassName="w-[140px]"
                              options={[
                                { value: "KG", label: "KG" },
                                { value: "LTR", label: "LTR" },
                                { value: "MT", label: "MT" },
                              ]}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.purchasePrice || ""}
                              onChange={(event) =>
                                handleItemChange(item.id, "purchasePrice", Number(event.target.value) || 0)
                              }
                              className="text-right"
                              required
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-700">
                            {formatCurrency(amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleRemoveItem(item.id)}
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
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Subtotal Amount</p>
              <p className="text-2xl font-semibold text-green-700">{formatCurrency(subtotal)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(event) => setFormData({ ...formData, remarks: event.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push("/purchase-order")}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Create Purchase Order
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ToastContainer />
    </div>
  );
}
