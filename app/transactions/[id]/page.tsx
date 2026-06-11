"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  IndianRupee,
  Mail,
  Phone,
  Printer,
  ShieldCheck,
  User as UserIcon,
  Wallet,
  Banknote,
  AlertCircle,
  Hash,
  XCircle,
  Receipt,
  Globe,
  Users,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { hasModulePermission } from "@/lib/usePermissions";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchTransactionById,
} from "@/app/store/transactionsSlice";
import { StatusBadge } from "../components/StatusBadge";
import { TransactionTimeline } from "../components/TransactionTimeline";
import { AuditLog, MockTransactionStatus } from "../types/mock";

// ============== INFO ROW ==============
function InfoRow({
  label,
  value,
  icon: Icon,
  mono,
  truncate,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-sm font-medium text-gray-900 mt-0.5 flex items-center gap-1.5 ${
          mono ? "font-mono" : ""
        } ${truncate ? "truncate" : ""}`}
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}

// ============== SECTION CARD ==============
function SectionCard({
  title,
  icon: Icon,
  children,
  actions,
  accent,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  actions?: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-lg ${
                accent || "bg-blue-50"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  accent?.includes("emerald")
                    ? "text-emerald-600"
                    : accent?.includes("amber")
                    ? "text-amber-600"
                    : accent?.includes("rose")
                    ? "text-rose-600"
                    : accent?.includes("violet")
                    ? "text-violet-600"
                    : "text-blue-600"
                }`}
              />
            </div>
            <CardTitle className="text-sm font-semibold text-gray-900">
              {title}
            </CardTitle>
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

export default function TransactionDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const txn = useAppSelector((s) => s.transactions.currentTransaction);
  const isLoading = useAppSelector((s) => s.transactions.isLoading);
  const error = useAppSelector((s) => s.transactions.error);
  const permissions = useAppSelector((s) => s.auth.permissions);

  const canView = hasModulePermission(permissions, "TRANSACTION", "VIEW");
  const canWrite = hasModulePermission(permissions, "TRANSACTION", "WRITE");
  const canApprove = hasModulePermission(
    permissions,
    "TRANSACTION",
    "APPROVE"
  );

  // Fetch the transaction whenever the id (or view permission) changes.
  // The `state.transactions.currentTransaction` slot is naturally overwritten
  // by every new fetch, so we don't need an unmount-cleanup effect — and
  // adding one risks it running under React 18 strict mode between the
  // fetch dispatch and its resolution, wiping the row that just arrived.
  React.useEffect(() => {
    if (!canView) return;
    dispatch(fetchTransactionById(params.id));
  }, [dispatch, params.id, canView]);

  React.useEffect(() => {
    if (error) addToast(error, "error");
  }, [error, addToast]);

  if (!canView) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Transaction"
          description="You do not have permission to view this transaction"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Transactions", href: "/transactions" },
            { label: "Restricted" },
          ]}
        />
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              You do not have permission to view transactions
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ask your administrator to grant the{" "}
              <code className="font-mono text-[11px]">TRANSACTION:VIEW</code>{" "}
              permission.
            </p>
          </CardContent>
        </Card>
        <ToastContainer />
      </div>
    );
  }

  // Treat "we have no row yet" as loading regardless of the isLoading flag.
  // On the first render the slice's `currentTransaction` is null and
  // `isLoading` is also false, which used to fall through to the
  // "Not Found" branch for a single frame before the fetch effect ran.
  // The intent of the page is to either show the row, an explicit error,
  // or the loading skeleton — never "not found" without giving the network
  // request a chance to complete.
  // Skeleton: only while the fetch is in flight. Once isLoading flips to
  // false, the response has either fulfilled (txn set) or rejected (error
  // set) — anything else would mean the request was abandoned mid-flight,
  // and we fall through to "Not Found" rather than spin forever.
  if (isLoading && !txn && !error) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Transaction Not Found"
          description="The requested voucher could not be located."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Transactions", href: "/transactions" },
            { label: "Not Found" },
          ]}
        />
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Voucher{" "}
              <span className="font-mono font-semibold">{params.id}</span> does
              not exist.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/transactions")}
            >
              Back to Transactions
            </Button>
          </CardContent>
        </Card>
        <ToastContainer />
      </div>
    );
  }

  const isInward = txn.direction === "INWARD";
  const isApproved = txn.status === "APPROVED";
  const isRejected = txn.status === "REJECTED";
  const isPending = txn.status === "PENDING";

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
        title={`Voucher ${txn.transactionNo}`}
        description={`Status: ${txn.status.replace(/_/g, " ")} • Created on ${formatDateTime(
          txn.createdAt
        )}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Transactions", href: "/transactions" },
          { label: txn.transactionNo },
        ]}
        actions={
          <>
            {/* <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            {isPending && canWrite && (
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )} */}
            {isPending && canApprove && (
              <Link href="/transactions/pending">
                <Button
                  className="gap-2"
                  onClick={() => {}}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Authenticate
                </Button>
              </Link>
            )}
          </>
        }
      />

      {/* Status banners */}
      {isPending && (
        <Card className="border-0 shadow-sm bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 shrink-0">
                <Clock className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Awaiting Manager Authentication
                </p>
                <p className="text-xs text-amber-800/80 mt-0.5">
                  This voucher was submitted on{" "}
                  {formatDateTime(txn.createdAt)} and is in the authentication
                  queue.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isRejected && (
        <Card className="border-0 shadow-sm bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100 shrink-0">
                <XCircle className="h-4 w-4 text-red-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-900">
                  Voucher Rejected
                </p>
                {txn.remarks && (
                  <p className="text-xs text-red-800/80 mt-0.5">
                    Reason: {txn.remarks}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isApproved && (
        <Card className="border-0 shadow-sm bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-900">
                  Voucher Authenticated
                </p>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  Authenticated by {txn.approvedBy?.name ?? "—"} on{" "}
                  {txn.approvedAt ? formatDateTime(txn.approvedAt) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top grid: Voucher Info + Agency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard
          title="Voucher Information"
          icon={Receipt}
          accent="bg-blue-50"
        >
          <div className="grid grid-cols-2 gap-4">
            <InfoRow
              label="Voucher No"
              value={txn.transactionNo}
              icon={Hash}
              mono
            />
            <InfoRow
              label="Created At"
              value={formatDateTime(txn.createdAt)}
              icon={Calendar}
            />
            <InfoRow
              label="Transaction Type"
              value={
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isInward
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {isInward ? (
                    <ArrowDownToLine className="h-3 w-3" />
                  ) : (
                    <ArrowUpFromLine className="h-3 w-3" />
                  )}
                  {txn.direction}
                </span>
              }
            />
            <InfoRow
              label="Branch"
              value={`${txn.branch?.name ?? "—"} (${txn.branch?.code ?? "—"})`}
              icon={Building2}
              truncate
            />
            <InfoRow
              label="Status"
              value={<StatusBadge status={txn.status} size="sm" />}
            />
            <InfoRow
              label="Payment Type"
              value={txn.paymentType}
            />
          </div>
          {txn.remarks && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Remarks
              </p>
              <p className="text-sm text-gray-700 mt-1">{txn.remarks}</p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Agency Information"
          icon={Building2}
          accent="bg-violet-50"
        >
          {txn.agency ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                  <Building2 className="h-5 w-5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {txn.agency.name}
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    {txn.agency.type}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {txn.agency.gstin && (
                  <InfoRow label="GSTIN" value={txn.agency.gstin} mono />
                )}
                {txn.agency.contactPerson && (
                  <InfoRow
                    label="Contact"
                    value={txn.agency.contactPerson}
                    icon={UserIcon}
                  />
                )}
                {txn.agency.mobileNumber && (
                  <InfoRow
                    label="Mobile"
                    value={txn.agency.mobileNumber}
                    icon={Phone}
                  />
                )}
                {txn.agency.email && (
                  <InfoRow
                    label="Email"
                    value={txn.agency.email}
                    icon={Mail}
                    truncate
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-2">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <p className="text-sm text-gray-700">No agency mapped</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {txn.suspenseAccount
                  ? "This is a suspense transaction pending agency reconciliation."
                  : "No agency is associated with this transaction."}
              </p>
            </div>
          )}
        </SectionCard>

        {txn.thirdPartyAgencyId && (
          <SectionCard
            title="3rd Party Agency"
            icon={Users}
            accent="bg-violet-50"
          >
            <div className="space-y-3">
              <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                  <Users className="h-5 w-5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {txn.thirdPartyAgency?.name ?? txn.thirdPartyAgencyId}
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    {txn.thirdPartyAgency?.type ?? "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {txn.thirdPartyAgency?.gstin && (
                  <InfoRow
                    label="GSTIN"
                    value={txn.thirdPartyAgency.gstin}
                    mono
                  />
                )}
                {txn.thirdPartyAgency?.contactPerson && (
                  <InfoRow
                    label="Contact"
                    value={txn.thirdPartyAgency.contactPerson}
                    icon={UserIcon}
                  />
                )}
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Payment Information + (optional) Suspense */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard
          title="Payment Information"
          icon={txn.paymentMode === "ONLINE" ? Banknote : Wallet}
          accent="bg-amber-50"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wide">
              Amount Paid
            </p>
            <p className="text-2xl font-bold text-blue-900 mt-1 flex items-center gap-1.5">
              <IndianRupee className="h-5 w-5" />
              {formatCurrency(txn.amount).replace("₹", "")}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {txn.paymentThrough
                ? txn.paymentThrough
                : txn.paymentMode === "ONLINE"
                ? "Online Transfer"
                : "Offline"}{" "}
              •{" "}
              {txn.transactionRefNo ||
                txn.referenceNo ||
                "no reference provided"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow
              label="Payment Through"
              value={
                txn.paymentThrough
                  ? txn.paymentThrough
                  : txn.paymentMode === "ONLINE"
                  ? "Online"
                  : "Offline"
              }
              icon={txn.paymentMode === "ONLINE" ? Banknote : Wallet}
            />
            {txn.transactionRefNo && (
              <InfoRow
                label="Transaction No"
                value={txn.transactionRefNo}
                icon={Hash}
                mono
              />
            )}
            {txn.referenceNo && (
              <InfoRow
                label="Reference No"
                value={txn.referenceNo}
                icon={Hash}
                mono
              />
            )}
          </div>
        </SectionCard>

        {txn.suspenseAccount && (
          <SectionCard
            title="Suspense Information"
            icon={AlertCircle}
            accent="bg-rose-50"
          >
            <div className="space-y-3">
              <div className="border border-rose-200 bg-rose-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-100 rounded-lg shrink-0">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-rose-900">
                      Routed to Suspense Account
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      This transaction is held in suspense until it is matched
                      to a real invoice by Finance.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow
                  label="Suspense Account"
                  value="GST_Suspense_Clearing"
                  mono
                />
                <InfoRow
                  label="Status"
                  value={
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                      Suspended
                    </span>
                  }
                />
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Workflow Timeline */}
      <SectionCard title="Workflow Timeline" icon={Clock} accent="bg-violet-50">
        <TransactionTimeline
          auditTrail={synthesizeAuditTrail(txn)}
          currentStatus={mapStatusForTimeline(txn.status)}
        />
      </SectionCard>

      {/* Approval / Rejection Information */}
      {(isApproved || isRejected) && (
        <SectionCard
          title={
            isApproved
              ? "Approval Information"
              : "Rejection Information"
          }
          icon={isApproved ? ShieldCheck : XCircle}
          accent={isApproved ? "bg-emerald-50" : "bg-red-50"}
        >
          {isApproved && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoRow
                label="Approved By"
                value={txn.approvedBy?.name || "—"}
                icon={UserIcon}
              />
              <InfoRow
                label="Approved At"
                value={
                  txn.approvedAt ? formatDateTime(txn.approvedAt) : "—"
                }
                icon={Clock}
              />
              <InfoRow
                label="Voucher Locked"
                value="Yes - No further edits"
                icon={ShieldCheck}
              />
            </div>
          )}

          {isRejected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow
                label="Rejected By"
                value={txn.approvedBy?.name || "—"}
                icon={UserIcon}
              />
              <InfoRow
                label="Rejected At"
                value={
                  txn.approvedAt ? formatDateTime(txn.approvedAt) : "—"
                }
                icon={Clock}
              />
              <div className="md:col-span-2 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                  Rejection Reason
                </p>
                <p className="text-sm text-red-700 mt-1 font-medium">
                  {txn.remarks || "No reason recorded"}
                </p>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* Bottom action bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Globe className="h-3.5 w-3.5" />
            <span>
              Voucher last updated on {formatDateTime(txn.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/transactions">
              <Button variant="outline">Back to List</Button>
            </Link>
            {/* <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print Voucher
            </Button> */}
            {isPending && canApprove && (
              <Link href="/transactions/pending">
                <Button className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Go to Pending Queue
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <ToastContainer />
    </div>
  );
}

// ============== HELPERS ==============

/**
 * Build a minimal audit trail for the timeline from the fields we have on
 * the real Transaction. The backend does not return auditTrail; we synthesize
 * "Created" + (if approved) "Approved"/"Rejected" so the timeline visual
 * stays useful.
 */
function synthesizeAuditTrail(
  txn: ReturnType<typeof useAppSelector<any>>["transactions"]["currentTransaction"]
): AuditLog[] {
  if (!txn) return [];
  const trail: AuditLog[] = [
    {
      id: `${txn.id}-created`,
      action: "CREATED",
      userId: txn.createdById,
      userName: txn.createdBy?.name || "—",
      timestamp: txn.createdAt,
    },
    {
      id: `${txn.id}-submitted`,
      action: "SUBMITTED",
      userId: txn.createdById,
      userName: txn.createdBy?.name || "—",
      timestamp: txn.createdAt,
    },
  ];
  if (txn.status === "APPROVED" || txn.status === "REJECTED") {
    trail.push({
      id: `${txn.id}-${txn.status.toLowerCase()}`,
      action: txn.status === "APPROVED" ? "AUTHENTICATED" : "REJECTED",
      userId: txn.approvedById || txn.createdById,
      userName: txn.approvedBy?.name || "—",
      timestamp: txn.approvedAt || txn.createdAt,
      remarks: txn.status === "REJECTED" ? txn.remarks || undefined : undefined,
    });
  }
  return trail;
}

function mapStatusForTimeline(
  status: "PENDING" | "APPROVED" | "REJECTED"
): MockTransactionStatus {
  switch (status) {
    case "PENDING":
      return "PENDING_AUTHENTICATION";
    case "APPROVED":
      return "AUTHENTICATED";
    case "REJECTED":
      return "REJECTED";
  }
}
