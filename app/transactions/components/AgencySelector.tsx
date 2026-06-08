"use client";

import * as React from "react";
import { Agency } from "@/app/types/transaction";

/**
 * Sentinel value used in the agency <select> when the user picks
 * "Suspense Account" from the dropdown. The parent component interprets
 * this as `suspense: true` and omits `agencyId` from the create payload.
 */
export const SUSPENSE_AGENCY_VALUE = "__SUSPENSE__";

interface AgencySelectorProps {
  agencies: Agency[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function AgencySelector({
  agencies,
  value,
  onChange,
  placeholder = "Select agency",
  required = false,
  disabled = false,
}: AgencySelectorProps) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1.5">
        Agency
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {agencies.map((agency) => (
          <option key={agency.id} value={agency.id}>
            {agency.name}
          </option>
        ))}
        <option value={SUSPENSE_AGENCY_VALUE}>
          Suspense Account
        </option>
      </select>
    </div>
  );
}
