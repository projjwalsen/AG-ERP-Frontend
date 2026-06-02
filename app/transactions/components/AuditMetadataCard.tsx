"use client";

import * as React from "react";
import { User, MapPin, Clock, Monitor } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Branch, User as UserType } from "../types/transaction";

interface AuditMetadataCardProps {
  user: UserType;
  branch: Branch;
  timestamp: string;
  computerId?: string;
}

export function AuditMetadataCard({ user, branch, timestamp, computerId }: AuditMetadataCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
            <User className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase">User</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-green-100 rounded-lg shrink-0">
            <MapPin className="h-3.5 w-3.5 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase">Branch</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{branch.name}</p>
            <p className="text-xs text-gray-500 truncate">{branch.code}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase">Timestamp</p>
            <p className="text-sm font-semibold text-gray-900">{formatDateTime(timestamp)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-purple-100 rounded-lg shrink-0">
            <Monitor className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase">Computer</p>
            <p className="text-sm font-semibold text-gray-900 font-mono">
              {computerId || "-"}
            </p>
            <p className="text-xs text-gray-500">{computerId ? "Tracked" : "Not captured"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
