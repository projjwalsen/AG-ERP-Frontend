"use client";

import * as React from "react";
import { Banknote, Wallet, AlertCircle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import { Agency, PaymentMode } from "../types/transaction";

interface PaymentModeSectionProps {
  mode: PaymentMode;
  onModeChange: (mode: PaymentMode) => void;
  amount: number;
  onAmountChange: (amount: number) => void;
  utr: string;
  onUtrChange: (utr: string) => void;
  outstandingAmount: number;
  viaSecondaryAgency: boolean;
  onViaSecondaryChange: (enabled: boolean) => void;
  secondaryAgencyId: string;
  onSecondaryAgencyChange: (id: string) => void;
  secondaryAgencies: Agency[];
  selectedSecondaryAgency?: Agency | null;
}

export function PaymentModeSection({
  mode,
  onModeChange,
  amount,
  onAmountChange,
  utr,
  onUtrChange,
  outstandingAmount,
  viaSecondaryAgency,
  onViaSecondaryChange,
  secondaryAgencyId,
  onSecondaryAgencyChange,
  secondaryAgencies,
  selectedSecondaryAgency,
}: PaymentModeSectionProps) {
  const isOnline = mode === "ONLINE";
  const isOffline = mode === "OFFLINE_CASH";

  const amountExceeds = amount > outstandingAmount;
  const showHelperError = amountExceeds && outstandingAmount > 0;

  const onlineCardActive = isOnline;
  const offlineCardActive = isOffline;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onModeChange("ONLINE")}
          className={`text-left border rounded-lg p-4 transition-colors ${
            onlineCardActive
              ? "border-green-500 bg-green-50 ring-2 ring-green-200"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg ${
                onlineCardActive ? "bg-green-100" : "bg-gray-100"
              }`}
            >
              <Banknote
                className={`h-5 w-5 ${
                  onlineCardActive ? "text-green-600" : "text-gray-500"
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Online</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                    onlineCardActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {onlineCardActive ? "Selected" : "Tap to select"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Bank transfer / NEFT / RTGS / UPI with UTR
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onModeChange("OFFLINE_CASH")}
          className={`text-left border rounded-lg p-4 transition-colors ${
            offlineCardActive
              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg ${
                offlineCardActive ? "bg-blue-100" : "bg-gray-100"
              }`}
            >
              <Wallet
                className={`h-5 w-5 ${
                  offlineCardActive ? "text-blue-600" : "text-gray-500"
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Offline Cash</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                    offlineCardActive
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {offlineCardActive ? "Selected" : "Tap to select"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Cash / Cheque / DD with counter receipt
              </p>
            </div>
          </div>
        </button>
      </div>

      {isOnline && (
        <div className="border border-green-200 bg-green-50/40 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Amount
              </label>
              <Input
                type="number"
                min={0}
                value={Number.isFinite(amount) ? amount : 0}
                onChange={(e) => onAmountChange(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                UTR / Transaction Reference
              </label>
              <Input
                value={utr}
                onChange={(e) => onUtrChange(e.target.value)}
                placeholder="e.g. UTR2026053100123"
              />
            </div>
          </div>
          {showHelperError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Amount exceeds the outstanding balance of {formatCurrency(outstandingAmount)}.
            </p>
          )}
        </div>
      )}

      {isOffline && (
        <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Amount
              </label>
              <Input
                type="number"
                min={0}
                value={Number.isFinite(amount) ? amount : 0}
                onChange={(e) => onAmountChange(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center justify-between w-full border border-gray-200 bg-white rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">Via Secondary Agency</p>
                  <p className="text-xs text-gray-500">Route through collection counter</p>
                </div>
                <Switch
                  checked={viaSecondaryAgency}
                  onCheckedChange={onViaSecondaryChange}
                />
              </div>
            </div>
          </div>

          {viaSecondaryAgency ? (
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Secondary Agency
              </label>
              <select
                value={secondaryAgencyId}
                onChange={(e) => onSecondaryAgencyChange(e.target.value)}
                className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select collection agency</option>
                {secondaryAgencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </select>
              {selectedSecondaryAgency && (
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  Cash will be reconciled through {selectedSecondaryAgency.name}.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Direct Cash</p>
                <p className="text-xs text-gray-500">
                  Counter receipt will be generated. No secondary agency involved.
                </p>
              </div>
            </div>
          )}

          {showHelperError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Amount exceeds the outstanding balance of {formatCurrency(outstandingAmount)}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
