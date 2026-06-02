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
  FileText,
  IndianRupee,
  Mail,
  MapPin,
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  mockTransactions,
  mockAgencies,
  mockBranches,
  mockInvoices,
  mockUsers,
  getMockTransactionById,
} from "@/lib/mock-data/transactions";
import { StatusBadge } from "../components/StatusBadge";
import { TransactionTimeline } from "../components/TransactionTimeline";

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
  const [loading, setLoading] = React.useState<boolean>(true);
  const [txn, setTxn] = React.useState(getMockTransactionById(params.id) || null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setTxn(getMockTransactionById(params.id) || null);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [params.id]);

  if (loading) {
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
              Voucher <span className="font-mono font-semibold">{params.id}</span>{" "}
              does not exist.
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
      </div>
    );
  }

  const agency = txn.agencyId
    ? mockAgencies.find((a) => a.id === txn.agencyId)
    : null;
  const branch = mockBranches.find((b) => b.id === txn.branchId);
  const invoice = txn.invoiceId
    ? mockInvoices.find((i) => i.id === txn.invoiceId)
    : null;
  const secondaryAgency = txn.payment.secondaryAgencyId
    ? mockAgencies.find((a) => a.id === txn.payment.secondaryAgencyId)
    : null;
  const createdByUser = mockUsers.find((u) => u.id === txn.createdById);
  const authUser = txn.authentication
    ? mockUsers.find((u) => u.id === txn.authentication?.authenticatedById)
    : null;

  const isInward = txn.type === "INWARD";
  const isAuth = txn.status === "AUTHENTICATED";
  const isRejected = txn.status === "REJECTED";
  const isPending = txn.status === "PENDING_AUTHENTICATION";
  const isDraft = txn.status === "DRAFT";

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
        title={`Voucher ${txn.voucherNo}`}
        description={`Status: ${txn.status.replace(/_/g, " ")} • Created on ${formatDateTime(
          txn.createdAt
        )} • ${formatDate(txn.voucherDate)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Transactions", href: "/transactions" },
          { label: txn.voucherNo },
        ]}
        actions={
          <>
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            {(isDraft || isPending) && (
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            {isPending && (
              <Link href="/transactions/pending">
                <Button className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Authenticate
                </Button>
              </Link>
            )}
          </>
        }
      />

      {/* Banner info for status */}
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
                {txn.rejectionReason && (
                  <p className="text-xs text-red-800/80 mt-0.5">
                    Reason: {txn.rejectionReason}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isAuth && (
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
                  Authenticated by {txn.authentication?.authenticatedByName} on{" "}
                  {txn.authentication?.authenticatedAt
                    ? formatDateTime(txn.authentication.authenticatedAt)
                    : "-"}
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
              value={txn.voucherNo}
              icon={Hash}
              mono
            />
            <InfoRow
              label="Voucher Date"
              value={formatDate(txn.voucherDate)}
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
                  {txn.type}
                </span>
              }
            />
            <InfoRow
              label="Branch"
              value={`${branch?.name || "-"} (${branch?.code || "-"})`}
              icon={Building2}
              truncate
            />
            <InfoRow
              label="Created At"
              value={formatDateTime(txn.createdAt)}
              icon={Clock}
            />
            <InfoRow
              label="Status"
              value={<StatusBadge status={txn.status} size="sm" />}
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
          {agency ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                  <Building2 className="h-5 w-5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {agency.name}
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    {agency.type}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {agency.gstin && (
                  <InfoRow label="GSTIN" value={agency.gstin} mono />
                )}
                {agency.contactPerson && (
                  <InfoRow
                    label="Contact"
                    value={agency.contactPerson}
                    icon={UserIcon}
                  />
                )}
                {agency.mobileNumber && (
                  <InfoRow
                    label="Mobile"
                    value={agency.mobileNumber}
                    icon={Phone}
                  />
                )}
                {agency.email && (
                  <InfoRow
                    label="Email"
                    value={agency.email}
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
                This is a suspense transaction pending agency reconciliation.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Invoice Information"
          icon={FileText}
          accent="bg-emerald-50"
        >
          {invoice ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase">Invoice</p>
                  <p className="font-mono font-semibold text-gray-900">
                    {invoice.invoiceNo}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    invoice.status === "PAID"
                      ? "bg-emerald-100 text-emerald-700"
                      : invoice.status === "PARTIALLY_PAID"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {invoice.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow
                  label="Invoice Date"
                  value={formatDate(invoice.invoiceDate)}
                  icon={Calendar}
                />
                <InfoRow
                  label="Taxable"
                  value={formatCurrency(invoice.taxableAmount)}
                />
                <InfoRow
                  label="GST"
                  value={formatCurrency(invoice.gstAmount)}
                />
                <InfoRow
                  label="Total"
                  value={formatCurrency(invoice.totalAmount)}
                />
                <InfoRow
                  label="Paid"
                  value={formatCurrency(invoice.paidAmount)}
                />
                <InfoRow
                  label="Outstanding"
                  value={
                    <span
                      className={
                        invoice.outstandingAmount > 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }
                    >
                      {formatCurrency(invoice.outstandingAmount)}
                    </span>
                  }
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-700">No invoice linked</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {txn.isSuspense
                  ? "Will be linked during suspense reconciliation"
                  : "Invoice mapping not available"}
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Payment Information + Suspense */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard
          title="Payment Information"
          icon={
            txn.payment.mode === "ONLINE" ? Banknote : Wallet
          }
          accent="bg-amber-50"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wide">
              Amount Paid
            </p>
            <p className="text-2xl font-bold text-blue-900 mt-1 flex items-center gap-1.5">
              <IndianRupee className="h-5 w-5" />
              {formatCurrency(txn.payment.amount).replace("₹", "")}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {txn.payment.mode === "ONLINE" ? "Online Transfer" : "Offline Cash"}
              {txn.payment.transactionId &&
                ` • ${txn.payment.transactionId}`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow
              label="Payment Mode"
              value={txn.payment.mode === "ONLINE" ? "Online" : "Offline Cash"}
              icon={
                txn.payment.mode === "ONLINE" ? Banknote : Wallet
              }
            />
            {txn.payment.utr && (
              <InfoRow
                label="UTR"
                value={txn.payment.utr}
                icon={Hash}
                mono
              />
            )}
            {txn.payment.transactionId && (
              <InfoRow
                label="Transaction ID"
                value={txn.payment.transactionId}
                icon={Hash}
                mono
              />
            )}
            {secondaryAgency && (
              <InfoRow
                label="Secondary Agency"
                value={secondaryAgency.name}
                icon={Building2}
              />
            )}
          </div>

          {txn.payment.remarks && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Payment Remarks
              </p>
              <p className="text-sm text-gray-700 mt-1">
                {txn.payment.remarks}
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Suspense Information"
          icon={AlertCircle}
          accent={txn.isSuspense ? "bg-rose-50" : "bg-gray-50"}
        >
          {txn.isSuspense ? (
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
                  value={txn.suspenseAccount || "GST_Suspense_Clearing"}
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
          ) : (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-700">No Suspense Routing</p>
              <p className="text-xs text-gray-500 mt-0.5">
                This transaction is directly mapped to an agency and invoice.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Audit Trail + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Audit Trail" icon={Hash} accent="bg-blue-50">
          <div className="space-y-2">
            {txn.auditTrail.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="p-1.5 rounded-md bg-white border border-gray-200 shrink-0">
                  {log.action === "CREATED" && (
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                  )}
                  {log.action === "SUBMITTED" && (
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-violet-600" />
                  )}
                  {log.action === "AUTHENTICATED" && (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  {log.action === "REJECTED" && (
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                  )}
                  {log.action === "EDITED" && (
                    <Edit className="h-3.5 w-3.5 text-amber-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {log.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(log.timestamp)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    By <span className="font-medium">{log.userName}</span>
                    {log.ipAddress && ` • IP: ${log.ipAddress}`}
                    {log.computerId && ` • ${log.computerId}`}
                  </p>
                  {log.remarks && (
                    <p className="text-xs text-gray-500 italic mt-1">
                      {log.remarks}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Workflow Timeline" icon={Clock} accent="bg-violet-50">
          <TransactionTimeline
            auditTrail={txn.auditTrail}
            currentStatus={txn.status}
          />
        </SectionCard>
      </div>

      {/* Authentication Information */}
      {(isAuth || isRejected) && (
        <SectionCard
          title={
            isAuth
              ? "Authentication Information"
              : "Rejection Information"
          }
          icon={isAuth ? ShieldCheck : XCircle}
          accent={isAuth ? "bg-emerald-50" : "bg-red-50"}
        >
          {isAuth && txn.authentication && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoRow
                label="Authenticated By"
                value={txn.authentication.authenticatedByName}
                icon={UserIcon}
              />
              <InfoRow
                label="Authenticated At"
                value={formatDateTime(txn.authentication.authenticatedAt)}
                icon={Clock}
              />
              <InfoRow
                label="Voucher Locked"
                value="Yes - No further edits"
                icon={ShieldCheck}
              />
              {txn.authentication.remarks && (
                <div className="md:col-span-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                    Authentication Remarks
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {txn.authentication.remarks}
                  </p>
                </div>
              )}
            </div>
          )}

          {isRejected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow
                label="Rejected By"
                value={
                  txn.auditTrail.find((l) => l.action === "REJECTED")?.userName ||
                  "-"
                }
                icon={UserIcon}
              />
              <InfoRow
                label="Rejected At"
                value={(() => {
                  const log = txn.auditTrail.find(
                    (l) => l.action === "REJECTED"
                  );
                  return log ? formatDateTime(log.timestamp) : "-";
                })()}
                icon={Clock}
              />
              <div className="md:col-span-2 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                  Rejection Reason
                </p>
                <p className="text-sm text-red-700 mt-1 font-medium">
                  {txn.rejectionReason || "No reason recorded"}
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
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print Voucher
            </Button>
            {isPending && (
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
    </div>
  );
}
