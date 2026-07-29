"use client";

import * as React from "react";
import { ShoppingCart, ArrowLeft, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DataSelect, type DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch } from "@/app/store/hooks";
import { createPurchase } from "@/app/store/purchasesSlice";
import { agencyApi } from "@/app/services/agency.service";
import { productApi } from "@/app/services/product.service";
import { branchApi } from "@/app/services/branch.service";
import type { PurchaseTransportDetails } from "@/app/services/purchase.service";
import { Agency } from "@/app/types/agency";
import { Product } from "@/app/types/product";
import { Branch } from "@/app/types/branch";
import { useRouter } from "next/navigation";

interface PurchaseItem {
  id: string;
  productId: string;
  batchNo: string;
  quantity: number;
  unit: "KG" | "LTR";
  purchasePrice: number;
  gst: number | null;
}

const emptyTransport: PurchaseTransportDetails = {
  purchaseOrderNo: "",
  purchaseOrderDate: "",
  receiptNoteNo: "",
  receiptNoteDate: "",
  lrNo: "",
  dispatchThrough: "",
  destination: "",
  vehicleOrFlightNo: "",
  portOfLoading: "",
  portOfDischarge: "",
  countryTo: "",
  billOfEntryNo: "",
  billOfEntryDate: "",
  portCode: "",
};

// Convert "YYYY-MM-DD" → "2026-07-06T00:00:00.000Z" so the backend
// receives an ISO timestamp that matches its expected `invoiceDate`
// type. Returns the empty string for blank input so callers can decide
// whether to include the field in the payload.
function dateInputToIso(d: string): string {
  if (!d) return "";
  return `${d}T00:00:00.000Z`;
}

// Drop empty / whitespace-only fields from a transport object so the
// payload only carries what the user actually filled in. Matches the
// curl sample where unused dates are simply omitted ("" would also be
// accepted, but keeping the payload clean avoids surprising the server).
function compactTransport(
  t: PurchaseTransportDetails
): PurchaseTransportDetails | undefined {
  const cleaned: PurchaseTransportDetails = {};
  let dirty = false;
  (Object.keys(emptyTransport) as Array<keyof PurchaseTransportDetails>).forEach(
    (k) => {
      const v = t[k];
      if (typeof v === "string" && v.trim() !== "") {
        cleaned[k] = v.trim();
        dirty = true;
      } else if (typeof v === "string") {
        cleaned[k] = "";
      }
    }
  );
  return dirty ? cleaned : undefined;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();

  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [formData, setFormData] = React.useState({
    agencyId: "",
    branchId: "",
    invoiceNo: "",
    invoiceDate: "",
    supplierInvoiceDate: "",
    otherReference: "",
    remarks: "",
  });

  const [transport, setTransport] =
    React.useState<PurchaseTransportDetails>({ ...emptyTransport });

  const [items, setItems] = React.useState<PurchaseItem[]>([
    {
      id: "1",
      productId: "",
      batchNo: "",
      quantity: 0,
      unit: "KG" as "KG" | "LTR",
      purchasePrice: 0,
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
        const vendorAgencies = agenciesRes.data.agencies.filter(
          (a: Agency) => a.type === "VENDOR" || a.type === "BOTH"
        );
        setAgencies(vendorAgencies);
      }
      if (productsRes.success && productsRes.data) {
        setProducts(Array.isArray(productsRes.data.products) ? productsRes.data.products : []);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
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
        batchNo: "",
        quantity: 0,
        unit: "KG" as "KG" | "LTR",
        purchasePrice: 0,
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

  const handleItemChange = (id: string, field: keyof PurchaseItem, value: unknown) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          if (field === "productId") {
            const gst = getProductGST(value as string);
            return { ...item, [field]: value as string, gst };
          }
          return { ...item, [field]: value as never };
        }
        return item;
      })
    );
  };

  const handleTransportChange = (
    field: keyof PurchaseTransportDetails,
    value: string
  ) => {
    setTransport((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agencyId || !formData.branchId) {
      addToast("Please select agency and branch", "error");
      return;
    }

    if (!formData.invoiceNo.trim()) {
      addToast("Invoice number is required", "error");
      return;
    }

    if (!transport.purchaseOrderNo || !transport.purchaseOrderNo.trim()) {
      addToast("Purchase Order No is required", "error");
      return;
    }

    // Validate items
    const validItems = items.filter(
      (item) => item.productId && item.batchNo && item.quantity && item.purchasePrice
    );
    if (validItems.length === 0) {
      addToast("Please add at least one valid product item", "error");
      return;
    }

    setLoading(true);
    try {
      // Round-off is derived from the unrounded grand total below in
      // `summaryTotals`. The user doesn't fill it in — we compute and
      // send the integer-rounded amount (negative if the fraction is
      // < 0.5, positive if it's ≥ 0.5).
      const compactTransport$1 = compactTransport(transport);

      await dispatch(
        createPurchase({
          agencyId: formData.agencyId,
          branchId: formData.branchId,
          invoiceNo: formData.invoiceNo.trim(),
          invoiceDate: dateInputToIso(formData.invoiceDate) || undefined,
          supplierInvoiceDate:
            dateInputToIso(formData.supplierInvoiceDate) || undefined,
          otherReference: formData.otherReference.trim() || undefined,
          roundOffAmount: summaryTotals.roundOff,
          remarks: formData.remarks.trim() || undefined,
          transport: compactTransport$1,
          items: validItems.map((item) => ({
            productId: item.productId,
            batchNo: item.batchNo.trim(),
            quantity: item.quantity,
            unit: item.unit,
            purchasePrice: item.purchasePrice,
          })),
        })
      ).unwrap();

      addToast("Purchase created successfully", "success");
      router.push("/purchase-sales");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to create purchase";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary totals
  const summaryTotals = React.useMemo(() => {
    let totalAmount = 0;
    let totalGSTAmount = 0;

    items.forEach((item) => {
      const amount = calculateTotalAmount(item.quantity, item.purchasePrice);
      const gstAmount = calculateGSTAmount(amount, item.gst);
      totalAmount += amount;
      totalGSTAmount += gstAmount;
    });

    const totalWithGST = totalAmount + totalGSTAmount;
    // Round to the nearest whole rupee: positive when the fraction is
    // ≥ 0.5, negative when it's < 0.5. e.g. 1234.43 → roundOff = -0.43,
    // roundedTotal = 1234; 1234.78 → roundOff = +0.22, roundedTotal =
    // 1235. The user never enters this — it's surfaced read-only.
    const roundedTotal = Math.round(totalWithGST);
    const roundOff = Number((roundedTotal - totalWithGST).toFixed(2));

    return {
      totalAmount,
      totalGSTAmount,
      totalWithGST,
      roundOff,
      roundedTotal,
    };
  }, [items]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="gap-2 mb-4"
          onClick={() => router.push("/purchase-sales")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase & Sales
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
        <p className="text-gray-500 mt-1">Create a new purchase order from vendor</p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Purchase Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNo">Invoice Number *</Label>
                <Input
                  id="invoiceNo"
                  value={formData.invoiceNo}
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceNo: e.target.value })
                  }
                />
              </div>
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
                    description: [branch.code, branch.city, branch.state]
                      .filter(Boolean)
                      .join(" • "),
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierInvoiceDate">Supplier Invoice Date</Label>
                <Input
                  id="supplierInvoiceDate"
                  type="date"
                  value={formData.supplierInvoiceDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplierInvoiceDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherReference">Other Reference</Label>
                <Input
                  id="otherReference"
                  value={formData.otherReference}
                  onChange={(e) =>
                    setFormData({ ...formData, otherReference: e.target.value })
                  }
                />
              </div>
              {/* Round-off is computed automatically from the total
                  amount — see the Order Summary below. There's no user
                  input for it. */}
            </div>

            <div className="space-y-2">
              <Label htmlFor="agency">Vendor *</Label>
              <DataSelect
                id="agency"
                value={formData.agencyId}
                onChange={(v) => setFormData({ ...formData, agencyId: v })}
                placeholder="Select Vendor"
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

            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Purchase Items</h3>
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
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-nowrap min-w-[360px]">Product</th>
                      <th className="px-4 py-3 text-left font-semibold text-nowrap">Batch No</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap">Qty</th>
                      <th className="px-4 py-3 text-left font-semibold text-nowrap">Unit</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap">Price</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap">Amount</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap">GST %</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap">Total w/ GST</th>
                      <th className="px-4 py-3 text-center font-semibold text-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const amount = calculateTotalAmount(item.quantity, item.purchasePrice);
                      const gstAmount = calculateGSTAmount(amount, item.gst);
                      const totalWithGST = calculateTotalWithGST(amount, gstAmount);

                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-2 py-3 min-w-[360px]">
                            <DataSelect
                              value={item.productId}
                              onChange={(v) => handleItemChange(item.id, "productId", v)}
                              placeholder="Select Product"
                              required
                              searchable
                              triggerClassName="h-10 px-2 text-base"
                              panelClassName="w-[640px]"
                              options={products.map<DataSelectOption>((product) => ({
                                value: product.id,
                                label: product.name,
                                description: product.sku ? `SKU: ${product.sku}` : undefined,
                                badge: product.baseUnit,
                              }))}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={item.batchNo}
                              onChange={(e) => handleItemChange(item.id, "batchNo", e.target.value)}
                              className="text-sm"
                              required
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity || ""}
                              onChange={(e) => handleItemChange(item.id, "quantity", parseFloat(e.target.value) || 0)}
                              className="text-sm text-right"
                              required
                            />
                          </td>
                          <td className="px-4 py-3">
                            <DataSelect
                              value={item.unit}
                              onChange={(v) => handleItemChange(item.id, "unit", v)}
                              required
                              triggerClassName="h-9 px-2"
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
                              onChange={(e) => handleItemChange(item.id, "purchasePrice", parseFloat(e.target.value) || 0)}
                              className="text-sm text-right"
                              required
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-nowrap">
                            ₹ {amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-600">
                            {item.gst ? `${item.gst}%` : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600 text-nowrap">
                            ₹ {totalWithGST.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
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
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
              <h4 className="font-semibold text-gray-900">Order Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Subtotal Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ₹ {summaryTotals.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total GST</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ₹ {summaryTotals.totalGSTAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total Amount (with GST)</p>
                  <p className="text-lg font-semibold text-green-600">
                    ₹ {summaryTotals.totalWithGST.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Round Off</p>
                  <p
                    className={
                      "text-lg font-semibold " +
                      (summaryTotals.roundOff < 0
                        ? "text-rose-600"
                        : summaryTotals.roundOff > 0
                        ? "text-emerald-600"
                        : "text-gray-500")
                    }
                    title="Auto-calculated from the total amount with GST"
                  >
                    {summaryTotals.roundOff > 0 ? "+" : ""}
                    {summaryTotals.roundOff.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Amount After Round Off</p>
                  <p className="text-lg font-semibold text-indigo-700">
                    ₹ {summaryTotals.roundedTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Transport Details */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Transport & Reference</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseOrderNo">
                    Purchase Order No <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="purchaseOrderNo"
                    value={transport.purchaseOrderNo ?? ""}
                    onChange={(e) =>
                      handleTransportChange("purchaseOrderNo", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseOrderDate">Purchase Order Date</Label>
                  <Input
                    id="purchaseOrderDate"
                    type="date"
                    value={transport.purchaseOrderDate ?? ""}
                    onChange={(e) =>
                      handleTransportChange("purchaseOrderDate", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptNoteNo">Receipt Note No</Label>
                  <Input
                    id="receiptNoteNo"
                    value={transport.receiptNoteNo ?? ""}
                    onChange={(e) =>
                      handleTransportChange("receiptNoteNo", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptNoteDate">Receipt Note Date</Label>
                  <Input
                    id="receiptNoteDate"
                    type="date"
                    value={transport.receiptNoteDate ?? ""}
                    onChange={(e) =>
                      handleTransportChange("receiptNoteDate", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lrNo">LR No</Label>
                  <Input
                    id="lrNo"
                    value={transport.lrNo ?? ""}
                    onChange={(e) => handleTransportChange("lrNo", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dispatchThrough">Dispatch Through</Label>
                  <Input
                    id="dispatchThrough"
                    value={transport.dispatchThrough ?? ""}
                    onChange={(e) =>
                      handleTransportChange("dispatchThrough", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={transport.destination ?? ""}
                    onChange={(e) =>
                      handleTransportChange("destination", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleOrFlightNo">Vehicle / Flight No</Label>
                  <Input
                    id="vehicleOrFlightNo"
                    value={transport.vehicleOrFlightNo ?? ""}
                    onChange={(e) =>
                      handleTransportChange("vehicleOrFlightNo", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portOfLoading">Port of Loading</Label>
                  <Input
                    id="portOfLoading"
                    value={transport.portOfLoading ?? ""}
                    onChange={(e) =>
                      handleTransportChange("portOfLoading", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portOfDischarge">Port of Discharge</Label>
                  <Input
                    id="portOfDischarge"
                    value={transport.portOfDischarge ?? ""}
                    onChange={(e) =>
                      handleTransportChange("portOfDischarge", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="countryTo">Country (To)</Label>
                  <Input
                    id="countryTo"
                    value={transport.countryTo ?? ""}
                    onChange={(e) =>
                      handleTransportChange("countryTo", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billOfEntryNo">Bill of Entry No</Label>
                  <Input
                    id="billOfEntryNo"
                    value={transport.billOfEntryNo ?? ""}
                    onChange={(e) =>
                      handleTransportChange("billOfEntryNo", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billOfEntryDate">Bill of Entry Date</Label>
                  <Input
                    id="billOfEntryDate"
                    type="date"
                    value={transport.billOfEntryDate ?? ""}
                    onChange={(e) =>
                      handleTransportChange("billOfEntryDate", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portCode">Port Code</Label>
                  <Input
                    id="portCode"
                    value={transport.portCode ?? ""}
                    onChange={(e) =>
                      handleTransportChange("portCode", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.push("/purchase-sales")}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Purchase
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ToastContainer />
    </div>
  );
}
