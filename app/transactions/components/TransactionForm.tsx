"use client";

import * as React from "react";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import {
  Agency,
  Branch,
  Invoice,
  PaymentMode,
  User,
} from "../types/transaction";
import { AgencySelector } from "./AgencySelector";
import { InvoiceSummaryCard } from "./InvoiceSummaryCard";
import { PaymentModeSection } from "./PaymentModeSection";
import { SuspenseAccountSection } from "./SuspenseAccountSection";

const DEFAULT_VOUCHER_DATE = "2026-05-31";
const DEFAULT_VOUCHER_NO = "VCH-2026-NEW";

interface TransactionFormProps {
  branches: Branch[];
  agencies: Agency[];
  invoices: Invoice[];
  currentUser: User;
  defaultBranchId?: string;
  agencyId?: string;
}

export function TransactionForm({
  branches,
  agencies,
  invoices,
  currentUser,
  defaultBranchId,
  agencyId: initialAgencyId,
}: TransactionFormProps) {
  const [type, setType] = React.useState<"INWARD" | "OUTWARD">("INWARD");
  const [branchId, setBranchId] = React.useState<string>(
    defaultBranchId || branches[0]?.id || ""
  );
  const [voucherDate, setVoucherDate] = React.useState<string>(DEFAULT_VOUCHER_DATE);
  const [voucherNo] = React.useState<string>(DEFAULT_VOUCHER_NO);
  const [remarks, setRemarks] = React.useState<string>("");

  const [agencyId, setAgencyId] = React.useState<string>(initialAgencyId || "");
  const [invoiceId, setInvoiceId] = React.useState<string>("");

  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>("ONLINE");
  const [amountPaid, setAmountPaid] = React.useState<number>(0);
  const [utr, setUtr] = React.useState<string>("");
  const [viaSecondaryAgency, setViaSecondaryAgency] = React.useState<boolean>(false);
  const [secondaryAgencyId, setSecondaryAgencyId] = React.useState<string>("");

  const [isSuspense, setIsSuspense] = React.useState<boolean>(false);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [successDialog, setSuccessDialog] = React.useState<boolean>(false);

  const selectedAgency = agencies.find((a) => a.id === agencyId) || null;
  const selectedInvoice = invoices.find((i) => i.id === invoiceId) || null;
  const selectedBranch = branches.find((b) => b.id === branchId) || null;

  const filteredInvoices = React.useMemo(
    () => invoices.filter((inv) => inv.agencyId === agencyId),
    [invoices, agencyId]
  );

  const secondaryAgencies = React.useMemo(
    () => agencies.filter((a) => a.id !== agencyId),
    [agencies, agencyId]
  );

  const outstanding = selectedInvoice?.outstandingAmount ?? 0;
  const selectedSecondaryAgency = secondaryAgencies.find((a) => a.id === secondaryAgencyId) || null;

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!branchId) next.branchId = "Branch is required";
    if (!isSuspense && !agencyId) next.agencyId = "Agency is required unless suspense";
    if (!isSuspense && !invoiceId) next.invoiceId = "Invoice is required";
    if (amountPaid <= 0) {
      next.amountPaid = "Amount must be greater than 0";
    } else if (amountPaid > outstanding && outstanding > 0) {
      next.amountPaid = `Amount cannot exceed outstanding ${formatCurrency(outstanding)}`;
    }
    if (paymentMode === "ONLINE" && !utr.trim()) {
      next.utr = "UTR is required for online payments";
    }
    if (paymentMode === "OFFLINE_CASH" && viaSecondaryAgency && !secondaryAgencyId) {
      next.secondaryAgencyId = "Select a secondary agency";
    }
    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length === 0) {
      setSuccessDialog(true);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Voucher Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Voucher Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Transaction Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("INWARD")}
                  className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium ${
                    type === "INWARD"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Inward (Receipt)
                </button>
                <button
                  type="button"
                  onClick={() => setType("OUTWARD")}
                  className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium ${
                    type === "OUTWARD"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                  Outward (Payment)
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Branch
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
              {errors.branchId && (
                <p className="mt-1 text-xs text-red-500">{errors.branchId}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Voucher No
              </label>
              <Input value={voucherNo} disabled />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Voucher Date
              </label>
              <Input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Agency & Invoice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Agency & Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AgencySelector
              agencies={agencies}
              value={agencyId}
              onChange={(v) => {
                setAgencyId(v);
                setInvoiceId("");
                setErrors((prev) => ({ ...prev, agencyId: "", invoiceId: "" }));
              }}
              required={!isSuspense}
              disabled={isSuspense}
            />
            {errors.agencyId && (
              <p className="text-xs text-red-500">{errors.agencyId}</p>
            )}

            {!isSuspense && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Invoice
                </label>
                <select
                  value={invoiceId}
                  onChange={(e) => {
                    setInvoiceId(e.target.value);
                    setErrors((prev) => ({ ...prev, invoiceId: "" }));
                  }}
                  className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={!agencyId}
                >
                  <option value="">Select invoice</option>
                  {filteredInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNo} - Outstanding {formatCurrency(inv.outstandingAmount)}
                    </option>
                  ))}
                </select>
                {errors.invoiceId && (
                  <p className="mt-1 text-xs text-red-500">{errors.invoiceId}</p>
                )}
              </div>
            )}

            <InvoiceSummaryCard
              invoice={selectedInvoice}
              agency={selectedAgency}
            />
          </CardContent>
        </Card>

        {/* Section 3: Payment Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Payment Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentModeSection
              mode={paymentMode}
              onModeChange={setPaymentMode}
              amount={amountPaid}
              onAmountChange={(v) => {
                setAmountPaid(v);
                setErrors((prev) => ({ ...prev, amountPaid: "" }));
              }}
              utr={utr}
              onUtrChange={(v) => {
                setUtr(v);
                setErrors((prev) => ({ ...prev, utr: "" }));
              }}
              outstandingAmount={outstanding}
              viaSecondaryAgency={viaSecondaryAgency}
              onViaSecondaryChange={(v) => {
                setViaSecondaryAgency(v);
                if (!v) setSecondaryAgencyId("");
                setErrors((prev) => ({ ...prev, secondaryAgencyId: "" }));
              }}
              secondaryAgencyId={secondaryAgencyId}
              onSecondaryAgencyChange={setSecondaryAgencyId}
              secondaryAgencies={secondaryAgencies}
              selectedSecondaryAgency={selectedSecondaryAgency}
            />
            {errors.amountPaid && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.amountPaid}
              </p>
            )}
            {errors.utr && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.utr}
              </p>
            )}
            {errors.secondaryAgencyId && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.secondaryAgencyId}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Suspense Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Suspense Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SuspenseAccountSection
              enabled={isSuspense}
              onToggle={setIsSuspense}
            />
          </CardContent>
        </Card>

        {/* Section 5: Remarks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Remarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks for this voucher"
            />
          </CardContent>
        </Card>

        {/* Section 6: Audit Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Audit Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase">Created By</p>
                <p className="font-medium">{currentUser.name}</p>
                <p className="text-xs text-gray-500">{currentUser.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Branch</p>
                <p className="font-medium">{selectedBranch?.name || "-"}</p>
                <p className="text-xs text-gray-500">{selectedBranch?.code || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Voucher Date</p>
                <p className="font-medium">{voucherDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline">
            Save as Draft
          </Button>
          <Button type="submit" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Submit Voucher
          </Button>
        </div>
      </form>

      <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Voucher submitted successfully
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-700">
              Voucher <span className="font-mono font-semibold">{voucherNo}</span> has
              been routed for authentication.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Status: <span className="font-semibold">PENDING_AUTHENTICATION</span>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setSuccessDialog(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
