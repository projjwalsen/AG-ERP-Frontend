"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { agencyApi } from "@/app/services/agency.service";
import { branchApi } from "@/app/services/branch.service";
import { Agency, CreateTransactionPayload, TransactionDirection } from "@/app/types/transaction";
import { Branch } from "@/app/types/branch";
import { hasModulePermission } from "@/lib/usePermissions";
import {
  fetchOutstanding,
  createTransaction,
} from "@/app/store/transactionsSlice";
import { TransactionForm } from "../components/TransactionForm";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NewTransactionPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();
  const currentUser = useAppSelector((s) => s.auth.user);
  const outstanding = useAppSelector((s) => s.transactions.outstanding);
  const isSubmitting = useAppSelector((s) => s.transactions.isSubmitting);
  const permissions = useAppSelector((s) => s.auth.permissions);
  const canWrite = hasModulePermission(permissions, "TRANSACTION", "WRITE");

  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

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
   * The form is a controlled-component island. It owns its local state but
   * reports the latest agency/branch/direction up via this callback, so we
   * can refetch the outstanding balance on the right inputs.
   */
  const handleContextChange = React.useCallback(
    (ctx: {
      agencyId?: string;
      branchId?: string;
      direction?: TransactionDirection;
    }) => {
      if (!ctx.agencyId || !ctx.branchId || !ctx.direction) return;
      dispatch(
        fetchOutstanding({
          agencyId: ctx.agencyId,
          branchId: ctx.branchId,
          direction: ctx.direction,
        })
      ).catch(() => {
        // Outstanding is a non-critical preview; the form still works.
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
        title="New Transaction Entry"
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
          currentUser={{
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          }}
          isSubmitting={isSubmitting}
          onContextChange={handleContextChange}
          onSubmit={handleSubmit}
        />
      )}

      <ToastContainer />
    </div>
  );
}
