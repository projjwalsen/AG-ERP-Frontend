"use client";

import * as React from "react";
import { Receipt, ArrowLeft, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DataSelect, type DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch } from "@/app/store/hooks";
import { createSale } from "@/app/store/salesSlice";
import { agencyApi } from "@/app/services/agency.service";
import { productApi } from "@/app/services/product.service";
import { branchApi } from "@/app/services/branch.service";
import { inventoryApi } from "@/app/services/inventory.service";
import { Agency } from "@/app/types/agency";
import { Product } from "@/app/types/product";
import { Branch } from "@/app/types/branch";
import { useRouter } from "next/navigation";

interface SaleItem {
  id: string;
  productId: string;
  batchId: string;
  quantity: number;
  unit: "KG" | "LTR";
  sellPrice: number;
  gst: number | null;
}

export default function NewSalePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();

  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [availableBatches, setAvailableBatches] = React.useState<{ [key: string]: any[] }>({});
  const [loadingBatches, setLoadingBatches] = React.useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = React.useState(false);

  // Build "today" in the local timezone as YYYY-MM-DD (the value expected
  // by <input type="date">). `new Date().toISOString().slice(0, 10)` would
  // produce UTC, which can be off by a day in non-UTC zones.
  const todayLocalDate = (): string => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [formData, setFormData] = React.useState({
    agencyId: "",
    branchId: "",
    remarks: "",
    deliveryNote: "",
    suppliersRef: "",
    otherReference: "",
    buyerOrderNo: "",
    buyerOrderDate: "",
    despatchDocNo: "",
    despatchDocDate: "",
    despatchThrough: "",
    destination: "",
    invoiceDate: todayLocalDate(),
  });

  const [items, setItems] = React.useState<SaleItem[]>([
    {
      id: "1",
      productId: "",
      batchId: "",
      quantity: 0,
      unit: "KG" as "KG" | "LTR",
      sellPrice: 0,
      gst: null,
    },
  ]);

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [branchesRes, agenciesRes, productsRes] = await Promise.all([
        branchApi.getActive(),
        agencyApi.getAll(),
        productApi.getActive(),
      ]);

      if (branchesRes.success && branchesRes.data) {
        setBranches(branchesRes.data.branches || []);
      }
      if (agenciesRes.success && agenciesRes.data) {
        const clientAgencies = agenciesRes.data.agencies.filter(
          (a: Agency) => a.type === "CLIENT" || a.type === "BOTH"
        );
        setAgencies(clientAgencies);
      }
      if (productsRes.success && productsRes.data) {
        setProducts(Array.isArray(productsRes.data.products) ? productsRes.data.products : []);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const fetchAvailableBatches = async (branchId: string, productId: string, itemId: string) => {
    if (!productId || !branchId) return;
    setLoadingBatches((prev) => ({ ...prev, [itemId]: true }));
    try {
      const response = await inventoryApi.getAvailableBatches({ productId, branchId });
      if (response.success) {
        const batches = response.data || [];
        const filtered = batches.filter((b: any) => {
          const qtyKG = Number(b.availableQtyKG) || 0;
          const qtyLTR = Number(b.availableQtyLTR) || 0;
          return qtyKG > 0 || qtyLTR > 0;
        });
        setAvailableBatches((prev) => ({ ...prev, [itemId]: filtered }));
        if (filtered.length > 0) {
          handleItemChange(itemId, "batchId", filtered[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    } finally {
      setLoadingBatches((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const getProductPrice = (productId: string): number => {
    const product = products.find((p) => p.id === productId);
    return product ? Number(product.sellPricePerUnit) || 0 : 0;
  };

  const getProductGST = (productId: string): number | null => {
    const product = products.find((p) => p.id === productId);
    return product && product.applicableGST ? Number(product.applicableGST) : null;
  };

  const calculateTotalAmount = (quantity: number, price: number): number => {
    return quantity * price;
  };

  const calculateGSTAmount = (totalAmount: number, gstPercentage: number | null): number => {
    if (!gstPercentage) return 0;
    return (totalAmount * gstPercentage) / 100;
  };

  const calculateTotalWithGST = (totalAmount: number, gstAmount: number): number => {
    return totalAmount + gstAmount;
  };

  const handleAddItem = () => {
    const newId = String(Math.max(...items.map((i) => parseInt(i.id) || 0)) + 1);
    setItems([
      ...items,
      {
        id: newId,
        productId: "",
        batchId: "",
        quantity: 0,
        unit: "KG" as "KG" | "LTR",
        sellPrice: 0,
        gst: null,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      addToast("At least one item is required", "error");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof SaleItem, value: any) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          if (field === "productId") {
            const price = getProductPrice(value);
            const gst = getProductGST(value);
            if (formData.branchId) {
              fetchAvailableBatches(formData.branchId, value, id);
            }
            return { ...item, [field]: value, sellPrice: price, gst, batchId: "" };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agencyId || !formData.branchId) {
      addToast("Please select agency and branch", "error");
      return;
    }

    if (!formData.invoiceDate) {
      addToast("Please select an invoice date", "error");
      return;
    }

    const validItems = items.filter((item) => item.productId && item.batchId && item.quantity);
    if (validItems.length === 0) {
      addToast("Please add at least one valid product item", "error");
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        createSale({
          agencyId: formData.agencyId,
          branchId: formData.branchId,
          items: validItems.map((item) => ({
            productId: item.productId,
            batchId: item.batchId,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.sellPrice,
          })),
          remarks: formData.remarks,
          deliveryNote: formData.deliveryNote,
          suppliersRef: formData.suppliersRef,
          otherReference: formData.otherReference,
          buyerOrderNo: formData.buyerOrderNo,
          buyerOrderDate: formData.buyerOrderDate,
          despatchDocNo: formData.despatchDocNo,
          despatchDocDate: formData.despatchDocDate,
          despatchThrough: formData.despatchThrough,
          destination: formData.destination,
          invoiceDate: formData.invoiceDate,
        })
      ).unwrap();

      addToast("Sales invoice created successfully", "success");
      router.push("/purchase-sales?tab=sale");
    } catch (err: any) {
      addToast(err || "Failed to create sales invoice", "error");
    } finally {
      setLoading(false);
    }
  };

  const summaryTotals = React.useMemo(() => {
    let totalAmount = 0;
    let totalGSTAmount = 0;

    items.forEach((item) => {
      const amount = calculateTotalAmount(item.quantity, item.sellPrice);
      const gstAmount = calculateGSTAmount(amount, item.gst);
      totalAmount += amount;
      totalGSTAmount += gstAmount;
    });

    return {
      totalAmount,
      totalGSTAmount,
      totalWithGST: totalAmount + totalGSTAmount,
    };
  }, [items]);

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="gap-2 mb-4"
          onClick={() => router.push("/purchase-sales")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase & Sales
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">New Sales Invoice</h1>
        <p className="text-gray-500 mt-1">Create a new sales invoice for client</p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-green-600" />
            Sales Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch *</Label>
                <DataSelect
                  id="branch"
                  value={formData.branchId}
                  onChange={(v) => setFormData({ ...formData, branchId: v })}
                  placeholder="Select Branch"
                  required
                  searchable
                  clearable
                  options={branches.map<DataSelectOption>((branch) => ({
                    value: branch.id,
                    label: branch.name,
                    description: [branch.code, branch.city, branch.state].filter(Boolean).join(" • "),
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency">Client *</Label>
                <DataSelect
                  id="agency"
                  value={formData.agencyId}
                  onChange={(v) => setFormData({ ...formData, agencyId: v })}
                  placeholder="Select Client"
                  required
                  searchable
                  clearable
                  panelClassName="w-[420px]"
                  options={agencies.map<DataSelectOption>((agency) => ({
                    value: agency.id,
                    label: agency.name,
                    description: [agency.contactPerson, agency.email, agency.gstin]
                      .filter(Boolean)
                      .join(" • "),
                    badge: agency.type,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Sales Items Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Sales Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm min-w-[1180px]">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold w-[260px]">Product</th>
                      <th className="px-4 py-3 text-left font-semibold w-[280px]">Batch (Available Qty)</th>
                      <th className="px-4 py-3 text-right font-semibold w-[110px]">Qty</th>
                      <th className="px-4 py-3 text-left font-semibold w-[100px]">Unit</th>
                      <th className="px-4 py-3 text-right font-semibold w-[130px]">Price</th>
                      <th className="px-4 py-3 text-right font-semibold w-[120px]">Amount</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap w-[80px]">GST %</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap w-[110px]">GST Amt</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap w-[130px]">Total w/ GST</th>
                      <th className="px-4 py-3 text-center font-semibold w-[80px]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const amount = calculateTotalAmount(item.quantity, item.sellPrice);
                      const gstAmount = calculateGSTAmount(amount, item.gst);
                      const totalWithGST = calculateTotalWithGST(amount, gstAmount);

                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <DataSelect
                              value={item.productId}
                              onChange={(v) => handleItemChange(item.id, "productId", v)}
                              placeholder="Select Product"
                              required
                              searchable
                              triggerClassName="h-9 px-2"
                              panelClassName="w-[360px]"
                              options={products.map<DataSelectOption>((product) => ({
                                value: product.id,
                                label: product.name,
                                description: product.sku ? `SKU: ${product.sku}` : undefined,
                                badge: product.baseUnit,
                              }))}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <DataSelect
                              value={item.batchId}
                              onChange={(v) => handleItemChange(item.id, "batchId", v)}
                              placeholder="Select Batch"
                              required
                              searchable
                              disabled={!item.productId || !formData.branchId || loadingBatches[item.id]}
                              triggerClassName="h-9 px-2"
                              panelClassName="w-[360px]"
                              options={(availableBatches[item.id] || []).map<DataSelectOption>((batch) => {
                                const qtyKG = Number(batch.availableQtyKG || 0);
                                const qtyLTR = Number(batch.availableQtyLTR || 0);
                                const qtyText =
                                  qtyKG > 0 && qtyLTR > 0
                                    ? `${qtyKG} KG / ${qtyLTR} LTR`
                                    : qtyKG > 0
                                    ? `${qtyKG} KG`
                                    : qtyLTR > 0
                                    ? `${qtyLTR} LTR`
                                    : "0";
                                return {
                                  value: batch.id,
                                  label: `Batch ${batch.batchNo}`,
                                  description: `Available: ${qtyText}`,
                                  badge: batch.status,
                                };
                              })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity || ""}
                              onChange={(e) => handleItemChange(item.id, "quantity", parseFloat(e.target.value) || 0)}
                              className="h-9 text-sm text-right px-2"
                              required
                            />
                          </td>
                          <td className="px-3 py-2">
                            <DataSelect
                              value={item.unit}
                              onChange={(v) => handleItemChange(item.id, "unit", v)}
                              required
                              triggerClassName="h-9 px-2"
                              panelClassName="w-[140px]"
                              options={[
                                { value: "KG", label: "KG" },
                                { value: "LTR", label: "LTR" },
                              ]}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.sellPrice || ""}
                              onChange={(e) =>
                                handleItemChange(item.id, "sellPrice", parseFloat(e.target.value) || 0)
                              }
                              className="h-9 text-sm text-right px-2"
                              title="Default is the product's sell price; override as needed"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-nowrap">
                            ₹ {amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-600">
                            {item.gst ? `${item.gst}%` : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-600 text-nowrap">
                            ₹ {gstAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600 text-nowrap">
                            ₹ {totalWithGST.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
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

            {/* Summary Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
              <h4 className="font-semibold text-gray-900">Invoice Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Subtotal Amount</p>
                  <p className="text-lg font-semibold text-gray-900">₹ {summaryTotals.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total GST</p>
                  <p className="text-lg font-semibold text-blue-600">₹ {summaryTotals.totalGSTAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Amount (with GST)</p>
                  <p className="text-lg font-semibold text-green-600">₹ {summaryTotals.totalWithGST.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Reference Fields */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Shipment & Reference Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buyerOrderNo">Buyer Order No</Label>
                  <Input
                    id="buyerOrderNo"
                    value={formData.buyerOrderNo}
                    onChange={(e) => setFormData({ ...formData, buyerOrderNo: e.target.value })}
                    placeholder="BO-2026-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerOrderDate">Buyer Order Date</Label>
                  <Input
                    id="buyerOrderDate"
                    type="date"
                    value={formData.buyerOrderDate}
                    onChange={(e) => setFormData({ ...formData, buyerOrderDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="despatchDocNo">Dispatch Doc No</Label>
                  <Input
                    id="despatchDocNo"
                    value={formData.despatchDocNo}
                    onChange={(e) => setFormData({ ...formData, despatchDocNo: e.target.value })}
                    placeholder="DESP-4455"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="despatchDocDate">Dispatch Doc Date</Label>
                  <Input
                    id="despatchDocDate"
                    type="date"
                    value={formData.despatchDocDate}
                    onChange={(e) => setFormData({ ...formData, despatchDocDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suppliersRef">Suppliers Ref</Label>
                  <Input
                    id="suppliersRef"
                    value={formData.suppliersRef}
                    onChange={(e) => setFormData({ ...formData, suppliersRef: e.target.value })}
                    placeholder="SUP-REF-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherReference">Other Reference</Label>
                  <Input
                    id="otherReference"
                    value={formData.otherReference}
                    onChange={(e) => setFormData({ ...formData, otherReference: e.target.value })}
                    placeholder="Internal Office Ref"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="despatchThrough">Dispatch Through</Label>
                  <Input
                    id="despatchThrough"
                    value={formData.despatchThrough}
                    onChange={(e) => setFormData({ ...formData, despatchThrough: e.target.value })}
                    placeholder="Road Transport"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="Kolkata Warehouse"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Note */}
            <div className="space-y-2">
              <Label htmlFor="deliveryNote">Delivery Note</Label>
              <Textarea
                id="deliveryNote"
                value={formData.deliveryNote}
                onChange={(e) => setFormData({ ...formData, deliveryNote: e.target.value })}
                placeholder="Delivery note details"
                rows={2}
              />
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional remarks"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.push("/purchase-sales")}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Invoice
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ToastContainer />
    </div>
  );
}