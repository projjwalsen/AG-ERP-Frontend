"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck,
  Banknote,
  Wallet,
  Building2,
  User as UserIcon,
  AlertCircle,
  Info,
  Lock,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Agency,
  AgencyOutstanding,
  Branch,
  PaymentMode,
  PaymentThrough,
  PAYMENT_THROUGH_OPTIONS,
  Transaction,
  TransactionDirection,
  requiredReferenceField,
} from "@/app/types/transaction";
import { StatusBadge } from "./StatusBadge";
import { AgencyBalanceStrip, BalanceMetric } from "./AgencyBalanceStrip";

/**
 * The set of fields the manager is allowed to edit while authenticating a
 * suspense transaction. The parent receives this on confirm and PATCHes the
 * transaction with it (clearing `suspenseAccount`) before approving.
 *
 * For non-suspense transactions the modal still calls onConfirm, but the
 * `edit` argument is `null` — no update, straight to approve.
 */
export interface AuthenticationEdit {
  agencyId: string;
  thirdPartyAgencyId: string | null;
  paymentType: "NORMAL" | "THIRD_PARTY";
  paymentThrough: PaymentThrough;
  paymentMode: PaymentMode;
  transactionRefNo: string;
  referenceNo: string;
  amount: number;
  remarks: string;
}

interface AuthenticationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  /**
   * Full agency list for the suspense-reconciliation picker and the
   * 3rd-party dropdown. Pass `[]` for non-suspense flows.
   */
  agencies: Agency[];
  /**
   * Live outstanding figures for the **primary** agency. The parent fetches
   * them and feeds the result back. The modal uses them to render the DUE /
   * Amount Receivable strip under the primary-agency selection.
   */
  outstanding: AgencyOutstanding | null;
  /**
   * Live outstanding figures for the **3rd-party** counter-party (only
   * meaningful when the manager has picked a 3rd party on a THIRD_PARTY
   * transaction). The parent is responsible for fetching against the
   * 3rd-party agency id and routing the result here. If omitted, the
   * 3rd-party strip silently falls back to 0.
   */
  thirdPartyOutstanding?: AgencyOutstanding | null;
  /**
   * Fired when the manager picks an agency, switches payment type, etc.
   * The parent uses this to call `fetchOutstanding` and update the
   * `outstanding` prop. Debouncing is the parent's responsibility.
   *
   * `thirdPartyAgencyId` is included when the manager picked a 3rd-party
   * counter-party so the parent can fire a *second* fetch (routed to the
   * `thirdPartyOutstanding` slot) against the counter-party's own id —
   * otherwise the 3rd-party strip would just show the primary's numbers.
   */
  onContextChange: (ctx: {
    agencyId: string;
    branchId: string;
    direction: TransactionDirection;
    thirdPartyAgencyId?: string;
  }) => void;
  /**
   * Called on the final "Yes, Authenticate" click.
   *  - Suspense + manager made edits → `edit` is the patch payload.
   *  - Non-suspense OR manager didn't change anything → `edit` is `null`.
   */
  onConfirm: (edit: AuthenticationEdit | null) => void;
  loading?: boolean;
}

// Direction-aware metric for the primary agency. Mirrors the new-transaction
// form's behaviour.
function primaryMetric(direction: TransactionDirection): BalanceMetric {
  return direction === "INWARD" ? "DUE" : "RECEIVABLE";
}
function thirdPartyMetric(direction: TransactionDirection): BalanceMetric {
  return direction === "INWARD" ? "RECEIVABLE" : "DUE";
}

export function AuthenticationModal({
  open,
  onOpenChange,
  transaction,
  agencies,
  outstanding,
  thirdPartyOutstanding,
  onContextChange,
  onConfirm,
  loading,
}: AuthenticationModalProps) {
  const [confirmOpen, setConfirmOpen] = React.useState<boolean>(false);
  // Editable reconciliation state. Initialised from the transaction row
  // every time the modal opens, so reopening a different transaction
  // resets the form.
  const [edit, setEdit] = React.useState<AuthenticationEdit | null>(null);

  React.useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
      return;
    }
    if (!transaction) return;
    setEdit({
      agencyId: transaction.agencyId ?? "",
      thirdPartyAgencyId: transaction.thirdPartyAgencyId ?? null,
      paymentType: transaction.paymentType,
      // For 3rd party the form always sends CASH. For NORMAL fall back
      // to whatever the row carries (or CASH if neither set).
      paymentThrough:
        transaction.paymentType === "THIRD_PARTY"
          ? "CASH"
          : (transaction.paymentThrough as PaymentThrough) ?? "CASH",
      paymentMode: transaction.paymentMode,
      transactionRefNo: transaction.transactionRefNo ?? "",
      referenceNo: transaction.referenceNo ?? "",
      amount: transaction.amount,
      remarks: transaction.remarks ?? "",
    });
  }, [open, transaction]);

  // Tell the parent to (re)fetch outstanding whenever the agency in scope
  // changes — either because the manager picked a new one for a SUSPENSE
  // reconciliation, or because the modal was opened against a different
  // non-suspense transaction (where the agency is `transaction.agencyId`).
  // The 3rd-party counter-party is forwarded too so the parent can fire
  // a *second* fetch against the counter-party's own id — otherwise the
  // 3rd-party strip would just show the primary's numbers.
  // Both `edit` and `transaction` are nullable state, so the effect must
  // guard at the top — running the hook unconditionally (above the early
  // return) keeps React's hook order stable across renders.
  const lastCtxKey = React.useRef<string>("");
  React.useEffect(() => {
    if (!edit) return;
    if (!transaction) return;
    // For suspense, only fire once the manager has actually picked an
    // agency. For non-suspense, the agency is fixed at the transaction
    // row level — read it directly from `transaction.agencyId` so the
    // strip is populated immediately when the modal opens.
    const agencyId = transaction.suspenseAccount
      ? edit.agencyId
      : (transaction.agencyId ?? "");
    if (!agencyId) return;
    // Resolve the 3rd-party id the same way: from the live edit state
    // (manager-driven 3rd-party picker) when one is set, otherwise fall
    // back to the row-level thirdPartyAgencyId.
    const thirdPartyAgencyId =
      edit.thirdPartyAgencyId ?? transaction.thirdPartyAgencyId ?? undefined;
    const key = [
      agencyId,
      transaction.branchId,
      transaction.direction,
      thirdPartyAgencyId ?? "",
    ].join("|");
    if (key === lastCtxKey.current) return;
    lastCtxKey.current = key;
    onContextChange({
      agencyId,
      branchId: transaction.branchId,
      direction: transaction.direction,
      thirdPartyAgencyId,
    });
  }, [edit, transaction, onContextChange]);

  if (!transaction || !edit) return null;

  const isSuspense = transaction.suspenseAccount;
  const direction = transaction.direction;
  const branches: Branch[] = []; // kept for type compat; the modal uses
  // the transaction's branchId directly and does not offer a branch
  // switcher (branch is locked at creation time).

  // ------- form derivation -------
  const isThirdParty = edit.paymentType === "THIRD_PARTY";
  const refField = isThirdParty
    ? null
    : edit.paymentThrough
    ? requiredReferenceField(edit.paymentThrough)
    : null;
  const transactionNoRequired =
    !isThirdParty && edit.paymentThrough !== "CASH";

  // Selected agency object (for the strip + 3rd-party exclusion).
  const selectedAgency = agencies.find((a) => a.id === edit.agencyId) || null;
  const thirdPartyAgencies = agencies.filter(
    (a) => a.id !== edit.agencyId
  );
  const selectedThirdParty =
    agencies.find((a) => a.id === edit.thirdPartyAgencyId) || null;

  // Outstanding figures — pull the same two buckets the new-transaction
  // form reads from `/transactions/outstanding`.
  // The backend now returns `amountDue` (sales outstanding) and
  // `amountReceivable` (purchase outstanding) — read those first, and
  // fall back to the legacy `salesOutstanding` / `purchaseOutstanding`
  // keys for older responses.
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
          (outstanding as { purchaseOutstanding?: number }).purchaseOutstanding ??
          0
      )
    : 0;

  // 3rd-party counter-party: its own outstanding slot, fetched against
  // the *counter-party* id — never the primary's. Until the counter-party
  // is picked (or the response is still in flight) the strip renders 0.
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

  // ------- form-level validation -------
  const errors = (() => {
    const e: Record<string, string> = {};
    if (isSuspense && !edit.agencyId) {
      e.agencyId = "Please pick an agency to reconcile this suspense entry";
    }
    if (!isThirdParty) {
      if (!edit.paymentThrough) {
        e.paymentThrough = "Payment Through is required";
      } else {
        if (transactionNoRequired && !edit.transactionRefNo.trim()) {
          e.transactionRefNo =
            edit.paymentThrough === "CHEQUE" || edit.paymentThrough === "DD"
              ? "Transaction No is required for Cheque / DD"
              : "Transaction No is required for NEFT / RTGS / UPI";
        }
        if (
          requiredReferenceField(edit.paymentThrough) === "referenceNo" &&
          !edit.referenceNo.trim()
        ) {
          e.referenceNo = "Reference No is required for Cheque / DD";
        }
      }
    }
    if (!(edit.amount > 0)) {
      e.amount = "Amount must be greater than zero";
    }
    if (isThirdParty && !edit.thirdPartyAgencyId) {
      e.thirdPartyAgencyId =
        "3rd Party Agency is mandatory for 3rd Party Transactions";
    }
    return e;
  })();

  const canProceed = Object.keys(errors).length === 0;

  const PaymentIcon =
    edit.paymentMode === "ONLINE" ? Banknote : Wallet;
  const paymentLabel = edit.paymentThrough
    ? edit.paymentThrough
    : edit.paymentMode === "ONLINE"
    ? "Online"
    : "Offline";

  // Suppress unused-var warnings for items we may need to display later
  // when the user re-uses the modal for non-suspense flows.
  void branches;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Authenticate Voucher
              <span className="font-mono text-xs text-gray-500">
                {transaction.transactionNo}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Transaction Summary — read-only context */}
            <Card>
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">
                    Transaction Summary
                  </p>
                  <p className="font-mono font-semibold text-gray-900">
                    {transaction.transactionNo}
                  </p>
                </div>
                <StatusBadge status={transaction.status} />
              </div>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Created At</p>
                  <p className="font-medium text-sm">
                    {formatDateTime(transaction.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Type</p>
                  <p className="font-medium text-sm">{direction}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Branch</p>
                  <p className="font-medium text-sm">
                    {transaction.branch?.name || "-"}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {transaction.branch?.code || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Amount</p>
                  <p className="font-semibold text-green-600 text-sm">
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Audit Info — read-only context */}
            <Card>
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-gray-900">Audit Info</p>
              </div>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Created By</p>
                  <p className="font-medium text-sm">
                    {transaction.createdBy?.name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Created At</p>
                  <p className="font-medium text-sm">
                    {formatDateTime(transaction.createdAt)}
                  </p>
                </div>
                {transaction.agency && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Agency</p>
                    <p className="font-medium text-sm flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      {transaction.agency.name}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ============== EDITABLE RECONCILIATION ============== */}
            <Card className="border-amber-200 bg-amber-50/40">
              <div className="p-4 border-b border-amber-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-900">
                  {isSuspense
                    ? "Suspense Reconciliation"
                    : "Review & Edit Voucher"}
                </p>
              </div>
              <CardContent className="space-y-5 pt-4">
                {/* Header explainer */}
                {isSuspense ? (
                  <p className="text-xs text-amber-800 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    This voucher is held in suspense. Map it to an agency,
                    verify the payment details, and confirm to authenticate.
                    Edits here are persisted before approval.
                  </p>
                ) : (
                  <p className="text-xs text-gray-600 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    You can adjust the fields below before authenticating. Any
                    edits are saved before the voucher is approved.
                  </p>
                )}

                {/* Row 1: Agency (required when suspense) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-agency">
                      Agency
                      {isSuspense && (
                        <span className="text-red-500 ml-0.5">*</span>
                      )}
                    </Label>
                    <select
                      id="auth-agency"
                      value={edit.agencyId}
                      onChange={(e) =>
                        setEdit((s) =>
                          s
                            ? { ...s, agencyId: e.target.value }
                            : s
                        )
                      }
                      className="flex h-9 w-full border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required={isSuspense}
                    >
                      <option value="">Select agency…</option>
                      {agencies.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    {errors.agencyId && (
                      <p className="text-xs text-red-500">
                        {errors.agencyId}
                      </p>
                    )}

                    {/* Direction-aware DUE/Receivable strip under the
                        primary agency. Single metric, picked by
                        `primaryMetric(direction)`. Visible whenever an
                        agency is selected — including on 3rd-party
                        flows, so the manager always sees the primary
                        counter-party's relevant figure. */}
                    {selectedAgency && (
                      <AgencyBalanceStrip
                        metric={primaryMetric(direction)}
                        amount={
                          primaryMetric(direction) === "DUE"
                            ? dueAmount
                            : pendingAmount
                        }
                      />
                    )}
                  </div>

                  {/* Row 2: 3rd Party toggle + (optional) 3rd party select */}
                  <div className="space-y-1.5">
                    <Label>3rd Party Transaction</Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEdit((s) =>
                            s
                              ? {
                                  ...s,
                                  paymentType: "NORMAL",
                                  thirdPartyAgencyId: null,
                                }
                              : s
                          )
                        }
                        className={`flex-1 flex items-center justify-center gap-2 border rounded-lg px-3 py-1.5 text-sm font-medium ${
                          !isThirdParty
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEdit((s) =>
                            s
                              ? {
                                  ...s,
                                  paymentType: "THIRD_PARTY",
                                  // CASH is the canonical 3rd-party mode.
                                  paymentThrough: "CASH",
                                }
                              : s
                          )
                        }
                        className={`flex-1 flex items-center justify-center gap-2 border rounded-lg px-3 py-1.5 text-sm font-medium ${
                          isThirdParty
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Yes — 3rd Party
                      </button>
                    </div>

                    {isThirdParty && (
                      <div className="space-y-1.5">
                        <select
                          value={edit.thirdPartyAgencyId ?? ""}
                          onChange={(e) =>
                            setEdit((s) =>
                              s
                                ? {
                                    ...s,
                                    thirdPartyAgencyId:
                                      e.target.value || null,
                                  }
                                : s
                            )
                          }
                          className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          required
                        >
                          <option value="">Select 3rd party agency…</option>
                          {thirdPartyAgencies.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        {errors.thirdPartyAgencyId && (
                          <p className="text-xs text-red-500">
                            {errors.thirdPartyAgencyId}
                          </p>
                        )}
                        {selectedThirdParty && (
                          <AgencyBalanceStrip
                            metric={thirdPartyMetric(direction)}
                            amount={
                              thirdPartyMetric(direction) === "DUE"
                                ? thirdPartyDueAmount
                                : thirdPartyPendingAmount
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: Payment block — hidden for 3rd party */}
                {!isThirdParty && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="auth-paymentThrough">
                          Payment Through
                          <span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <select
                          id="auth-paymentThrough"
                          value={edit.paymentThrough}
                          onChange={(e) =>
                            setEdit((s) =>
                              s
                                ? {
                                    ...s,
                                    paymentThrough: e.target
                                      .value as PaymentThrough,
                                  }
                                : s
                            )
                          }
                          className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          required
                        >
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
                        <Label htmlFor="auth-paymentMode">
                          Payment Mode
                          <span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <select
                          id="auth-paymentMode"
                          value={edit.paymentMode}
                          onChange={(e) =>
                            setEdit((s) =>
                              s
                                ? {
                                    ...s,
                                    paymentMode: e.target
                                      .value as PaymentMode,
                                  }
                                : s
                            )
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
                        <Label htmlFor="auth-txnNo">
                          Transaction No
                          {transactionNoRequired && (
                            <span className="text-red-500 ml-0.5">*</span>
                          )}
                        </Label>
                        <Input
                          id="auth-txnNo"
                          value={edit.transactionRefNo}
                          onChange={(e) =>
                            setEdit((s) =>
                              s
                                ? {
                                    ...s,
                                    transactionRefNo: e.target.value,
                                  }
                                : s
                            )
                          }
                          placeholder={
                            transactionNoRequired
                              ? "e.g. UTR2026053100123"
                              : "Not required for the selected Payment Through"
                          }
                          disabled={edit.paymentThrough === "CASH"}
                          required={transactionNoRequired}
                        />
                        {errors.transactionRefNo && (
                          <p className="text-xs text-red-500">
                            {errors.transactionRefNo}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="auth-refNo">
                          Reference No
                          {refField === "referenceNo" && (
                            <span className="text-red-500 ml-0.5">*</span>
                          )}
                        </Label>
                        <Input
                          id="auth-refNo"
                          value={edit.referenceNo}
                          onChange={(e) =>
                            setEdit((s) =>
                              s
                                ? {
                                    ...s,
                                    referenceNo: e.target.value,
                                  }
                                : s
                            )
                          }
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

                    {edit.paymentThrough && (
                      <p className="text-[11px] text-gray-500">
                        {refField === "referenceNo" && (
                          <>
                            <span className="font-semibold text-gray-700">
                              {edit.paymentThrough}
                            </span>{" "}
                            — fill in the Reference No (cheque / DD instrument)
                            and the Transaction No (bank UTR / IMPS / UPI ref).
                          </>
                        )}
                        {refField === "transactionRefNo" && (
                          <>
                            <span className="font-semibold text-gray-700">
                              {edit.paymentThrough}
                            </span>{" "}
                            — fill in the Transaction No (UTR / IMPS / UPI ref).
                          </>
                        )}
                        {refField === null && (
                          <>
                            <span className="font-semibold text-gray-700">
                              {edit.paymentThrough}
                            </span>{" "}
                            — neither Transaction No nor Reference No is
                            required.
                          </>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {/* Row 4: Amount + Remarks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-amount">
                      Amount<span className="text-red-500 ml-0.5">*</span>
                    </Label>
                    <Input
                      id="auth-amount"
                      type="number"
                      min={0}
                      value={Number.isFinite(edit.amount) ? edit.amount : 0}
                      onChange={(e) =>
                        setEdit((s) =>
                          s ? { ...s, amount: Number(e.target.value) } : s
                        )
                      }
                      required
                    />
                    {errors.amount && (
                      <p className="text-xs text-red-500">{errors.amount}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="auth-remarks">Remarks</Label>
                    <Textarea
                      id="auth-remarks"
                      value={edit.remarks}
                      onChange={(e) =>
                        setEdit((s) =>
                          s ? { ...s, remarks: e.target.value } : s
                        )
                      }
                      rows={1}
                    />
                  </div>
                </div>

                {/* Payment-mode badge — read-only summary so the
                    manager sees the current instrument + channel at a
                    glance. Updated live from the editable form above. */}
                <div className="border-t border-amber-200 pt-3 flex items-center gap-2 text-xs text-gray-600">
                  <PaymentIcon className="h-3.5 w-3.5 text-blue-600" />
                  <span>
                    {direction}{" "}
                    <span className="text-gray-400">•</span>{" "}
                    {paymentLabel}
                    {transaction.thirdPartyAgencyId && !isThirdParty
                      ? " (3rd party was previously set)"
                      : null}
                  </span>
                  {isThirdParty && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                      <Lock className="h-2.5 w-2.5" />
                      3rd Party — CASH
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Voucher Remarks — read-only context (the live editable
                remarks live in the form above). Kept for the rare case
                the manager wants to skim history. */}
            {transaction.remarks && !edit.remarks && (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Original Voucher Remarks
                </p>
                <p className="text-sm">{transaction.remarks}</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              className="gap-2"
              loading={loading}
              disabled={!canProceed}
              title={
                !canProceed
                  ? "Fix the highlighted fields to enable authentication"
                  : undefined
              }
            >
              <ShieldCheck className="h-4 w-4" />
              Authenticate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Confirm Authentication
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700 py-2">
            Are you sure you want to authenticate this voucher?
          </p>
          {isSuspense && edit.agencyId && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
              The voucher will first be updated to map to{" "}
              <span className="font-semibold">
                {agencies.find((a) => a.id === edit.agencyId)?.name}
              </span>{" "}
              (and any other field edits you've made), and then authenticated.
            </p>
          )}
          <p className="text-xs text-gray-500">
            Once authenticated, the voucher{" "}
            <span className="font-mono font-semibold">
              {transaction.transactionNo}
            </span>{" "}
            will move to{" "}
            <span className="font-semibold">APPROVED</span> and be locked from
            further edits.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                // Pass the full edit payload so the parent can PATCH the
                // transaction (clearing suspense, attaching the agency,
                // and applying any other field edits) before approving.
                onConfirm(edit);
              }}
              className="gap-2"
              loading={loading}
            >
              <ShieldCheck className="h-4 w-4" />
              Yes, Authenticate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
