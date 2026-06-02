"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface SuspenseAccountSectionProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  hidden?: boolean;
}

export function SuspenseAccountSection({ enabled, onToggle, hidden }: SuspenseAccountSectionProps) {
  if (hidden) {
    return null;
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <Checkbox
          checked={enabled}
          onCheckedChange={(checked) => onToggle(checked === true)}
        />
        <span className="text-sm font-medium text-gray-900">
          Move to Suspense Account
        </span>
      </label>

      {enabled && (
        <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 flex items-start gap-3">
          <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              Suspense Routing Required
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Transaction will be routed to <span className="font-mono font-semibold">GST_Suspense_Clearing</span>.
              Once mapped to a real invoice the suspense entry will be cleared by Finance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
