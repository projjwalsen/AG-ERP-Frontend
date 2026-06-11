"use client";

import * as React from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  Building2,
  Info,
  Lock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Agency,
  Branch,
  PaymentMode,
  TransactionPaymentType as PaymentType,
  TransactionDirection,
  CreateTransactionPayload,
  AgencyOutstanding,
  PaymentThrough,
  PAYMENT_THROUGH_OPTIONS,
  requiredReferenceField,
} from "@/app/types/transaction";
import { AgencySelector, SUSPENSE_AGENCY_VALUE } from "./AgencySelector";
import {
  AgencyBalanceStrip,
  BalanceMetric,
} from "./AgencyBalanceStrip";
import { ThirdPartyAgencySection } from "./ThirdPartyAgencySection";

export interface TransactionFormUser {
  id: string;
  name: string;
  email: string;
}

interface TransactionFormProps {
  branches: Branch[];
  agencies: Agency[];
  /**
   * Outstanding for the *primary* agency (sales / purchase buckets from
   * `/transactions/outstanding`). Drives the primary AgencyBalanceStrip.
   */
  outstanding: AgencyOutstanding | null;
  /**
   * Outstanding for the *3rd party* counter-party, fetched independently
   * against the same endpoint with the 3rd party's id. The 3rd-party
   * balance strip reads this — never `outstanding` — so the figure shown
   * belongs to the counter-party, not the primary.
   */
  thirdPartyOutstanding: AgencyOutstanding | null;
  currentUser: TransactionFormUser;
  defaultBranchId?: string;
  /**
   * Direction the form opens in. The new-transaction page forwards its
   * `?direction=` query param here. Defaults to "INWARD".
   */
  defaultDirection?: TransactionDirection;
  agencyId?: string;
  isSubmitting?: boolean;
  onSubmit: (payload: CreateTransactionPayload) => void;
  onContextChange?: (ctx: {
    agencyId?: string;
    branchId?: string;
    direction?: TransactionDirection;
    thirdPartyAgencyId?: string;
  }) => void;
}

function primaryMetric(direction: TransactionDirection): BalanceMetric {
  return direction === "INWARD" ? "DUE" : "RECEIVABLE";
}

function thirdPartyMetric(direction: TransactionDirection): BalanceMetric {
  return direction === "INWARD" ? "RECEIVABLE" : "DUE";
}

export function TransactionForm({
  branches,
  agencies,
  outstanding,
  thirdPartyOutstanding,
  currentUser,
  defaultBranchId,
  defaultDirection = "INWARD",
  agencyId: initialAgencyId,
  isSubmitting = false,
  onSubmit,
  onContextChange,
}: TransactionFormProps) {
  // Direction is locked to the prop — the parent decides it via
  // `?direction=INWARD|OUTWARD` from the list-page tab. There is no
  // in-form toggle any more.
  const [type] = React.useState<TransactionDirection>(defaultDirection);
  const [branchId, setBranchId] = React.useState<string>(
    defaultBranchId || branches[0]?.id || ""
  );
  const [agencyId, setAgencyId] = React.useState<string>(
    initialAgencyId || ""
  );
  const [isThirdParty, setIsThirdParty] = React.useState<boolean>(false);
  const [thirdPartyAgencyId, setThirdPartyAgencyId] = React.useState<string>("");
  const [paymentThrough, setPaymentThrough] =
    React.useState<PaymentThrough | "">("");
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>("ONLINE");
  /**
   * Bank UTR / IMPS / UPI ref. Populated for NEFT / RTGS / UPI and shown
   * as the "Transaction No" field.
   */
  const [transactionRefNo, setTransactionRefNo] = React.useState<string>("");
  /**
   * Cheque / DD instrument number. Populated for CHEQUE / DD and shown
   * as the "Reference No" field.
   */
  const [referenceNo, setReferenceNo] = React.useState<string>("");
  const [amount, setAmount] = React.useState<number>(0);
  const [remarks, setRemarks] = React.useState<string>("");

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const isSuspense = agencyId === SUSPENSE_AGENCY_VALUE;
  const realAgencyId = isSuspense ? "" : agencyId;

  const selectedBranch = branches.find((b) => b.id === branchId) || null;
  const selectedAgency = agencies.find((a) => a.id === realAgencyId) || null;
  const selectedThirdParty =
    agencies.find((a) => a.id === thirdPartyAgencyId) || null;

  const thirdPartyAgencies = React.useMemo(
    () => agencies.filter((a) => a.id !== realAgencyId),
    [agencies, realAgencyId]
  );

  // Switching the primary agency must clear the 3rd party.
  React.useEffect(() => {
    setThirdPartyAgencyId("");
  }, [realAgencyId]);

  // Suspense forces 3rd-party OFF.
  React.useEffect(() => {
    if (isSuspense && isThirdParty) setIsThirdParty(false);
  }, [isSuspense, isThirdParty]);

  // Toggling 3rd-party on clears the counterpart selection.
  React.useEffect(() => {
    if (isThirdParty) {
      setPaymentThrough("");
      setTransactionRefNo("");
      setReferenceNo("");
    }
  }, [isThirdParty]);

  // Report the current selection up to the page so it can refetch outstanding.
  // The key includes the 3rd-party id so a change there (even with the same
  // primary agency) is reported — without that, the page would not know to
  // hit `/outstanding` for the counter-party.
  const lastReportedKey = React.useRef<string>("");
  React.useEffect(() => {
    if (!onContextChange) return;
    const reportedThirdPartyId = isThirdParty ? thirdPartyAgencyId : "";
    const key = [branchId, agencyId, type, reportedThirdPartyId].join("|");
    if (key === lastReportedKey.current) return;
    lastReportedKey.current = key;
    onContextChange({
      branchId: branchId || undefined,
      agencyId: isSuspense ? undefined : realAgencyId || undefined,
      direction: type,
      // Only forward the 3rd-party id when 3rd-party mode is on. When the
      // user toggles 3rd-party off, sending an empty string tells the page
      // to drop the previous fetch (the reducer keeps the stale value
      // otherwise, so the strip would briefly show the old counter-party).
      thirdPartyAgencyId: isThirdParty ? reportedThirdPartyId : undefined,
    });
  }, [
    branchId,
    agencyId,
    type,
    isSuspense,
    realAgencyId,
    isThirdParty,
    thirdPartyAgencyId,
    onContextChange,
  ]);

  // The backend's `/transactions/outstanding` endpoint returns two buckets:
  //   - salesOutstanding    → what the agency owes us (DUE Amount)
  //   - purchaseOutstanding → what we owe the agency (Amount Receivable)
  // The mapping is fixed; the form's direction only decides *which* strip
  // to surface (primary vs 3rd party), not which bucket feeds it.
  const dueAmount = outstanding ? outstanding.salesOutstanding : 0;
  const pendingAmount = outstanding ? outstanding.purchaseOutstanding : 0;

  // 3rd-party balance comes from its own outstanding slot, fetched against
  // the *counter-party* id — never the primary's. Until the counter-party
  // is picked (or the response is still in flight) the strip renders 0.
  const thirdPartyDueAmount = thirdPartyOutstanding
    ? thirdPartyOutstanding.salesOutstanding
    : 0;
  const thirdPartyPendingAmount = thirdPartyOutstanding
    ? thirdPartyOutstanding.purchaseOutstanding
    : 0;

  // Which reference field is required (or none) for the current
  // paymentThrough. 3rd party skips the payment block entirely.
  const refField = isThirdParty
    ? null
    : paymentThrough
    ? requiredReferenceField(paymentThrough)
    : null;

  // Transaction No is mandatory for every Payment Through value except
  // CASH (and the empty selection, which is handled by the
  // `paymentThrough` required check below). For NEFT / RTGS / UPI it
  // carries the UTR; for CHEQUE / DD it records the bank-side ref for
  // the same instrument.
  const transactionNoRequired =
    !isThirdParty && paymentThrough !== "" && paymentThrough !== "CASH";

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!branchId) next.branchId = "Branch is mandatory";
    if (!agencyId) {
      next.agencyId = "Please select an agency or Suspense Account";
    }
    if (amount <= 0) {
      next.amount = "Amount must be greater than zero";
    }
    if (!isThirdParty) {
      if (!paymentThrough) {
        next.paymentThrough = "Payment Through is required";
      } else {
        // Transaction No is required for every payment-through value
        // except CASH.
        if (transactionNoRequired && !transactionRefNo.trim()) {
          next.transactionRefNo =
            paymentThrough === "CHEQUE" || paymentThrough === "DD"
              ? "Transaction No is required for Cheque / DD"
              : "Transaction No is required for NEFT / RTGS / UPI";
        }
        // Reference No is required only for CHEQUE / DD.
        const required = requiredReferenceField(paymentThrough);
        if (required === "referenceNo" && !referenceNo.trim()) {
          next.referenceNo =
            "Reference No is required for Cheque / DD";
        }
      }
    }
    if (isThirdParty && !thirdPartyAgencyId) {
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
      // 3rd party → CASH (the form never sends a paymentThrough in that
      // case, but the payload type requires the field, so we hard-code
      // CASH as the canonical value the backend will see).
      paymentThrough: isThirdParty ? "CASH" : (paymentThrough as PaymentThrough),
      paymentMode,
      paymentType: (isThirdParty ? "THIRD_PARTY" : "NORMAL") as PaymentType,
      amount,
      ...(isSuspense || !realAgencyId ? {} : { agencyId: realAgencyId }),
      ...(isThirdParty && thirdPartyAgencyId
        ? { thirdPartyAgencyId }
        : {}),
      // UTR / IMPS / UPI ref — populated for NEFT / RTGS / UPI.
      ...(transactionRefNo.trim()
        ? { transactionRefNo: transactionRefNo.trim() }
        : {}),
      // Cheque / DD instrument number — populated for CHEQUE / DD.
      ...(referenceNo.trim() ? { referenceNo: referenceNo.trim() } : {}),
      ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
    };
    onSubmit(payload);
  };

  const DirectionIcon = type === "INWARD" ? ArrowDownToLine : ArrowUpFromLine;
  const isInward = type === "INWARD";

  return (
    <form onSubmit={handleSubmit}>
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Transaction Details
            <span
              className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isInward
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              <DirectionIcon className="h-3 w-3" />
              {isInward ? "Inward (Receipt)" : "Outward (Payment)"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {/* Row 1: Branch + Agency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="branch">
                Branch<span className="text-red-500 ml-0.5">*</span>
              </Label>
              <select
                id="branch"
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  setErrors((prev) => ({ ...prev, branchId: "" }));
                }}
                className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
              {errors.branchId && (
                <p className="text-xs text-red-500">{errors.branchId}</p>
              )}
            </div>

            <div>
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
                <p className="mt-1 text-xs text-red-500">{errors.agencyId}</p>
              )}

              {selectedAgency && !isSuspense && (
                <AgencyBalanceStrip
                  metric={primaryMetric(type)}
                  amount={
                    primaryMetric(type) === "DUE" ? dueAmount : pendingAmount
                  }
                />
              )}

              
            </div>
          </div>

          {/* Row 2: 3rd Party toggle */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  3rd Party Transaction
                </p>
                <p className="text-xs text-gray-500">
                  Funds flow through a counter-party agency on behalf of the
                  primary agency.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isSuspense) return;
                    setIsThirdParty(false);
                    setErrors((prev) => ({ ...prev, thirdPartyAgencyId: "" }));
                  }}
                  disabled={isSuspense}
                  className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-1.5 text-sm font-medium ${
                    !isThirdParty
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  } ${isSuspense ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isSuspense) return;
                    setIsThirdParty(true);
                  }}
                  disabled={isSuspense}
                  title={
                    isSuspense
                      ? "3rd Party is not available for Suspense Account transactions"
                      : undefined
                  }
                  className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-1.5 text-sm font-medium ${
                    isThirdParty
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  } ${isSuspense ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isSuspense ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5" />
                  )}
                  Yes — 3rd Party
                </button>
              </div>
            </div>

            {isThirdParty && (
              <div className="mt-3 space-y-2">
                <ThirdPartyAgencySection
                  agencies={thirdPartyAgencies}
                  value={thirdPartyAgencyId}
                  onChange={(v) => {
                    setThirdPartyAgencyId(v);
                    setErrors((prev) => ({ ...prev, thirdPartyAgencyId: "" }));
                  }}
                  error={errors.thirdPartyAgencyId}
                />
                {selectedThirdParty && (
                  <AgencyBalanceStrip
                    metric={thirdPartyMetric(type)}
                    amount={
                      thirdPartyMetric(type) === "DUE"
                        ? thirdPartyDueAmount
                        : thirdPartyPendingAmount
                    }
                  />
                )}
              </div>
            )}
          </div>

          {/* Row 3: Payment block — hidden for 3rd party */}
          {!isThirdParty && (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="paymentThrough">
                    Payment Through
                    <span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <select
                    id="paymentThrough"
                    value={paymentThrough}
                    onChange={(e) => {
                      setPaymentThrough(
                        e.target.value as PaymentThrough | ""
                      );
                      setErrors((prev) => ({ ...prev, paymentThrough: "" }));
                    }}
                    className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="">Select payment through</option>
                    {PAYMENT_THROUGH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.paymentThrough && (
                    <p className="text-xs text-red-500">
                      {errors.paymentThrough}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentMode">
                    Payment Mode<span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <select
                    id="paymentMode"
                    value={paymentMode}
                    onChange={(e) =>
                      setPaymentMode(e.target.value as PaymentMode)
                    }
                    className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="transactionRefNo">
                    Transaction No
                    {transactionNoRequired && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </Label>
                  <Input
                    id="transactionRefNo"
                    value={transactionRefNo}
                    onChange={(e) => {
                      setTransactionRefNo(e.target.value);
                      setErrors((prev) => ({ ...prev, transactionRefNo: "" }));
                    }}
                    placeholder={
                      transactionNoRequired
                        ? "e.g. UTR2026053100123"
                        : "Not required for the selected Payment Through"
                    }
                    // Disabled only for CASH (and the empty selection).
                    // Required for every other payment-through value —
                    // including CHEQUE and DD, where the user can still
                    // supply a UTR / IMPS / UPI ref if the instrument
                    // was settled electronically.
                    disabled={paymentThrough === "CASH" || paymentThrough === ""}
                    required={transactionNoRequired}
                  />
                  {errors.transactionRefNo && (
                    <p className="text-xs text-red-500">
                      {errors.transactionRefNo}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="referenceNo">
                    Reference No
                    {refField === "referenceNo" && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </Label>
                  <Input
                    id="referenceNo"
                    value={referenceNo}
                    onChange={(e) => {
                      setReferenceNo(e.target.value);
                      setErrors((prev) => ({ ...prev, referenceNo: "" }));
                    }}
                    placeholder={
                      refField === "referenceNo"
                        ? "Cheque / DD number"
                        : "Not required for the selected Payment Through"
                    }
                    disabled={refField !== "referenceNo"}
                    required={refField === "referenceNo"}
                  />
                  {errors.referenceNo && (
                    <p className="text-xs text-red-500">
                      {errors.referenceNo}
                    </p>
                  )}
                </div>
              </div>

              {paymentThrough && (
                <p className="text-[11px] text-gray-500">
                  {refField === "transactionRefNo" && (
                    <>
                      <span className="font-semibold text-gray-700">
                        {paymentThrough}
                      </span>{" "}
                      — fill in the Transaction No (UTR / IMPS / UPI ref).
                    </>
                  )}
                  {refField === "referenceNo" && (
                    <>
                      <span className="font-semibold text-gray-700">
                        {paymentThrough}
                      </span>{" "}
                      — fill in the Reference No (cheque / DD instrument)
                      and the Transaction No (bank UTR / IMPS / UPI ref).
                    </>
                  )}
                  {refField === null && (
                    <>
                      <span className="font-semibold text-gray-700">
                        {paymentThrough}
                      </span>{" "}
                      — neither Transaction No nor Reference No is required.
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Row 4: Amount + Remarks */}
          <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">
                Amount<span className="text-red-500 ml-0.5">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min={0}
                value={Number.isFinite(amount) ? amount : 0}
                onChange={(e) => {
                  setAmount(Number(e.target.value));
                  setErrors((prev) => ({ ...prev, amount: "" }));
                }}
                placeholder="0.00"
                required
              />
              {errors.amount && (
                <p className="text-xs text-red-500">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks for this transaction"
                rows={1}
              />
            </div>
          </div>

          {/* Row 5: Audit line + Submit */}
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-gray-500">
              Created by{" "}
              <span className="font-medium text-gray-700">
                {currentUser.name}
              </span>{" "}
              ({currentUser.email})
              {selectedBranch && (
                <>
                  {" "}
                  • Branch:{" "}
                  <span className="font-medium text-gray-700">
                    {selectedBranch.name}
                  </span>
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
              <Button type="submit" className="gap-2" loading={isSubmitting}>
                Create Transaction
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
