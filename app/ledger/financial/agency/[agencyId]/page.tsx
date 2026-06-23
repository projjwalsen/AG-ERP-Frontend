"use client";

import * as React from "react";
import {
  ArrowLeft, Briefcase, RefreshCw, BookOpen, AlertTriangle,
  Mail, Phone, MapPin, Hash, User, Tag, ToggleLeft, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchLedgerByAgencyId,
  clearFinancialCurrentDetail,
} from "@/app/store/ledgerSlice";
import { formatCurrency } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function AgencyLedgerDetailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <AgencyLedgerDetailContent />
    </React.Suspense>
  );
}

function AgencyLedgerDetailContent() {
  const params = useParams<{ agencyId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const dispatch = useAppDispatch();

  const agencyId = params?.agencyId;
  const category = searchParams?.get("category") || "ACCOUNTING_LEDGER";
  const entityName = searchParams?.get("name") || "Agency";

  const {
    currentAgencyDetail,
    isAgencyDetailLoading,
    agencyDetailError,
  } = useAppSelector((state) => state.ledger);

  const fetchData = React.useCallback(async () => {
    if (!agencyId) return;
    try {
      await dispatch(
        fetchLedgerByAgencyId({
          agencyId,
          category: category as any,
        })
      ).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch agency ledgers", "error");
    }
  }, [dispatch, agencyId, category, addToast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    return () => {
      dispatch(clearFinancialCurrentDetail());
    };
  }, [dispatch]);

  const [exporting, setExporting] = React.useState(false);

  // Stream the agency's full transaction statement as an .xlsx file.
  // Mirrors the filters applied to fetchData — `?export=true` switches the
  // backend to xlsx streaming mode instead of returning JSON.
  const handleExport = async () => {
    if (!agencyId) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append("export", "true");
      if (category) params.append("category", category);
      await downloadFile(
        `api/ledgers/agency/${agencyId}?${params.toString()}`,
        `ledger_agency_${agency?.name || agencyId}.xlsx`
      );
      addToast("Agency ledger exported successfully", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export agency ledger", "error");
    } finally {
      setExporting(false);
    }
  };

  const summary = currentAgencyDetail?.summary || {};
  const isCash = category === "CASH";
  // Each branch narrows to a single shape so downstream .map() knows which
  // fields are present. Backend may return CASH entries under either
  // `cashEntries` (preferred) or `entries` (older payloads), so check both.
  const entries: import("@/app/types/ledger").AgencyLedgerEntry[] = isCash
    ? []
    : currentAgencyDetail?.entries || [];
  const cashEntries: import("@/app/types/ledger").AgencyCashEntry[] = isCash
    ? (currentAgencyDetail?.cashEntries as import("@/app/types/ledger").AgencyCashEntry[] | undefined) ||
      (currentAgencyDetail?.entries as unknown as import("@/app/types/ledger").AgencyCashEntry[] | undefined) ||
      []
    : [];
  const agency = currentAgencyDetail?.agency;

  // Accounting-ledger shape
  const totalTransactions =
    (summary.totalTransactions as number) ?? (isCash ? cashEntries.length : entries.length);
  const totalInward = Number(summary.totalInward ?? 0);
  const totalOutward = Number(summary.totalOutward ?? 0);
  const closingBalance = Number(summary.closingBalance ?? 0);

  // Cash shape
  const totalReceipt = Number(summary.totalReceipt ?? 0);

  const amountReceivable = Number(agency?.amountReceivable ?? 0);
  const amountPayable = Number(agency?.amountPayable ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/ledger/financial")}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="p-2 bg-amber-100 rounded-lg">
            <Briefcase className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {agency?.name || entityName}
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Agency-wise Ledgers</span>
              <Badge variant="outline">{category}</Badge>
              {agency?.type && (
                <Badge variant="secondary">{agency.type}</Badge>
              )}
              {agency?.gstin && (
                <span className="font-mono text-xs">GSTIN: {agency.gstin}</span>
              )}
              {agency?.isActive !== undefined && (
                <Badge variant={agency.isActive ? "success" : "secondary"} dot>
                  {agency.isActive ? "Active" : "Inactive"}
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            loading={exporting}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalTransactions}</p>
          </CardContent>
        </Card>
        {isCash ? (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Receipt</p>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {formatCurrency(totalReceipt)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Amount Receivable</p>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {formatCurrency(amountReceivable)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Amount Payable</p>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  {formatCurrency(amountPayable)}
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Closing Balance</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatCurrency(closingBalance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Inward</p>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {formatCurrency(totalInward)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Total Outward</p>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  {formatCurrency(totalOutward)}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Agency profile */}
      {agency && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-amber-600" />
              Agency Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {agency.contactPerson && (
                <Field icon={<User className="h-3.5 w-3.5 text-gray-400" />} label="Contact Person">
                  {agency.contactPerson}
                </Field>
              )}
              {agency.mobileNumber && (
                <Field icon={<Phone className="h-3.5 w-3.5 text-gray-400" />} label="Mobile">
                  {agency.mobileNumber}
                </Field>
              )}
              {agency.email && (
                <Field icon={<Mail className="h-3.5 w-3.5 text-gray-400" />} label="Email">
                  <span className="break-all">{agency.email}</span>
                </Field>
              )}
              {agency.gstin && (
                <Field icon={<Hash className="h-3.5 w-3.5 text-gray-400" />} label="GSTIN">
                  <span className="font-mono">{agency.gstin}</span>
                </Field>
              )}
              {agency.stateCode && (
                <Field icon={<Tag className="h-3.5 w-3.5 text-gray-400" />} label="State Code">
                  {agency.stateCode}
                </Field>
              )}
              {agency.type && (
                <Field icon={<ToggleLeft className="h-3.5 w-3.5 text-gray-400" />} label="Type">
                  {agency.type}
                </Field>
              )}
              {(agency.addressLine1 || agency.city || agency.state || agency.pinCode) && (
                <Field icon={<MapPin className="h-3.5 w-3.5 text-gray-400" />} label="Address">
                  <span>
                    {agency.addressLine1}
                    {agency.addressLine2 ? `, ${agency.addressLine2}` : ""}
                    {agency.city ? `, ${agency.city}` : ""}
                    {agency.state ? `, ${agency.state}` : ""}
                    {agency.pinCode ? ` - ${agency.pinCode}` : ""}
                  </span>
                </Field>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledgers table */}
      <Card>
        <CardContent className="p-0">
          {isAgencyDetailLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : agencyDetailError ? (
            <div className="p-12 text-center">
              <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-600">{agencyDetailError}</p>
            </div>
          ) : isCash ? (
            cashEntries.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No cash transactions found for this agency</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transaction No</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ref No</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agency</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Related Party</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Direction</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Receipt</th>
                      
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cashEntries.map((e, idx) => (
                      <tr key={`${e.transactionNo}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(e.date).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-medium">{e.transactionNo}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {e.transactionRefNo || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {e.branch || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {e.agency || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {e.relatedParty || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={e.direction === "INWARD" ? "success" : "warning"}>
                            {e.direction}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                          {formatCurrency(e.receipt ?? 0)}
                        </td>
                       
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {e.narration || <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transactions found for this agency</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transaction No</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ref No</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Direction</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mode</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agency</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Inward</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Outward</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Running Balance</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e, idx) => (
                    <tr key={`${e.transactionNo}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(e.date).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium">{e.transactionNo}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {e.transactionRefNo || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={e.direction === "INWARD" ? "success" : "warning"}>
                          {e.direction}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{e.paymentMode || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{e.paymentType || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {e.agency || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                        {formatCurrency(e.inward ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-amber-700">
                        {formatCurrency(e.outward ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(e.runningBalance ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {e.remarks || <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ToastContainer />
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5">
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}
