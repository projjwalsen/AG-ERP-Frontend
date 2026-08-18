"use client";

import * as React from "react";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataSelect, type DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch } from "@/app/store/hooks";
import { createPurchase } from "@/app/store/purchasesSlice";
import { agencyApi } from "@/app/services/agency.service";
import { productApi } from "@/app/services/product.service";
import { branchApi } from "@/app/services/branch.service";
import type { PurchaseTransportDetails } from "@/app/services/purchase.service";
import {
  purchaseOrderApi,
  type PurchaseOrderInvoiceEntry,
} from "@/app/services/purchase-order.service";
import { Agency } from "@/app/types/agency";
import { Product } from "@/app/types/product";
import { Branch } from "@/app/types/branch";
import { useRouter } from "next/navigation";

interface PurchaseItem {
  id: string;
  productId: string;
  productName?: string;
  sku?: string | null;
  hsnNo?: string | null;
  batchNo: string;
  quantity: number;
  unit: "KG" | "LTR" | "MT";
  purchasePrice: number;
  gst: number | null;
  batchEditable?: boolean;
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
  const [purchaseOrders, setPurchaseOrders] = React.useState<{ id: string; poNo: string; poDate?: string; agency?: { name?: string } }[]>([]);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = React.useState("");
  const [invoiceEntry, setInvoiceEntry] = React.useState<PurchaseOrderInvoiceEntry | null>(null);
  const [invoiceEntryLoading, setInvoiceEntryLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [voucherType, setVoucherType] = React.useState<"PURCHASE" | "RCM_PURCHASE">("PURCHASE");

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

  const [items, setItems] = React.useState<PurchaseItem[]>([]);

  async function fetchData() {
    try {
      const [branchesRes, agenciesRes, productsRes, purchaseOrdersRes] = await Promise.all([
        branchApi.getActive(),
        agencyApi.getAll(),
        productApi.getActive(),
        purchaseOrderApi.getAll({ status: "APPROVED", limit: 1000 }),
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
      if (purchaseOrdersRes.success && purchaseOrdersRes.data) {
        setPurchaseOrders(purchaseOrdersRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  }

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const formatDateInput = (value?: string | null): string => {
    if (!value) return "";
    return value.slice(0, 10);
  };

  const handlePurchaseOrderChange = async (purchaseOrderId: string) => {
    setSelectedPurchaseOrderId(purchaseOrderId);
    setInvoiceEntry(null);

    if (!purchaseOrderId) {
      setFormData((prev) => ({ ...prev, agencyId: "", branchId: "" }));
      setTransport((prev) => ({
        ...prev,
        purchaseOrderNo: "",
        purchaseOrderDate: "",
      }));
      setItems([]);
      return;
    }

    setInvoiceEntryLoading(true);
    try {
      const response = await purchaseOrderApi.getInvoiceEntry(purchaseOrderId);
      if (!response.success || !response.data) {
        addToast(response.message || "Failed to fetch purchase order details", "error");
        return;
      }

      const entry = response.data;
      setInvoiceEntry(entry);
      setFormData((prev) => ({
        ...prev,
        agencyId: entry.agency.id,
        branchId: entry.branch.id,
        remarks: prev.remarks || entry.remarks || "",
      }));
      setTransport((prev) => ({
        ...prev,
        purchaseOrderNo: entry.poNo,
        purchaseOrderDate: formatDateInput(entry.poDate),
      }));
      setItems(
        entry.items.map((item) => ({
          id: item.purchaseOrderItemId,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          hsnNo: item.hsnNo,
          batchNo: item.batchNo || "",
          quantity: Number(item.quantity) || 0,
          unit: item.unit as PurchaseItem["unit"],
          purchasePrice: Number(item.purchasePrice) || 0,
          gst: Number(item.gstPercent) || null,
          batchEditable: !item.batchNo,
        }))
      );
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to fetch purchase order details", "error");
    } finally {
      setInvoiceEntryLoading(false);
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

    if (!selectedPurchaseOrderId) {
      addToast("Please select a purchase order", "error");
      return;
    }

    if (!formData.agencyId || !formData.branchId) {
      addToast("Selected purchase order does not include agency and branch", "error");
      return;
    }

    if (!formData.invoiceNo.trim()) {
      addToast("Invoice number is required", "error");
      return;
    }

    if (voucherType === "RCM_PURCHASE") {
      setItems([]);
    }

    const validItems = items.filter(
      (item) => item.productId && item.batchNo && item.quantity && item.purchasePrice
    );
    if (voucherType !== "RCM_PURCHASE" && validItems.length === 0) {
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
          purchaseOrderId: selectedPurchaseOrderId,
          invoiceNo: formData.invoiceNo.trim(),
          invoiceDate: dateInputToIso(formData.invoiceDate) || undefined,
          supplierInvoiceDate:
            dateInputToIso(formData.supplierInvoiceDate) || undefined,
          voucherType,
          otherReference: formData.otherReference.trim() || undefined,
          roundOffAmount: summaryTotals.roundOff,
          remarks: formData.remarks.trim() || undefined,
          transport: compactTransport$1,
          items: voucherType === "RCM_PURCHASE"
            ? []
            : validItems.map((item) => ({
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
        <h1 className="text-2xl font-bold text-gray-900">New Purchase Invoice</h1>
        <p className="text-gray-500 mt-1">Create a purchase invoice from an approved purchase order</p>
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="purchaseOrder">Purchase Order *</Label>
                <DataSelect
                  id="purchaseOrder"
                  value={selectedPurchaseOrderId}
                  onChange={handlePurchaseOrderChange}
                  placeholder="Select Purchase Order"
                  required
                  searchable
                  clearable
                  disabled={invoiceEntryLoading}
                  panelClassName="w-[560px]"
                  options={purchaseOrders.map<DataSelectOption>((order) => ({
                    value: order.id,
                    label: order.poNo,
                    description: [order.agency?.name, formatDateInput(order.poDate)]
                      .filter(Boolean)
                      .join(" - "),
                  }))}
                />
              </div>
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
                <Label htmlFor="voucherType">Voucher Type</Label>
                <select
                  id="voucherType"
                  value={voucherType}
                  onChange={(e) => {
                    const nextType = e.target.value as "PURCHASE" | "RCM_PURCHASE";
                    setVoucherType(nextType);
                    if (nextType === "RCM_PURCHASE") {
                      setItems([]);
                    }
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="PURCHASE">Normal Purchase</option>
                  <option value="RCM_PURCHASE">RCM Purchase</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch *</Label>
                <Input
                  id="branch"
                  value={
                    invoiceEntry?.branch.name ||
                    branches.find((branch) => branch.id === formData.branchId)?.name ||
                    ""
                  }
                  readOnly
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
              <Input
                id="agency"
                value={
                  invoiceEntry?.agency.name ||
                  agencies.find((agency) => agency.id === formData.agencyId)?.name ||
                  ""
                }
                readOnly
              />
            </div>

            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Purchase Items</h3>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-nowrap min-w-[360px]">Product</th>
                      {/* <th className="px-4 py-3 text-left font-semibold text-nowrap">SKU</th> */}
                      <th className="px-4 py-3 text-left font-semibold text-nowrap">HSN</th>
                      <th className="px-4 py-3 text-left font-semibold text-nowrap">Batch No</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap">Qty</th>
                      <th className="px-4 py-3 text-left font-semibold text-nowrap">Unit</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap">Price</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap">Amount</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap">GST %</th>
                      <th className="px-4 py-3 text-right font-semibold text-nowrap">Total w/ GST</th>
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
                            <Input
                              value={item.productName || products.find((product) => product.id === item.productId)?.name || item.productId}
                              readOnly
                              className="text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {/* <Input value={item.sku || ""} readOnly className="text-sm" /> */}
                          </td>
                          <td className="px-4 py-3">
                            <Input value={item.hsnNo || ""} readOnly className="text-sm" />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={item.batchNo}
                              onChange={(e) => handleItemChange(item.id, "batchNo", e.target.value)}
                              className="text-sm"
                              readOnly={!item.batchEditable}
                              required
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity || ""}
                              className="text-sm text-right"
                              readOnly
                              required
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input value={item.unit} readOnly className="text-sm" />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.purchasePrice || ""}
                              className="text-sm text-right"
                              readOnly
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
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                          Select a purchase order to populate items.
                        </td>
                      </tr>
                    )}
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
                {/* <div className="space-y-2">
                  <Label htmlFor="purchaseOrderNo">
                    Purchase Order No <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="purchaseOrderNo"
                    value={transport.purchaseOrderNo ?? ""}
                    readOnly
                    required
                  />
                </div> */}
                <div className="space-y-2">
                  <Label htmlFor="purchaseOrderDate">Purchase Order Date</Label>
                  <Input
                    id="purchaseOrderDate"
                    type="date"
                    value={transport.purchaseOrderDate ?? ""}
                    readOnly
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
            {/* <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
              />
            </div> */}

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
