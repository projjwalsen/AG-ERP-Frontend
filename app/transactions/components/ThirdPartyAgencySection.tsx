"use client";

import * as React from "react";
import { Users, AlertCircle } from "lucide-react";
import { Agency } from "@/app/types/transaction";

interface ThirdPartyAgencySectionProps {
  agencies: Agency[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ThirdPartyAgencySection({
  agencies,
  value,
  onChange,
  error,
}: ThirdPartyAgencySectionProps) {
  return (
    <div className="border border-purple-200 bg-purple-50/40 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="p-1.5 bg-purple-100 rounded-lg shrink-0">
          <Users className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">3rd Party Agency</p>
          <p className="text-xs text-gray-500">
            Select the agency receiving or remitting the funds on behalf of the primary agency.
          </p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1.5">
          Select 3rd Party Agency<span className="text-red-500 ml-0.5">*</span>
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">Select 3rd party agency</option>
          {agencies.map((agency) => (
            <option key={agency.id} value={agency.id}>
              {agency.name}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
