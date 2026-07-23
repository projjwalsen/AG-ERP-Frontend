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
import type { SaleTransportDetails } from "@/app/services/sales.service";
import { Agency } from "@/app/types/agency";
import { Product } from "@/app/types/product";
import { Branch } from "@/app/types/branch";
import type { AvailableBatch } from "@/app/types/inventory";
import { useRouter } from "next/navigation";

/**
 * Per-product card carries a list of (batchId, quantity) allocations.
 * Allocations default to the full set of available batches for the
 * product (filtered to non-zero stock); the user types a quantity per
 * batch and may remove the rows they don't want.
 */
interface SaleBatchAllocation {
  id: string;
  batchId: string;
  batchNo: string;
  availableQtyKG?: number;
  availableQtyLTR?: number;
  quantity: number;
}

interface SaleItem {
  id: string;
  productId: string;
  unit: "KG" | "LTR";
  /** Display-only: name of the currently selected product. */
  productName?: string;
  /** Sale price per unit; sent to the backend as the optional
   * `unitPrice` override. */
  salePrice: number;
  /** Backend-computed; we keep it on the UI for the summary totals. */
  gst: number | null;
  /** Default qty to spread across all available batches when the
   *  user hasn't entered any per-batch quantities yet. */
  batches: SaleBatchAllocation[];
}

const emptyTransport: SaleTransportDetails = {
  purchaseOrderNo: "",
  purchaseOrderDate: "",
  receiptNoteNo: "",
  receiptNoteDate: "",
  lrNo: "",
  dispatchThrough: "",
  destination: "",
  vehicleOrFlightNo: "",
  billOfLadingNo: "",
  portOfLoading: "",
  portOfDischarge: "",
  countryTo: "",
  billOfEntryNo: "",
  billOfEntryDate: "",
  portCode: "",
};

function compactTransport(
  t: SaleTransportDetails
): SaleTransportDetails | undefined {
  const cleaned: SaleTransportDetails = {};
  let dirty = false;
  (Object.keys(emptyTransport) as Array<keyof SaleTransportDetails>).forEach(
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

export default function NewSalePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();

  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [availableBatches, setAvailableBatches] = React.useState<{
    [key: string]: AvailableBatch[];
  }>({});
  const [loadingBatches, setLoadingBatches] = React.useState<{
    [key: string]: boolean;
  }>({});
  const [loading, setLoading] = React.useState(false);

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
    invoiceDate: "",
    supplierInvoiceDate: "",
    irn: "",
    ackNo: "",
    ackDate: "",
    qrCodeImage: "",
    modeOfPayment: "",
    referenceNo: "",
    referenceDate: "",
  });

  const [transport, setTransport] =
    React.useState<SaleTransportDetails>({ ...emptyTransport });

  const [items, setItems] = React.useState<SaleItem[]>([
    {
      id: "1",
      productId: "",
      productName: "",
      unit: "KG" as "KG" | "LTR",
      salePrice: 0,
      gst: null,
      batches: [],
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

  const fetchAvailableBatches = async (
    branchId: string,
    productId: string,
    itemId: string
  ) => {
    if (!productId || !branchId) return;
    setLoadingBatches((prev) => ({ ...prev, [itemId]: true }));
    try {
      const response = await inventoryApi.getAvailableBatches({ productId, branchId });
      if (response.success) {
        const batches = response.data || [];
        const filtered = batches.filter((b) => {
          const qtyKG = Number(b.availableQtyKG) || 0;
          const qtyLTR = Number(b.availableQtyLTR) || 0;
          return qtyKG > 0 || qtyLTR > 0;
        });
        setAvailableBatches((prev) => ({ ...prev, [itemId]: filtered }));
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    } finally {
      setLoadingBatches((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Pick the right price for the chosen unit. The Product type carries
  // `sellPricePerUnit` (KG price) and `sellPriceLTR` (litre price); fall
  // back to `sellPricePerUnit` if the per-litre price hasn't been set.
  const getProductPrice = (productId: string, unit: "KG" | "LTR"): number => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    if (unit === "LTR") {
      const ltr = Number(product.sellPriceLTR);
      if (Number.isFinite(ltr) && ltr > 0) return ltr;
    }
    return Number(product.sellPricePerUnit) || 0;
  };

  const getProductGST = (productId: string): number | null => {
    const product = products.find((p) => p.id === productId);
    return product && product.applicableGST ? Number(product.applicableGST) : null;
  };

  const splitGst = (gst: number | null): { cgst: number; sgst: number; igst: number } => {
    if (!gst) return { cgst: 0, sgst: 0, igst: 0 };
    return { cgst: gst / 2, sgst: gst / 2, igst: 0 };
  };

  const handleAddItem = () => {
    const newId = String(Math.max(...items.map((i) => parseInt(i.id) || 0)) + 1);
    setItems([
      ...items,
      {
        id: newId,
        productId: "",
        productName: "",
        unit: "KG" as "KG" | "LTR",
        salePrice: 0,
        gst: null,
        batches: [],
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

  /**
   * Auto-allocate every available batch for the picked product. We
   * don't have the response yet here (it's loaded async), so we set
   * the batches once the API responds — see the `useEffect` that
   * watches `availableBatches[item.id]`. For UX we still need to
   * reset the previous product's allocations here so stale rows from
   * the previous product don't linger.
   */
  const handleItemChange = (
    id: string,
    field: keyof SaleItem | "batches",
    value: unknown
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;

        if (field === "productId") {
          const next = value as string;
          const price = getProductPrice(next, item.unit);
          const gst = getProductGST(next);
          const product = products.find((p) => p.id === next);
          if (formData.branchId) {
            fetchAvailableBatches(formData.branchId, next, id);
          }
          return {
            ...item,
            productId: next,
            productName: product?.name ?? "",
            salePrice: price,
            gst,
            batches: [],
          };
        }
        if (field === "unit") {
          const nextUnit = value as "KG" | "LTR";
          const price = item.productId
            ? getProductPrice(item.productId, nextUnit)
            : item.salePrice;
          return { ...item, unit: nextUnit, salePrice: price };
        }
        if (field === "batches") {
          return { ...item, batches: value as SaleBatchAllocation[] };
        }
        return { ...item, [field]: value as never };
      })
    );
  };

  /**
   * When availableBatches[index] arrives after a product selection,
   * populate that line's allocations with one row per available batch
   * (qty default 0). The user can then enter quantities directly per
   * batch or delete unwanted rows — no extra "Add Batch" step.
   */
  React.useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        if (!item.productId) return item;
        const list = availableBatches[item.id];
        if (!list || list.length === 0) return item;
        // Skip if the item already has allocations that match the
        // current available list (avoids re-populating on unrelated
        // re-renders).
        const candidateIds = new Set(list.map((b) => String(b.id)));
        const sameAsList =
          item.batches.length === list.length &&
          item.batches.every((b) => candidateIds.has(b.batchId));
        if (sameAsList) return item;
        return {
          ...item,
          batches: list.map((b) => ({
            id: String(Math.floor(Math.random() * 1e9)),
            batchId: String(b.id),
            batchNo: String(b.batchNo ?? b.id),
            availableQtyKG: Number(b.availableQtyKG) || 0,
            availableQtyLTR: Number(b.availableQtyLTR) || 0,
            quantity: 0,
          })),
        };
      })
    );
  }, [availableBatches]);

  const handleRemoveBatch = (itemId: string, allocId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, batches: item.batches.filter((b) => b.id !== allocId) }
          : item
      )
    );
  };

  /**
   * Distribute a single quantity total across all currently-visible
   * batch allocations equally. Handy when the user types the line
   * total once and wants the backend to split FIFO-wise — we ignore
   * availability caps (the form does too, backend may reject if the
   * per-batch stock is insufficient).
   */
  const distributeTotalAcrossBatches = (itemId: string, total: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (item.batches.length === 0) return item;
        // Allocate round-robin until the total is fully distributed.
        let remaining = total;
        const cap = Math.max(1, item.batches.length);
        return {
          ...item,
          batches: item.batches.map((b) => {
            if (remaining <= 0) return { ...b, quantity: 0 };
            const each = Math.floor((remaining / cap) * 100) / 100;
            const take = Math.min(each, remaining);
            remaining = Math.max(0, +(remaining - take).toFixed(2));
            return { ...b, quantity: take };
          }),
        };
      })
    );
  };

  const handleBatchChange = (
    itemId: string,
    allocId: string,
    patch: Partial<SaleBatchAllocation>
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              batches: item.batches.map((b) =>
                b.id === allocId ? { ...b, ...patch } : b
              ),
            }
          : item
      )
    );
  };

  const handleTransportChange = (
    field: keyof SaleTransportDetails,
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

    if (!formData.invoiceDate) {
      addToast("Please select an invoice date", "error");
      return;
    }

    /**
     * Flatten the per-card (product + N batches) model down to the
     * backend's flat "one item per (product, batch)" shape. Empty
     * allocations (qty 0) are dropped — the backend would reject
     * them on insufficient stock.
     */
    const lineAllocations: {
      productId: string;
      batchId: string;
      quantity: number;
      unit: "KG" | "LTR";
      salePrice: number;
    }[] = [];
    for (const item of items) {
      if (!item.productId) continue;
      for (const b of item.batches) {
        const qty = Number(b.quantity) || 0;
        if (qty <= 0) continue;
        lineAllocations.push({
          productId: item.productId,
          batchId: b.batchId,
          quantity: qty,
          unit: item.unit,
          salePrice: item.salePrice,
        });
      }
    }

    if (lineAllocations.length === 0) {
      addToast(
        "Each line needs at least one batch with a quantity greater than zero.",
        "error"
      );
      return;
    }

    setLoading(true);
    try {
      // Round-off is computed from the unrounded grand total in
      // `summaryTotals` — the user doesn't fill it in. We always send
      // the auto-derived value to the backend.

      await dispatch(
        createSale({
          agencyId: formData.agencyId,
          branchId: formData.branchId,
          invoiceDate: formData.invoiceDate,
          otherReference: formData.otherReference.trim() || undefined,
          irn: formData.irn.trim() || undefined,
          ackNo: formData.ackNo.trim() || undefined,
          ackDate: formData.ackDate || undefined,
          qrCodeImage: formData.qrCodeImage.trim() || undefined,
          modeOfPayment: formData.modeOfPayment.trim() || undefined,
          referenceNo: formData.referenceNo.trim() || undefined,
          referenceDate: formData.referenceDate || undefined,
          roundOffAmount: summaryTotals.roundOff,
          remarks: formData.remarks.trim() || undefined,
          deliveryNote: formData.deliveryNote.trim() || undefined,
          suppliersRef: formData.suppliersRef.trim() || undefined,
          buyerOrderNo: formData.buyerOrderNo.trim() || undefined,
          buyerOrderDate: formData.buyerOrderDate || undefined,
          despatchDocNo: formData.despatchDocNo.trim() || undefined,
          despatchDocDate: formData.despatchDocDate || undefined,
          despatchThrough: formData.despatchThrough.trim() || undefined,
          destination: formData.destination.trim() || undefined,
          transport: compactTransport(transport),
          items: lineAllocations.map((l) => ({
            productId: l.productId,
            batchId: l.batchId,
            quantity: l.quantity,
            unit: l.unit,
            ...(l.salePrice && l.salePrice > 0
              ? { unitPrice: l.salePrice }
              : {}),
          })),
        })
      ).unwrap();

      addToast("Sales invoice created successfully", "success");
      router.push("/purchase-sales?tab=sale");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to create sales invoice";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const summaryTotals = React.useMemo(() => {
    let totalAmount = 0;
    let totalGSTAmount = 0;

    items.forEach((item) => {
      if (!item.productId) return;
      const itemTotal = item.batches.reduce(
        (sum, b) => sum + (Number(b.quantity) || 0),
        0
      );
      const amount = itemTotal * item.salePrice;
      const { cgst, sgst } = splitGst(item.gst);
      const gstAmount = (amount * (cgst + sgst)) / 100;
      totalAmount += amount;
      totalGSTAmount += gstAmount;
    });

    const totalWithGST = totalAmount + totalGSTAmount;
    // Auto round-off to the nearest whole rupee. Negative when the
    // fraction is < 0.5, positive when ≥ 0.5 (e.g. 1234.43 → -0.43,
    // 1234.78 → +0.22). Surfaced read-only in the summary.
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
                    description: [branch.code, branch.city, branch.state]
                      .filter(Boolean)
                      .join(" • "),
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
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceDate: e.target.value })
                  }
                  required
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
              {/* Round-off is computed automatically from the total
                  amount — see the Invoice Summary below. There's no
                  user input for it. */}
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

              <div className="space-y-4">
                {items.map((item) => {
                  const allocated = item.batches.reduce(
                    (sum, b) => sum + (Number(b.quantity) || 0),
                    0
                  );
                  const isLoading =
                    item.productId && loadingBatches[item.id];

                  return (
                    <div
                      key={item.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-gray-50">
                        <div className="md:col-span-4">
                          <Label className="text-xs text-gray-500">Product</Label>
                          <DataSelect
                            value={item.productId}
                            onChange={(v) =>
                              handleItemChange(item.id, "productId", v)
                            }
                            placeholder="Select Product"
                            required
                            searchable
                            triggerClassName="h-10 px-2 text-base"
                            panelClassName="w-[640px]"
                            options={products.map<DataSelectOption>((product) => ({
                              value: product.id,
                              label: product.name,
                              description: product.sku
                                ? `SKU: ${product.sku}`
                                : undefined,
                              badge: product.baseUnit,
                            }))}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs text-gray-500">Unit</Label>
                          <DataSelect
                            value={item.unit}
                            onChange={(v) =>
                              handleItemChange(item.id, "unit", v)
                            }
                            required
                            triggerClassName="h-10 px-2"
                            panelClassName="w-[140px]"
                            options={[
                              { value: "KG", label: "KG" },
                              { value: "LTR", label: "LTR" },
                            ]}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs text-gray-500">
                            Sale Price / {item.unit === "KG" ? "Unit" : "Litre"}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.salePrice || ""}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "salePrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-10 text-sm text-right px-2"
                            required
                          />
                        </div>
                        <div className="md:col-span-2 flex items-end gap-2">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500">
                              GST %
                            </Label>
                            <div className="h-10 px-3 inline-flex items-center rounded-md border bg-white text-sm text-gray-700">
                              {item.gst ? `${item.gst}%` : "N/A"}
                            </div>
                          </div>
                        </div>
                        <div className="md:col-span-2 flex items-end gap-2">
                          <div className="flex-1 text-xs text-gray-600">
                            <Label className="text-xs text-gray-500">
                              Allocated
                            </Label>
                            <div className="h-10 px-3 inline-flex items-center rounded-md border bg-white text-sm text-gray-900 tabular-nums">
                              {allocated.toFixed(2)} {item.unit}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 self-end"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Batch allocations — auto-populated once the
                          available batches response arrives for this
                          product. The user only enters a quantity per
                          row (or removes the row entirely). */}
                      <div className="p-3 border-t bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Batch allocations
                          </p>
                          <span className="text-[11px] text-gray-500">
                            {item.batches.length} batch
                            {item.batches.length === 1 ? "" : "es"} available
                          </span>
                        </div>
                        {isLoading ? (
                          <p className="text-xs text-gray-500 italic">
                            Loading batches…
                          </p>
                        ) : item.productId && item.batches.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">
                            No outstanding batches for this product in
                            the selected branch. Pick a different branch
                            or product.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {item.batches.map((alloc) => {
                              const cap =
                                item.unit === "KG"
                                  ? alloc.availableQtyKG ?? 0
                                  : alloc.availableQtyLTR ?? 0;
                              return (
                                <div
                                  key={alloc.id}
                                  className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end"
                                >
                                  <div className="md:col-span-7">
                                    <Label className="text-xs text-gray-500">
                                      Batch
                                    </Label>
                                    <div className="h-9 px-3 inline-flex w-full items-center justify-between rounded-md border bg-gray-50 text-sm text-gray-700">
                                      <span className="font-mono">
                                        Batch{" "}
                                        {alloc.batchNo || alloc.batchId.slice(0, 8)}
                                      </span>
                                      <span className="text-[11px] text-gray-500">
                                        Available:{" "}
                                        {cap > 0
                                          ? `${cap} ${item.unit}`
                                          : "0"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="md:col-span-4">
                                    <Label className="text-xs text-gray-500">
                                      Quantity {item.unit}
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={alloc.quantity || ""}
                                      onChange={(e) =>
                                        handleBatchChange(item.id, alloc.id, {
                                          quantity:
                                            parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="h-9 text-sm text-right px-2"
                                    />
                                  </div>
                                  <div className="md:col-span-1 flex justify-end">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleRemoveBatch(item.id, alloc.id)
                                      }
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                      title="Exclude this batch"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}

                            <div className="flex justify-end text-xs text-gray-600">
                              <span
                                className={
                                  allocated > 0
                                    ? "text-emerald-600"
                                    : "text-gray-500"
                                }
                              >
                                Total allocated:{" "}
                                <strong>
                                  {allocated.toFixed(2)} {item.unit}
                                </strong>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
              <h4 className="font-semibold text-gray-900">Invoice Summary</h4>
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

            {/* Transport & Reference */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Transport & Reference</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseOrderNo">Purchase Order No</Label>
                  <Input
                    id="purchaseOrderNo"
                    value={transport.purchaseOrderNo ?? ""}
                    onChange={(e) =>
                      handleTransportChange("purchaseOrderNo", e.target.value)
                    }
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
                  <Label htmlFor="billOfLadingNo">Bill of Lading / LR No</Label>
                  <Input
                    id="billOfLadingNo"
                    value={transport.billOfLadingNo ?? transport.lrNo ?? ""}
                    onChange={(e) =>
                      handleTransportChange("billOfLadingNo", e.target.value)
                    }
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

            {/* Reference Details */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Reference Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modeOfPayment">Mode/Terms of Payment</Label>
                  <Input
                    id="modeOfPayment"
                    value={formData.modeOfPayment}
                    onChange={(e) =>
                      setFormData({ ...formData, modeOfPayment: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceNo">Reference No</Label>
                  <Input
                    id="referenceNo"
                    value={formData.referenceNo}
                    onChange={(e) =>
                      setFormData({ ...formData, referenceNo: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceDate">Reference Date</Label>
                  <Input
                    id="referenceDate"
                    type="date"
                    value={formData.referenceDate}
                    onChange={(e) =>
                      setFormData({ ...formData, referenceDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="irn">IRN</Label>
                  <Input
                    id="irn"
                    value={formData.irn}
                    onChange={(e) =>
                      setFormData({ ...formData, irn: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ackNo">Acknowledgement No</Label>
                  <Input
                    id="ackNo"
                    value={formData.ackNo}
                    onChange={(e) =>
                      setFormData({ ...formData, ackNo: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ackDate">Acknowledgement Date</Label>
                  <Input
                    id="ackDate"
                    type="date"
                    value={formData.ackDate}
                    onChange={(e) =>
                      setFormData({ ...formData, ackDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="qrCodeImage">e-Invoice QR Image URL/Data URI</Label>
                  <Input
                    id="qrCodeImage"
                    value={formData.qrCodeImage}
                    onChange={(e) =>
                      setFormData({ ...formData, qrCodeImage: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerOrderNo">Buyer Order No</Label>
                  <Input
                    id="buyerOrderNo"
                    value={formData.buyerOrderNo}
                    onChange={(e) =>
                      setFormData({ ...formData, buyerOrderNo: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerOrderDate">Buyer Order Date</Label>
                  <Input
                    id="buyerOrderDate"
                    type="date"
                    value={formData.buyerOrderDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        buyerOrderDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="despatchDocNo">Dispatch Doc No</Label>
                  <Input
                    id="despatchDocNo"
                    value={formData.despatchDocNo}
                    onChange={(e) =>
                      setFormData({ ...formData, despatchDocNo: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="despatchDocDate">Dispatch Doc Date</Label>
                  <Input
                    id="despatchDocDate"
                    type="date"
                    value={formData.despatchDocDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        despatchDocDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suppliersRef">Suppliers Ref</Label>
                  <Input
                    id="suppliersRef"
                    value={formData.suppliersRef}
                    onChange={(e) =>
                      setFormData({ ...formData, suppliersRef: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="despatchThrough">Dispatch Through</Label>
                  <Input
                    id="despatchThrough"
                    value={formData.despatchThrough}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        despatchThrough: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={formData.destination}
                    onChange={(e) =>
                      setFormData({ ...formData, destination: e.target.value })
                    }
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
                onChange={(e) =>
                  setFormData({ ...formData, deliveryNote: e.target.value })
                }
                rows={2}
              />
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/purchase-sales")}
              >
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
