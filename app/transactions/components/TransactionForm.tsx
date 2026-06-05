"use client";

import * as React from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Building2,
  Banknote,
  Wallet,
  Users,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Agency,
  Branch,
  PaymentMode,
  TransactionPaymentType as PaymentType,
  TransactionDirection,
  CreateTransactionPayload,
  AgencyOutstanding,
} from "@/app/types/transaction";
import { AgencySelector } from "./AgencySelector";
import { AgencyBalanceCard } from "./AgencyBalanceCard";
import { ThirdPartyAgencySection } from "./ThirdPartyAgencySection";

export interface TransactionFormUser {
  id: string;
  name: string;
  email: string;
}

interface TransactionFormProps {
  branches: Branch[];
  agencies: Agency[];
  outstanding: AgencyOutstanding | null;
  currentUser: TransactionFormUser;
  defaultBranchId?: string;
  agencyId?: string;
  isSubmitting?: boolean;
  onSubmit: (payload: CreateTransactionPayload) => void;
  onContextChange?: (ctx: {
    agencyId?: string;
    branchId?: string;
    direction?: TransactionDirection;
  }) => void;
}

/**
 * Compute total outstanding amount across an agency's invoices.
 * Local fallback when the live outstanding endpoint isn't loaded yet.
 */
function localOutstanding(agencyId: string, agencies: Agency[]): number {
  if (!agencyId) return 0;
  void agencies;
  return 0;
}

function localPending(agencyId: string, agencies: Agency[]): number {
  if (!agencyId) return 0;
  void agencies;
  return 0;
}

export function TransactionForm({
  branches,
  agencies,
  outstanding,
  currentUser,
  defaultBranchId,
  agencyId: initialAgencyId,
  isSubmitting = false,
  onSubmit,
  onContextChange,
}: TransactionFormProps) {
  const [type, setType] = React.useState<TransactionDirection>("INWARD");
  const [branchId, setBranchId] = React.useState<string>(
    defaultBranchId || branches[0]?.id || ""
  );
  const [isSuspense, setIsSuspense] = React.useState<boolean>(false);
  const [agencyId, setAgencyId] = React.useState<string>(initialAgencyId || "");
  const [paymentType, setPaymentType] = React.useState<PaymentType>("NORMAL");
  const [transactionRefNo, setTransactionRefNo] = React.useState<string>("");
  const [amount, setAmount] = React.useState<number>(0);
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>("ONLINE");
  const [remarks, setRemarks] = React.useState<string>("");
  const [thirdPartyAgencyId, setThirdPartyAgencyId] = React.useState<string>("");

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const selectedBranch = branches.find((b) => b.id === branchId) || null;
  const selectedAgency = agencies.find((a) => a.id === agencyId) || null;
  const selectedThirdParty =
    agencies.find((a) => a.id === thirdPartyAgencyId) || null;

  const thirdPartyAgencies = React.useMemo(
    () => agencies.filter((a) => a.id !== agencyId),
    [agencies, agencyId]
  );

  React.useEffect(() => {
    setThirdPartyAgencyId("");
  }, [agencyId]);

  // Report the current selection up to the page so it can refetch outstanding.
  const lastReportedKey = React.useRef<string>("");
  React.useEffect(() => {
    if (!onContextChange) return;
    const key = [branchId, agencyId, type].join("|");
    if (key === lastReportedKey.current) return;
    lastReportedKey.current = key;
    onContextChange({
      branchId: branchId || undefined,
      agencyId: agencyId || undefined,
      direction: type,
    });
  }, [branchId, agencyId, type, onContextChange]);

  // Derive displayed balance: prefer the live outstanding endpoint, fall back
  // to local-only zero (the endpoint will fill it in on the next agency/direction
  // change in the parent page).
  const primaryOutstanding = outstanding
    ? type === "INWARD"
      ? outstanding.salesOutstanding
      : outstanding.purchaseOutstanding
    : localOutstanding(agencyId, agencies);
  const primaryPending = outstanding
    ? Math.max(0, primaryOutstanding - 0)
    : localPending(agencyId, agencies);

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!branchId) next.branchId = "Branch is mandatory";
    if (!isSuspense && !agencyId) {
      next.agencyId = "Agency is mandatory when Suspense Account is False";
    }
    if (!transactionRefNo.trim()) {
      next.transactionRefNo = "Transaction Reference No is mandatory";
    }
    if (amount <= 0) {
      next.amount = "Amount must be greater than zero";
    }
    if (paymentType === "THIRD_PARTY" && !thirdPartyAgencyId) {
      next.thirdPartyAgencyId =
        "3rd Party Agency is mandatory for 3rd Party Transactions";
    }
    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    const payload: CreateTransactionPayload = {
      branchId,
      direction: type,
      suspense: isSuspense,
      paymentType,
      amount,
      paymentMode,
      ...(isSuspense ? {} : { agencyId }),
      ...(paymentType === "THIRD_PARTY" && thirdPartyAgencyId
        ? { thirdPartyAgencyId }
        : {}),
      ...(transactionRefNo.trim()
        ? { transactionRefNo: transactionRefNo.trim() }
        : {}),
      ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
    };
    onSubmit(payload);
  };

  const isThirdParty = paymentType === "THIRD_PARTY";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Transaction Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Transaction Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType("INWARD")}
              className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                type === "INWARD"
                  ? "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Inward (Receipt)
            </button>
            <button
              type="button"
              onClick={() => setType("OUTWARD")}
              className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                type === "OUTWARD"
                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Outward (Payment)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Branch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            Branch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Select Branch<span className="text-red-500 ml-0.5">*</span>
          </label>
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setErrors((prev) => ({ ...prev, branchId: "" }));
            }}
            className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
          {errors.branchId && (
            <p className="mt-1 text-xs text-red-500">{errors.branchId}</p>
          )}
        </CardContent>
      </Card>

      {/* Suspense Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-600" />
            Suspense Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Suspense Account<span className="text-red-500 ml-0.5">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSuspense(false);
                  setErrors((prev) => ({ ...prev, agencyId: "" }));
                }}
                className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium ${
                  !isSuspense
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                False
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSuspense(true);
                  setAgencyId("");
                  setErrors((prev) => ({ ...prev, agencyId: "" }));
                }}
                className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium ${
                  isSuspense
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                True
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 flex items-start gap-2 bg-gray-50">
            <Info className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
            <div className="text-xs text-gray-600 space-y-1">
              <p>
                <span className="font-semibold text-gray-800">False:</span>{" "}
                Agency selection is enabled.
              </p>
              <p>
                <span className="font-semibold text-gray-800">True:</span>{" "}
                Agency selection is disabled. The transaction will be routed to{" "}
                <span className="font-mono font-semibold">
                  GST_Suspense_Clearing
                </span>{" "}
                for Finance to map against a real invoice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Agency
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSuspense ? (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Agency selection disabled
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Suspense Account is set to{" "}
                  <span className="font-semibold">True</span>. Agency will be
                  mapped by Finance during suspense clearing.
                </p>
              </div>
            </div>
          ) : (
            <>
              <AgencySelector
                agencies={agencies}
                value={agencyId}
                onChange={(v) => {
                  setAgencyId(v);
                  setErrors((prev) => ({ ...prev, agencyId: "" }));
                }}
                required
              />
              {errors.agencyId && (
                <p className="mt-2 text-xs text-red-500">{errors.agencyId}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Payment Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setPaymentType("NORMAL");
                setThirdPartyAgencyId("");
                setErrors((prev) => ({ ...prev, thirdPartyAgencyId: "" }));
              }}
              className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-3 text-sm font-medium ${
                paymentType === "NORMAL"
                  ? "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <FileText className="h-4 w-4" />
              Normal Transaction
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("THIRD_PARTY")}
              className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-3 text-sm font-medium ${
                isThirdParty
                  ? "border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-200"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <Users className="h-4 w-4" />
              3rd Party Transaction
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Normal Transaction Details */}
      {paymentType === "NORMAL" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              Transaction Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Transaction Reference No
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <Input
                  value={transactionRefNo}
                  onChange={(e) => {
                    setTransactionRefNo(e.target.value);
                    setErrors((prev) => ({ ...prev, transactionRefNo: "" }));
                  }}
                  placeholder="e.g. UTR2026053100123"
                />
                {errors.transactionRefNo && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.transactionRefNo}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Amount<span className="text-red-500 ml-0.5">*</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  value={Number.isFinite(amount) ? amount : 0}
                  onChange={(e) => {
                    setAmount(Number(e.target.value));
                    setErrors((prev) => ({ ...prev, amount: "" }));
                  }}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Payment Mode<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode("ONLINE")}
                  className={`text-left border rounded-lg p-3 transition-colors ${
                    paymentMode === "ONLINE"
                      ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${
                        paymentMode === "ONLINE"
                          ? "bg-green-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <Banknote
                        className={`h-4 w-4 ${
                          paymentMode === "ONLINE"
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Online
                      </p>
                      <p className="text-[11px] text-gray-500">
                        NEFT / RTGS / UPI
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("OFFLINE")}
                  className={`text-left border rounded-lg p-3 transition-colors ${
                    paymentMode === "OFFLINE"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${
                        paymentMode === "OFFLINE"
                          ? "bg-blue-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <Wallet
                        className={`h-4 w-4 ${
                          paymentMode === "OFFLINE"
                            ? "text-blue-600"
                            : "text-gray-500"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Offline
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Cash / Cheque / DD / Bank Deposit
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Remarks
              </label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks for this transaction"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3rd Party Transaction Details */}
      {paymentType === "THIRD_PARTY" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              3rd Party Transaction Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Primary Agency
              </label>
              <Input
                value={selectedAgency?.name || "Select an agency above"}
                disabled
              />
            </div>

            <ThirdPartyAgencySection
              agencies={thirdPartyAgencies}
              value={thirdPartyAgencyId}
              onChange={(v) => {
                setThirdPartyAgencyId(v);
                setErrors((prev) => ({ ...prev, thirdPartyAgencyId: "" }));
              }}
              error={errors.thirdPartyAgencyId}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Transaction Reference No
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <Input
                  value={transactionRefNo}
                  onChange={(e) => {
                    setTransactionRefNo(e.target.value);
                    setErrors((prev) => ({ ...prev, transactionRefNo: "" }));
                  }}
                  placeholder="e.g. UTR2026053100123"
                />
                {errors.transactionRefNo && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.transactionRefNo}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Amount<span className="text-red-500 ml-0.5">*</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  value={Number.isFinite(amount) ? amount : 0}
                  onChange={(e) => {
                    setAmount(Number(e.target.value));
                    setErrors((prev) => ({ ...prev, amount: "" }));
                  }}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Payment Mode<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode("ONLINE")}
                  className={`text-left border rounded-lg p-3 transition-colors ${
                    paymentMode === "ONLINE"
                      ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${
                        paymentMode === "ONLINE"
                          ? "bg-green-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <Banknote
                        className={`h-4 w-4 ${
                          paymentMode === "ONLINE"
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Online
                      </p>
                      <p className="text-[11px] text-gray-500">NEFT / RTGS / UPI</p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("OFFLINE")}
                  className={`text-left border rounded-lg p-3 transition-colors ${
                    paymentMode === "OFFLINE"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${
                        paymentMode === "OFFLINE"
                          ? "bg-blue-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <Wallet
                        className={`h-4 w-4 ${
                          paymentMode === "OFFLINE"
                            ? "text-blue-600"
                            : "text-gray-500"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Offline
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Cash / Cheque / DD / Bank Deposit
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Remarks
              </label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks for this transaction"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agency Balances */}
      {(paymentType === "NORMAL" || paymentType === "THIRD_PARTY") &&
        selectedAgency &&
        !isSuspense && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText
                  className={`h-4 w-4 ${
                    paymentType === "NORMAL" ? "text-green-600" : "text-purple-600"
                  }`}
                />
                Agency Balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AgencyBalanceCard
                  agency={selectedAgency}
                  type={type}
                  outstandingAmount={primaryOutstanding}
                  pendingAmount={primaryPending}
                  label="Primary Agency"
                  variant="primary"
                />
                {paymentType === "THIRD_PARTY" &&
                  (selectedThirdParty ? (
                    <AgencyBalanceCard
                      agency={selectedThirdParty}
                      type={type}
                      outstandingAmount={primaryOutstanding}
                      pendingAmount={primaryPending}
                      label="3rd Party Agency"
                      variant="third-party"
                    />
                  ) : (
                    <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center text-xs text-gray-500">
                      Select a 3rd party agency to view balances.
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Audit Information */}
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
              <p className="text-xs text-gray-500">
                {selectedBranch?.code || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Transaction Type</p>
              <p className="font-medium">
                {type === "INWARD" ? "Inward (Receipt)" : "Outward (Payment)"}
              </p>
              <p className="text-xs text-gray-500">
                {isSuspense
                  ? "Suspense"
                  : selectedAgency?.name || "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submission */}
      <div className="flex items-center justify-end gap-2">
        <Button type="submit" className="gap-2" loading={isSubmitting}>
          Submit Transaction
        </Button>
      </div>
    </form>
  );
}
