"use client";

import * as React from "react";
import {
  CheckCircle2,
  FileEdit,
  Send,
  ShieldCheck,
  XCircle,
  Clock,
  Circle,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { AuditLog, MockTransactionStatus } from "../types/mock";

interface TransactionTimelineProps {
  auditTrail: AuditLog[];
  currentStatus: MockTransactionStatus;
}

interface Step {
  key: string;
  label: string;
  icon: React.ReactNode;
  log?: AuditLog;
  isPending: boolean;
  isCurrent: boolean;
}

function iconForAction(action: AuditLog["action"], className: string) {
  switch (action) {
    case "CREATED":
      return <FileEdit className={className} />;
    case "SUBMITTED":
      return <Send className={className} />;
    case "AUTHENTICATED":
      return <ShieldCheck className={className} />;
    case "REJECTED":
      return <XCircle className={className} />;
    case "EDITED":
      return <FileEdit className={className} />;
    default:
      return <Circle className={className} />;
  }
}

function labelForAction(action: AuditLog["action"]) {
  switch (action) {
    case "CREATED":
      return "Voucher Created";
    case "SUBMITTED":
      return "Submitted for Authentication";
    case "AUTHENTICATED":
      return "Authenticated";
    case "REJECTED":
      return "Rejected";
    case "EDITED":
      return "Edited";
    default:
      return action;
  }
}

export function TransactionTimeline({ auditTrail, currentStatus }: TransactionTimelineProps) {
  const ordered: Array<AuditLog["action"]> = ["CREATED", "SUBMITTED", "AUTHENTICATED"];

  const sorted = [...auditTrail].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const steps: Step[] = ordered.map((action) => {
    const log = sorted.find((entry) => entry.action === action);
    const isCurrent =
      (action === "AUTHENTICATED" && currentStatus === "AUTHENTICATED") ||
      (action === "SUBMITTED" && currentStatus === "PENDING_AUTHENTICATION");
    return {
      key: action,
      label: labelForAction(action),
      icon: log ? iconForAction(action, "h-4 w-4") : <Clock className="h-4 w-4" />,
      log,
      isPending: !log,
      isCurrent,
    };
  });

  // If current status is REJECTED, surface the rejection
  if (currentStatus === "REJECTED") {
    const rejectLog = sorted.find((e) => e.action === "REJECTED");
    steps.push({
      key: "REJECTED",
      label: "Rejected",
      icon: <XCircle className="h-4 w-4" />,
      log: rejectLog,
      isPending: !rejectLog,
      isCurrent: true,
    });
  }

  return (
    <div className="flow-root">
      <ol className="-my-2 divide-y divide-gray-100">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isRejected = step.key === "REJECTED" && currentStatus === "REJECTED";
          const dotColor = isRejected
            ? "bg-red-100 text-red-600 ring-red-200"
            : step.isCurrent
            ? "bg-amber-100 text-amber-600 ring-amber-200"
            : step.log
            ? "bg-green-100 text-green-600 ring-green-200"
            : "bg-gray-100 text-gray-400 ring-gray-200";
          const lineColor = step.log && !isLast ? "bg-green-300" : "bg-gray-200";
          return (
            <li key={step.key} className="relative py-3 pl-10">
              {!isLast && (
                <span
                  className={`absolute left-[15px] top-9 bottom-0 w-px ${lineColor}`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`absolute left-0 top-3 flex h-8 w-8 items-center justify-center rounded-full ring-4 ${dotColor}`}
              >
                {step.isPending ? <Clock className="h-4 w-4" /> : step.icon}
              </span>
              <div className="flex flex-col">
                <span
                  className={`text-sm font-medium ${
                    step.isCurrent ? "text-amber-700" : "text-gray-900"
                  }`}
                >
                  {step.label}
                  {step.isCurrent && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                      Current
                    </span>
                  )}
                </span>
                {step.log ? (
                  <div className="mt-0.5 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{step.log.userName}</span>
                    {" - "}
                    {formatDateTime(step.log.timestamp)}
                    {step.log.remarks && (
                      <span className="block mt-0.5 text-gray-500 italic">
                        {step.log.remarks}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="mt-0.5 text-xs text-gray-400">Awaiting action</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
