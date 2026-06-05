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
import {
  ShieldCheck,
  Banknote,
  Wallet,
  Building2,
  User as UserIcon,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Transaction } from "@/app/types/transaction";
import { StatusBadge } from "./StatusBadge";

interface AuthenticationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onConfirm: () => void;
  loading?: boolean;
}

export function AuthenticationModal({
  open,
  onOpenChange,
  transaction,
  onConfirm,
  loading,
}: AuthenticationModalProps) {
  const [confirmOpen, setConfirmOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!open) setConfirmOpen(false);
  }, [open]);

  if (!transaction) return null;

  const PaymentIcon = transaction.paymentMode === "ONLINE" ? Banknote : Wallet;
  const paymentLabel = transaction.paymentMode === "ONLINE" ? "Online" : "Offline";

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
            {/* Transaction Summary */}
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
                  <p className="font-medium text-sm">
                    {transaction.direction}
                  </p>
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

            {/* Payment Details */}
            <Card>
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <PaymentIcon className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-gray-900">
                  Payment Details
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {paymentLabel}
                </span>
              </div>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Amount</p>
                  <p className="font-semibold text-sm">
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
                {transaction.transactionRefNo && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Transaction Reference
                    </p>
                    <p className="font-mono text-sm">
                      {transaction.transactionRefNo}
                    </p>
                  </div>
                )}
                {transaction.thirdPartyAgencyId && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      3rd Party Agency
                    </p>
                    <p className="font-medium text-sm">
                      {transaction.thirdPartyAgency?.name ||
                        transaction.thirdPartyAgencyId}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase">
                    Payment Type
                  </p>
                  <p className="font-medium text-sm">
                    {transaction.paymentType}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Audit Info */}
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

            {transaction.remarks && (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Voucher Remarks
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
                onConfirm();
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
