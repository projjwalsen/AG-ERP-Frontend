"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { agencyApi } from "@/app/services/agency.service";
import { branchApi } from "@/app/services/branch.service";
import {
  Agency,
  CreateTransactionPayload,
  SettlementType,
  TransactionDirection,
} from "@/app/types/transaction";
import { Branch } from "@/app/types/branch";
import { hasModulePermission } from "@/lib/usePermissions";
import {
  fetchOutstanding,
  fetchOutstandingInvoices,
  previewFifoAllocation,
  createTransaction,
  clearThirdPartyOutstanding,
  clearInvoiceAndFifoSlots,
} from "@/app/store/transactionsSlice";
import { TransactionForm } from "../components/TransactionForm";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NewTransactionPage() {
  // `useSearchParams` requires a Suspense boundary during static rendering.
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <NewTransactionContent />
    </React.Suspense>
  );
}

function NewTransactionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();
  const currentUser = useAppSelector((s) => s.auth.user);
  const outstanding = useAppSelector((s) => s.transactions.outstanding);
  const thirdPartyOutstanding = useAppSelector(
    (s) => s.transactions.thirdPartyOutstanding
  );
  const outstandingInvoices = useAppSelector(
    (s) => s.transactions.outstandingInvoices
  );
  const fifoPreview = useAppSelector((s) => s.transactions.fifoPreview);
  const isFifoPreviewing = useAppSelector(
    (s) => s.transactions.isFifoPreviewing
  );
  const isSubmitting = useAppSelector((s) => s.transactions.isSubmitting);
  const permissions = useAppSelector((s) => s.auth.permissions);
  const canWrite = hasModulePermission(permissions, "TRANSACTION", "WRITE");

  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  // The list page links here with `?direction=INWARD` or `?direction=OUTWARD`
  // so the form opens pre-set to that direction. Default to INWARD when
  // the param is missing or malformed.
  const directionParam = searchParams?.get("direction");
  const defaultDirection: TransactionDirection =
    directionParam === "OUTWARD" ? "OUTWARD" : "INWARD";

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [agenciesRes, branchesRes] = await Promise.all([
          agencyApi.getAll({ limit: 200 }),
          branchApi.getActive(),
        ]);
        if (cancelled) return;
        if (agenciesRes.success && agenciesRes.data) {
          setAgencies(agenciesRes.data.agencies || []);
        }
        if (branchesRes.success && branchesRes.data) {
          setBranches(branchesRes.data.branches || []);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load agencies and branches";
        addToast(message, "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  /**
   * Tracks the 3rd-party id we last kicked off a fetch for, so we can clear
   * `state.thirdPartyOutstanding` when the user picks a *different*
   * counter-party (or toggles 3rd-party off). Without this, the balance
   * strip would briefly render the previous counter-party's figures while
   * the new `/outstanding` call is in flight.
   */
  const lastFetchedThirdPartyId = React.useRef<string | null>(null);
  /**
   * Tracks the primary agency + branch + direction tuple under which
   * we last dispatched `fetchOutstandingInvoices`, so we can avoid
   * re-issuing identical requests when other form state changes
   * (settlement type, 3rd-party selection, etc.).
   */
  const lastInvoiceFetchKey = React.useRef<string | null>(null);

  /**
   * The form is a controlled-component island. It owns its local state but
   * reports the latest agency/branch/direction/settlement up via this
   * callback, so we can refetch the outstanding, the invoice picker, and
   * the FIFO preview on the right inputs.
   *
   * Routing rules:
   *   - primary outstanding → when primary agency set
   *   - third-party outstanding → when a 3rd party is set AND
   *     settlementType is "LUMPSUM" (other settlements don't show the
   *     counter-party balance strip)
   *   - invoice picker → when settlementType is "INVOICE_TO_INVOICE"
   *     AND primary agency + branch are set
   *   - FIFO preview is fired from the form by debounced user input on
   *     `amount` — see `requestFifoPreview` below.
   */
  const handleContextChange = React.useCallback(
    (ctx: {
      agencyId?: string;
      branchId?: string;
      direction?: TransactionDirection;
      thirdPartyAgencyId?: string;
      settlementType?: SettlementType;
    }) => {
      if (!ctx.branchId || !ctx.direction) return;

      // Primary outstanding — only meaningful when the primary agency
      // is set (real agency, not Suspense Account).
      if (ctx.agencyId) {
        dispatch(
          fetchOutstanding({
            agencyId: ctx.agencyId,
            branchId: ctx.branchId,
            direction: ctx.direction,
          })
        ).catch(() => {
          /* non-critical preview */
        });
      }

      // 3rd-party outstanding — only shown when settlement is LUMPSUM.
      const wantsThirdParty =
        ctx.settlementType === "LUMPSUM" && !!ctx.thirdPartyAgencyId;

      if (wantsThirdParty) {
        if (
          lastFetchedThirdPartyId.current !== null &&
          lastFetchedThirdPartyId.current !== ctx.thirdPartyAgencyId
        ) {
          dispatch(clearThirdPartyOutstanding());
        }
        lastFetchedThirdPartyId.current = ctx.thirdPartyAgencyId!;
        dispatch(
          fetchOutstanding({
            agencyId: ctx.thirdPartyAgencyId!,
            branchId: ctx.branchId,
            direction: ctx.direction,
            target: "thirdParty",
          })
        ).catch(() => {
          /* non-critical preview */
        });
      } else if (lastFetchedThirdPartyId.current !== null) {
        dispatch(clearThirdPartyOutstanding());
        lastFetchedThirdPartyId.current = null;
      }

      // Invoice picker — only when settlement is INVOICE_TO_INVOICE.
      // We dedupe so a context bump (e.g. settlement-type toggle while
      // agency is empty) doesn't re-issue an empty fetch.
      if (ctx.settlementType === "INVOICE_TO_INVOICE" && ctx.agencyId) {
        const key = `${ctx.agencyId}|${ctx.branchId}|${ctx.direction}`;
        if (lastInvoiceFetchKey.current !== key) {
          lastInvoiceFetchKey.current = key;
          dispatch(
            fetchOutstandingInvoices({
              agencyId: ctx.agencyId,
              branchId: ctx.branchId,
              direction: ctx.direction,
            })
          ).catch(() => {
            /* non-critical preview */
          });
        }
      } else {
        // Switching off invoice-to-invoice (or clearing primary) →
        // wipe the picker so a stale list doesn't linger.
        if (lastInvoiceFetchKey.current !== null) {
          lastInvoiceFetchKey.current = null;
          dispatch(clearInvoiceAndFifoSlots());
        }
      }
    },
    [dispatch]
  );

  /**
   * Fire a FIFO pre-flight. Called from the form whenever amount /
   * primary / 3rd-party / branch change in Lumpsum mode, debounced so
   * the backend isn't hammered as the user types.
   */
  const requestFifoPreview = React.useCallback(
    (params: {
      primaryAgencyId?: string;
      thirdPartyAgencyId?: string;
      branchId?: string;
      direction?: TransactionDirection;
      amount?: number;
    }) => {
      if (
        !params.primaryAgencyId ||
        !params.thirdPartyAgencyId ||
        !params.branchId ||
        !params.direction ||
        !params.amount ||
        params.amount <= 0
      ) {
        dispatch(clearInvoiceAndFifoSlots());
        return;
      }
      dispatch(
        previewFifoAllocation({
          primaryAgencyId: params.primaryAgencyId,
          thirdPartyAgencyId: params.thirdPartyAgencyId,
          branchId: params.branchId,
          direction: params.direction,
          amount: params.amount,
        })
      ).catch(() => {
        /* non-critical preview */
      });
    },
    [dispatch]
  );

  const handleSubmit = async (payload: CreateTransactionPayload) => {
    try {
      const result = await dispatch(createTransaction(payload)).unwrap();
      const created = result.data;
      addToast(
        `Transaction ${created?.transactionNo ?? ""} created successfully`,
        "success"
      );
      if (created?.id) {
        router.push(`/transactions/${created.id}`);
      } else {
        router.push("/transactions");
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to create transaction";
      addToast(message, "error");
    }
  };

  if (!currentUser) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/transactions">
            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
              <ArrowLeft className="h-4 w-4" />
              Back to Transactions
            </Button>
          </Link>
        </div>
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
          You must be signed in to create a transaction.
        </div>
        <ToastContainer />
      </div>
    );
  }

  if (!canWrite) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/transactions">
            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
              <ArrowLeft className="h-4 w-4" />
              Back to Transactions
            </Button>
          </Link>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              You do not have permission to create transactions
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ask your administrator to grant the{" "}
              <code className="font-mono text-[11px]">TRANSACTION:WRITE</code>{" "}
              permission.
            </p>
          </CardContent>
        </Card>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/transactions">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Transactions
          </Button>
        </Link>
      </div>

      <PageHeader
        title={
          defaultDirection === "INWARD"
            ? "New Inward Transaction"
            : "New Outward Transaction"
        }
        description="Record a new inward or outward payment. All fields marked with * are required."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Transactions", href: "/transactions" },
          { label: "New" },
        ]}
      />

      {loading ? (
        <div className="text-sm text-gray-500">Loading agencies and branches…</div>
      ) : (
        <TransactionForm
          branches={branches}
          agencies={agencies}
          outstanding={outstanding}
          thirdPartyOutstanding={thirdPartyOutstanding}
          outstandingInvoices={outstandingInvoices}
          fifoPreview={fifoPreview}
          isFifoPreviewing={isFifoPreviewing}
          currentUser={{
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          }}
          isSubmitting={isSubmitting}
          defaultDirection={defaultDirection}
          onContextChange={handleContextChange}
          onRequestFifoPreview={requestFifoPreview}
          onSubmit={handleSubmit}
        />
      )}

      <ToastContainer />
    </div>
  );
}
