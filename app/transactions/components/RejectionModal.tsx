"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { XCircle, AlertCircle } from "lucide-react";
import { Transaction } from "../types/transaction";

interface RejectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function RejectionModal({
  open,
  onOpenChange,
  transaction,
  onConfirm,
  loading,
}: RejectionModalProps) {
  const [reason, setReason] = React.useState<string>("");
  const [touched, setTouched] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  if (!transaction) return null;

  const isReasonMissing = reason.trim().length === 0;
  const showError = touched && isReasonMissing;

  const handleReject = () => {
    setTouched(true);
    if (isReasonMissing) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Reject Voucher
          </DialogTitle>
          <DialogDescription>
            You are about to reject voucher{" "}
            <span className="font-mono font-semibold text-gray-900">
              {transaction.voucherNo}
            </span>
            . The reason will be visible to the originator in their audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label className="text-sm font-medium text-gray-700 block">
            Rejection Reason
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. UTR mismatch with bank statement, please re-confirm and re-submit."
            error={showError ? "Rejection reason is required" : undefined}
            rows={4}
          />
          {showError && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              A clear rejection reason is required for audit compliance.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isReasonMissing}
            loading={loading}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Reject Voucher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
