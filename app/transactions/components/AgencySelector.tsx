"use client";

import * as React from "react";
import { Building2, Phone, Mail, FileBadge } from "lucide-react";
import { Agency } from "@/app/types/transaction";

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
  const selected = agencies.find((a) => a.id === value) || null;

  return (
    <div className="space-y-3">
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
              {agency.name} ({agency.type})
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">
                {selected.type}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {selected.gstin && (
              <div className="flex items-start gap-1.5">
                <FileBadge className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">GSTIN</p>
                  <p className="font-mono text-gray-700">{selected.gstin}</p>
                </div>
              </div>
            )}
            {selected.contactPerson && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Contact</p>
                <p className="text-gray-700">{selected.contactPerson}</p>
              </div>
            )}
            {selected.mobileNumber && (
              <div className="flex items-start gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Mobile</p>
                  <p className="text-gray-700">{selected.mobileNumber}</p>
                </div>
              </div>
            )}
            {selected.email && (
              <div className="flex items-start gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase">Email</p>
                  <p className="text-gray-700 truncate">{selected.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
