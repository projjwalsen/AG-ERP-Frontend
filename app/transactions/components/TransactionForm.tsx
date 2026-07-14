"use client";

import * as React from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  Building2,
  Info,
  Lock,
  Receipt,
  Layers,
  Landmark,
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
import { Badge } from "@/components/ui/badge";
import {
  Agency,
  Branch,
  PaymentMode,
  TransactionDirection,
  CreateTransactionPayload,
  AgencyOutstanding,
  PaymentThrough,
  PAYMENT_THROUGH_OPTIONS,
  requiredReferenceField,
  SETTLEMENT_TYPE_OPTIONS,
  SettlementType,
  OutstandingInvoice,
  FifoPreviewResponse,
  FifoAgencyPreview,
  FifoInvoicePreview,
} from "@/app/types/transaction";
import { AgencySelector, SUSPENSE_AGENCY_VALUE } from "./AgencySelector";
import {
  AgencyBalanceStrip,
  BalanceMetric,
} from "./AgencyBalanceStrip";
import { ThirdPartyAgencySection } from "./ThirdPartyAgencySection";
import { bankApi, BankAccount } from "@/app/services/bank.service";
import { formatCurrency, cn } from "@/lib/utils";

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
  /**
   * Outstanding invoices for the *primary* agency, populated via the
   * `/api/transactions/invoices` endpoint. Drawn as a radio list under
   * the Invoice-to-Invoice settlement path.
   */
  outstandingInvoices: OutstandingInvoice[];
  /**
   * Latest FIFO projection for the Lumpsum settlement. When
   * `canProceed` is false (or `reason` is set) the form shows a warning
   * strip and disables submit. Cleared when the user edits amount /
   * agency / 3rd-party.
   */
  fifoPreview: FifoPreviewResponse | null;
  isFifoPreviewing: boolean;
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
  /**
   * Called whenever the user changes a control that drives server-side
   * data fetches (primary agency, branch, direction, settlement type,
   * third-party agency). The page decides which thunks to dispatch.
   */
  onContextChange?: (ctx: {
    agencyId?: string;
    branchId?: string;
    direction?: TransactionDirection;
    thirdPartyAgencyId?: string;
    settlementType?: SettlementType;
  }) => void;
  /**
   * Ask the page to preview what a lumpsum allocation will look like
   * on approval. Debounced internally to avoid hammering the backend
   * on every keystroke.
   */
  onRequestFifoPreview?: (params: {
    primaryAgencyId?: string;
    thirdPartyAgencyId?: string;
    branchId?: string;
    direction?: TransactionDirection;
    amount?: number;
  }) => void;
}

function primaryMetric(direction: TransactionDirection): BalanceMetric {
  return direction === "INWARD" ? "DUE" : "RECEIVABLE";
}

function thirdPartyMetric(direction: TransactionDirection): BalanceMetric {
  return direction === "INWARD" ? "RECEIVABLE" : "DUE";
}

/**
 * Short debounce hook — used to throttle FIFO-preview requests as the
 * user types into the Amount input. Falls back to invoking immediately
 * after `delay` ms of inactivity.
 */
function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number
): (...args: A) => void {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const stable = React.useRef(fn);
  React.useEffect(() => {
    stable.current = fn;
  }, [fn]);
  return React.useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => stable.current(...args), delay);
    },
    [delay]
  );
}

function FifoPanel({
  preview,
  direction,
  isLoading,
}: {
  preview: FifoPreviewResponse | null;
  direction: TransactionDirection;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
        Computing FIFO preview…
      </div>
    );
  }
  if (!preview) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-3 text-xs text-gray-500 italic">
        Enter an amount to preview the FIFO allocation across both
        agencies.
      </div>
    );
  }

  const AgencyList = ({
    label,
    side,
    data,
  }: {
    label: string;
    side: "primary" | "thirdParty";
    data: FifoAgencyPreview;
  }) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className="font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
        <span className="tabular-nums">
          {formatCurrency(data.allocatedAmount)} /{" "}
          {formatCurrency(data.requestedAmount)}
        </span>
      </div>
      <div className="rounded-md border border-gray-200 bg-white">
        {data.invoices.length === 0 ? (
          <p className="px-3 py-3 text-xs text-gray-500 italic">
            No invoices to allocate against.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.invoices.map((row: FifoInvoicePreview) => (
              <li
                key={row.invoiceId}
                className="flex items-center justify-between px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-700">
                    {row.invoiceNo ?? row.invoiceId.slice(0, 8)}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-medium border-0",
                      row.settlementStatus === "FULLY_SETTLED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    )}
                  >
                    {row.settlementStatus === "FULLY_SETTLED"
                      ? "Full"
                      : "Partial"}
                  </Badge>
                </div>
                <div className="tabular-nums text-gray-700">
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(row.payingAmount)}
                  </span>
                  <span className="ml-2 text-gray-500">
                    of {formatCurrency(row.outstandingAmount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {!preview.canProceed && preview.reason && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {preview.reason}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AgencyList
          label={direction === "INWARD" ? "Primary (Customer)" : "Primary (Vendor)"}
          side="primary"
          data={preview.primaryAgency}
        />
        <AgencyList
          label={direction === "INWARD" ? "Third Party (Vendor)" : "Third Party (Customer)"}
          side="thirdParty"
          data={preview.thirdPartyAgency}
        />
      </div>
    </div>
  );
}

export function TransactionForm({
  branches,
  agencies,
  outstanding,
  thirdPartyOutstanding,
  outstandingInvoices,
  fifoPreview,
  isFifoPreviewing,
  currentUser,
  defaultBranchId,
  defaultDirection = "INWARD",
  agencyId: initialAgencyId,
  isSubmitting = false,
  onSubmit,
  onContextChange,
  onRequestFifoPreview,
}: TransactionFormProps) {
  // Direction is locked to the prop — the parent decides it via
  // `?direction=INWARD|OUTWARD` from the list-page tab.
  const [type] = React.useState<TransactionDirection>(defaultDirection);
  const [branchId, setBranchId] = React.useState<string>(
    defaultBranchId || branches[0]?.id || ""
  );
  const [agencyId, setAgencyId] = React.useState<string>(
    initialAgencyId || ""
  );

  // -----------------------------------------------------------------
  // Settlement type radio replaces the previous "3rd Party" toggle.
  //
  //   INVOICE_TO_INVOICE — single agency + single invoice (sale/purchase
  //                        depending on direction). Amount is locked
  //                        to invoice.outstandingAmount. No 3rd party.
  //
  //   LUMPSUM            — primary agency + a 3rd-party counter-party
  //                        + free-form amount that gets FIFO-split on
  //                        approval.
  //
  // The new flow removes the old `paymentType: "THIRD_PARTY"` mode.
  // -----------------------------------------------------------------
  const [settlementType, setSettlementType] =
    React.useState<SettlementType>("INVOICE_TO_INVOICE");

  // Bank accounts active under the currently selected branch. Populated
  // via `/api/bank/branch/:branchId` whenever `branchId` changes — the
  // backend already filters out inactive accounts for that endpoint.
  // Rendered under the "Payment Through" picker so users can attach the
  // transaction to a specific bank account (the value is sent to the
  // backend as `bankAccountId` in the create payload).
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] =
    React.useState(false);
  const [bankAccountId, setBankAccountId] = React.useState<string>("");

  const [thirdPartyAgencyId, setThirdPartyAgencyId] = React.useState<string>("");

  // INVOICE_TO_INVOICE: selected invoice id (string from the radio list).
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string>("");

  const [paymentThrough, setPaymentThrough] =
    React.useState<PaymentThrough | "">("");
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>("ONLINE");
  const [transactionRefNo, setTransactionRefNo] = React.useState<string>("");
  const [referenceNo, setReferenceNo] = React.useState<string>("");
  const [amount, setAmount] = React.useState<number>(0);
  const [remarks, setRemarks] = React.useState<string>("");

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const isSuspense = agencyId === SUSPENSE_AGENCY_VALUE;
  const realAgencyId = isSuspense ? "" : agencyId;

  // For LUMPSUM the form auto-fills "CASH" as paymentThrough — the
  // backend treats counter-party transfers as cash-equivalent.
  const effectivePaymentThrough: PaymentThrough | "" = isSuspense
    ? ""
    : settlementType === "LUMPSUM"
    ? "CASH"
    : paymentThrough;

  const selectedBranch = branches.find((b) => b.id === branchId) || null;
  const selectedAgency = agencies.find((a) => a.id === realAgencyId) || null;
  const selectedThirdParty =
    agencies.find((a) => a.id === thirdPartyAgencyId) || null;
  const selectedInvoice =
    outstandingInvoices.find((i) => i.id === selectedInvoiceId) || null;

  const thirdPartyAgencies = React.useMemo(
    () => agencies.filter((a) => a.id !== realAgencyId),
    [agencies, realAgencyId]
  );

  // Switching the primary agency must clear the 3rd party + invoice selection.
  React.useEffect(() => {
    setThirdPartyAgencyId("");
    setSelectedInvoiceId("");
  }, [realAgencyId]);

  // Switching settlement type invalidates cross-mode state.
  React.useEffect(() => {
    setSelectedInvoiceId("");
    setErrors((prev) => ({ ...prev, settlementType: "" }));
  }, [settlementType]);

  // Suspense disables settlement-type-driven fetches; clear the
  // 3rd-party selection when suspending.
  React.useEffect(() => {
    if (isSuspense) setThirdPartyAgencyId("");
  }, [isSuspense]);

  // Fetch active bank accounts for the selected branch. The backend's
  // `/api/bank/branch/:branchId` returns only active rows, so the
  // picker is always a list of accounts the user can actually post
  // to. Resetting `bankAccountId` when the branch changes avoids
  // posting a stale id.
  React.useEffect(() => {
    let cancelled = false;
    if (!branchId || isSuspense) {
      setBankAccounts([]);
      setBankAccountId("");
      return () => {
        cancelled = true;
      };
    }
    setBankAccountsLoading(true);
    (async () => {
      try {
        const res = await bankApi.getByBranch(branchId);
        if (cancelled) return;
        if (res.success && res.data) {
          setBankAccounts(res.data);
        } else {
          setBankAccounts([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load bank accounts", err);
          setBankAccounts([]);
        }
      } finally {
        if (!cancelled) setBankAccountsLoading(false);
      }
    })();
    setBankAccountId("");
    return () => {
      cancelled = true;
    };
  }, [branchId, isSuspense]);

  // Report context changes (including the new settlementType) up to the
  // page so it can fan out the right thunks.
  const lastReportedKey = React.useRef<string>("");
  React.useEffect(() => {
    if (!onContextChange) return;
    const reportedThirdPartyId =
      settlementType === "LUMPSUM" ? thirdPartyAgencyId : "";
    const key = [
      branchId,
      agencyId,
      type,
      settlementType,
      reportedThirdPartyId,
    ].join("|");
    if (key === lastReportedKey.current) return;
    lastReportedKey.current = key;
    onContextChange({
      branchId: branchId || undefined,
      agencyId: isSuspense ? undefined : realAgencyId || undefined,
      direction: type,
      settlementType: isSuspense ? undefined : settlementType,
      thirdPartyAgencyId:
        settlementType === "LUMPSUM" ? reportedThirdPartyId || undefined : undefined,
    });
  }, [
    branchId,
    agencyId,
    type,
    isSuspense,
    realAgencyId,
    settlementType,
    thirdPartyAgencyId,
    onContextChange,
  ]);

  // ----- Lumpsum FIFO preview (debounced as the user types) -----
  const debouncedRequestFifo = useDebouncedCallback(
    (params: Parameters<NonNullable<typeof onRequestFifoPreview>>[0]) => {
      onRequestFifoPreview?.(params);
    },
    350
  );

  React.useEffect(() => {
    if (settlementType !== "LUMPSUM") return;
    if (!onRequestFifoPreview) return;
    debouncedRequestFifo({
      primaryAgencyId: realAgencyId || undefined,
      thirdPartyAgencyId: thirdPartyAgencyId || undefined,
      branchId: branchId || undefined,
      direction: type,
      amount: Number.isFinite(amount) ? amount : 0,
    });
  }, [
    settlementType,
    realAgencyId,
    thirdPartyAgencyId,
    branchId,
    type,
    amount,
    onRequestFifoPreview,
    debouncedRequestFifo,
  ]);

  // ----- INVOICE_TO_INVOICE auto-fill -----
  // Selecting an invoice locks amount = outstandingAmount and tells the
  // user they're settling this exact bill.
  React.useEffect(() => {
    if (settlementType !== "INVOICE_TO_INVOICE") return;
    if (!selectedInvoice) return;
    setAmount(Number(selectedInvoice.outstandingAmount) || 0);
  }, [settlementType, selectedInvoice]);

  const dueAmount = outstanding
    ? Number(
        outstanding.amountDue ??
          (outstanding as { salesOutstanding?: number }).salesOutstanding ??
          0
      )
    : 0;
  const pendingAmount = outstanding
    ? Number(
        outstanding.amountReceivable ??
          (outstanding as { purchaseOutstanding?: number })
            .purchaseOutstanding ??
          0
      )
    : 0;

  const thirdPartyDueAmount = thirdPartyOutstanding
    ? Number(
        thirdPartyOutstanding.amountDue ??
          (thirdPartyOutstanding as { salesOutstanding?: number })
            .salesOutstanding ??
          0
      )
    : 0;
  const thirdPartyPendingAmount = thirdPartyOutstanding
    ? Number(
        thirdPartyOutstanding.amountReceivable ??
          (thirdPartyOutstanding as { purchaseOutstanding?: number })
            .purchaseOutstanding ??
          0
      )
    : 0;

  const refField = !effectivePaymentThrough
    ? null
    : requiredReferenceField(effectivePaymentThrough as PaymentThrough);

  // Only valid for INVOICE_TO_INVOICE (no payment block on LUMPSUM
  // since paymentThrough is CASH).
  const showPaymentBlock =
    !isSuspense && settlementType === "INVOICE_TO_INVOICE";

  const transactionNoRequired =
    showPaymentBlock &&
    paymentThrough !== "" &&
    paymentThrough !== "CASH";

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!branchId) next.branchId = "Branch is mandatory";
    if (!agencyId) {
      next.agencyId = "Please select an agency or Suspense Account";
    }

    if (!isSuspense) {
      // Settlement-type-specific validation.
      if (settlementType === "INVOICE_TO_INVOICE") {
        if (!selectedInvoiceId) {
          next.selectedInvoiceId = "Pick an invoice to settle";
        } else if (!selectedInvoice) {
          next.selectedInvoiceId = "Pick a valid invoice";
        }
      } else if (settlementType === "LUMPSUM") {
        if (!thirdPartyAgencyId) {
          next.thirdPartyAgencyId =
            "Counter-party agency is required for Lumpsum settlement";
        } else if (thirdPartyAgencyId === realAgencyId) {
          next.thirdPartyAgencyId =
            "Counter-party must differ from the primary agency";
        }
        // Block submit when the backend preview says we can't.
        if (fifoPreview && fifoPreview.canProceed === false) {
          next.amount =
            fifoPreview.reason ?? "Amount exceeds available outstanding";
        }
      }

      if (showPaymentBlock) {
        if (!paymentThrough) {
          next.paymentThrough = "Payment Through is required";
        } else if (transactionNoRequired && !transactionRefNo.trim()) {
          next.transactionRefNo =
            paymentThrough === "CHEQUE" || paymentThrough === "DD"
              ? "Transaction No is required for Cheque / DD"
              : "Transaction No is required for NEFT / RTGS / UPI";
        }
        const required = requiredReferenceField(
          paymentThrough as PaymentThrough
        );
        if (required === "referenceNo" && !referenceNo.trim()) {
          next.referenceNo = "Reference No is required for Cheque / DD";
        }
      }

      if (amount <= 0) {
        next.amount = "Amount must be greater than zero";
      }
      // INVOICE_TO_INVOICE amount is locked to invoice outstanding;
      // backend rejects any drift.
      if (
        settlementType === "INVOICE_TO_INVOICE" &&
        selectedInvoice &&
        Math.abs(amount - Number(selectedInvoice.outstandingAmount)) > 0.01
      ) {
        next.amount = "Amount must equal the selected invoice's outstanding";
      }
    }

    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    // For LUMPSUM the backend ignores paymentThrough (CASH is implicit),
    // so we don't send it. For INVOICE_TO_INVOICE we send the user's
    // selection; for Suspense we send "CASH".
    let paymentThroughOut: PaymentThrough;
    if (isSuspense) paymentThroughOut = "CASH";
    else if (settlementType === "LUMPSUM") paymentThroughOut = "CASH";
    else
      paymentThroughOut = paymentThrough
        ? (paymentThrough as PaymentThrough)
        : "CASH";

    const payload: CreateTransactionPayload = {
      branchId,
      direction: type,
      settlementType: isSuspense ? "INVOICE_TO_INVOICE" : settlementType,
      suspense: isSuspense,
      paymentThrough: paymentThroughOut,
      paymentMode,
      amount,
      ...(isSuspense || !realAgencyId ? {} : { agencyId: realAgencyId }),
      ...(settlementType === "LUMPSUM" && !isSuspense && thirdPartyAgencyId
        ? { thirdPartyAgencyId }
        : {}),
      ...(settlementType === "INVOICE_TO_INVOICE" &&
      !isSuspense &&
      selectedInvoice
        ? type === "INWARD"
          ? { saleId: selectedInvoice.id }
          : { purchaseId: selectedInvoice.id }
        : {}),
      ...(transactionRefNo.trim()
        ? { transactionRefNo: transactionRefNo.trim() }
        : {}),
      ...(referenceNo.trim() ? { referenceNo: referenceNo.trim() } : {}),
      ...(bankAccountId ? { bankAccountId } : {}),
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

          {/* Row 2: Settlement type */}
          {!isSuspense && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Settlement Type
                  </p>
                  <p className="text-xs text-gray-500">
                    Pick how this payment is settled against the agency's
                    balances.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {SETTLEMENT_TYPE_OPTIONS.map((opt) => {
                  const Icon =
                    opt.value === "INVOICE_TO_INVOICE" ? Receipt : Layers;
                  const active = settlementType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSettlementType(opt.value)}
                      className={cn(
                        "text-left border rounded-lg px-3 py-2.5 text-sm transition",
                        active
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center gap-2 font-medium text-gray-900">
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            active ? "text-green-600" : "text-gray-500"
                          )}
                        />
                        {opt.label}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 3: Invoice picker (INVOICE_TO_INVOICE) */}
          {!isSuspense && settlementType === "INVOICE_TO_INVOICE" && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {isInward ? "Sales" : "Purchase"} Invoice
                    <span className="text-red-500 ml-0.5">*</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Pick the {isInward ? "sale" : "purchase"} invoice this
                    transaction settles. The amount is locked to the
                    invoice's outstanding.
                  </p>
                </div>
              </div>
              {outstandingInvoices.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-200 p-3 text-xs text-gray-500 italic">
                  No outstanding invoices for this agency + branch + direction.
                </div>
              ) : (
                <div className="rounded-md border border-gray-200 max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {outstandingInvoices.map((inv) => {
                    const active = selectedInvoiceId === inv.id;
                    return (
                      <label
                        key={inv.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm",
                          active ? "bg-green-50" : "hover:bg-gray-50"
                        )}
                      >
                        <input
                          type="radio"
                          name="settlementInvoice"
                          value={inv.id}
                          checked={active}
                          onChange={() => {
                            setSelectedInvoiceId(inv.id);
                            setErrors((prev) => ({
                              ...prev,
                              selectedInvoiceId: "",
                              amount: "",
                            }));
                          }}
                        />
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                          <span className="font-mono text-xs text-gray-900">
                            {inv.invoiceNo ?? inv.id.slice(0, 8)}
                          </span>
                          <span className="text-xs text-gray-600">
                            Bill: {formatCurrency(Number(inv.grandTotal))}
                          </span>
                          <span className="text-xs text-gray-600">
                            Paid: {formatCurrency(Number(inv.allocatedAmount))}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 tabular-nums">
                            Due: {formatCurrency(Number(inv.outstandingAmount))}
                          </span>
                        </div>
                        {inv.partiallySettled && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-50 text-amber-700 border-0 text-[10px]"
                          >
                            Partial
                          </Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.selectedInvoiceId && (
                <p className="text-xs text-red-500">
                  {errors.selectedInvoiceId}
                </p>
              )}

              {selectedInvoice && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                  <p className="font-medium">
                    Settling {selectedInvoice.invoiceNo ?? selectedInvoice.id.slice(0, 8)}
                  </p>
                  <p className="text-green-700 mt-0.5">
                    Amount locked to{" "}
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(Number(selectedInvoice.outstandingAmount))}
                    </span>{" "}
                    to match the invoice's outstanding — backend enforces
                    full settlement for this path.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Row 4: 3rd party + FIFO (LUMPSUM) */}
          {!isSuspense && settlementType === "LUMPSUM" && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Counter-party Agency
                  <span className="text-red-500 ml-0.5">*</span>
                </p>
                <p className="text-xs text-gray-500">
                  Funds flow through this counter-party. The amount you
                  enter below will be split (FIFO) across both agencies'
                  outstanding invoices on approval.
                </p>
              </div>
              <ThirdPartyAgencySection
                agencies={thirdPartyAgencies}
                value={thirdPartyAgencyId}
                onChange={(v) => {
                  setThirdPartyAgencyId(v);
                  setErrors((prev) => ({
                    ...prev,
                    thirdPartyAgencyId: "",
                    amount: "",
                  }));
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

          {/* Row 5: Payment block — INVOICE_TO_INVOICE only */}
          {showPaymentBlock && (
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

              {/* Bank account — shown once a branch is picked and the
                  user has selected a non-cash Payment Through. Helps the
                  user attach the transaction to the bank account it
                  came from / went to. Driven by `bankAccounts`
                  populated from /api/bank/branch/:branchId. */}
              {branchId && paymentThrough && paymentThrough !== "CASH" && (
                <div className="space-y-1.5">
                  <Label htmlFor="bankAccount" className="flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-blue-600" />
                    Bank Account
                    <span className="text-gray-500 font-normal">
                      (optional)
                    </span>
                  </Label>
                  <select
                    id="bankAccount"
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={bankAccountsLoading}
                  >
                    <option value="">
                      {bankAccountsLoading
                        ? "Loading bank accounts…"
                        : bankAccounts.length === 0
                        ? "No bank accounts for this branch"
                        : "Select bank account"}
                    </option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} — {acc.accountNumber}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500">
                    Add a bank account for this branch from the{" "}
                    <span className="font-mono">Branches → Bank Accounts</span>{" "}
                    tab if the list is empty.
                  </p>
                </div>
              )}

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

          {/* Row 6: Amount + Remarks */}
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
                  if (
                    settlementType === "INVOICE_TO_INVOICE" &&
                    selectedInvoice
                  ) {
                    // locked to outstanding — ignore edits
                    return;
                  }
                  setAmount(Number(e.target.value));
                  setErrors((prev) => ({ ...prev, amount: "" }));
                }}
                placeholder="0.00"
                required
                disabled={
                  settlementType === "INVOICE_TO_INVOICE" && !!selectedInvoice
                }
              />
              {errors.amount && (
                <p className="text-xs text-red-500">{errors.amount}</p>
              )}
              {settlementType === "INVOICE_TO_INVOICE" && selectedInvoice && (
                <p className="text-[11px] text-gray-500">
                  <Info className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                  Locked to the selected invoice's outstanding.
                </p>
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

          {/* Row 6b: FIFO preview (LUMPSUM only) */}
          {settlementType === "LUMPSUM" && !isSuspense && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-gray-900">
                  FIFO Allocation Preview
                </p>
                <span className="text-[11px] text-gray-500">
                  What approval will look like
                </span>
              </div>
              <FifoPanel
                preview={fifoPreview}
                direction={type}
                isLoading={isFifoPreviewing}
              />
            </div>
          )}

          {/* Row 7: Audit line + Submit */}
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
              {!isSuspense && (
                <>
                  {" "}
                  • Settlement:{" "}
                  <span className="font-medium text-gray-700">
                    {settlementType === "INVOICE_TO_INVOICE"
                      ? "Invoice to Invoice"
                      : "Lumpsum"}
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
