"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  BookOpen,
  Receipt,
  AlertTriangle,
  Package,
  FileSpreadsheet,
  Scale,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import { cn } from "@/lib/utils";

interface ReportCardData {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const REPORT_CARDS: ReportCardData[] = [
  {
    title: "AP/AR report",
    description:
      "Accounts receivable and payable outstanding by agency with debit / credit and balance type.",
    href: "/reports/outstanding",
    icon: FileText,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Branch Day Book",
    description:
      "Daily cash and bank movement for a branch — receipts, payments, references and allocations.",
    href: "/reports/day-book",
    icon: BookOpen,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    title: "GSTR-1 Report",
    description:
      "Statutory outward supplies report with B2B / B2C split and CGST / SGST / IGST breakup.",
    href: "/reports/gstr1",
    icon: Receipt,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    title: "GST Suspense Log",
    description:
      "Unidentified funds awaiting authentication. Track pending vs. authenticated suspense entries.",
    href: "/reports/gst-suspense",
    icon: AlertTriangle,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    title: "Inventory Report",
    description:
      "Batch-wise stock position in KG / LTR per product and branch, with last-updated timestamps.",
    href: "/reports/inventory",
    icon: Package,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  {
    title: "GST Ledger",
    description:
      "Input GST, Output GST and net liability summary per tax kind (CGST / SGST / IGST) for a selected period.",
    href: "/reports/gst-ledger",
    icon: Scale,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
];

export default function ReportsLandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 space-y-5">
      <PageHeader
        title="Reports"
        description="Statutory, operational and analytical reports for the organization"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports" },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.href}
              className="border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "shrink-0 p-3 rounded-xl",
                      card.iconBg
                    )}
                  >
                    <Icon className={cn("h-5 w-5", card.iconColor)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-3">
                      {card.description}
                    </p>
                    <Link href={card.href}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-1.5"
                      >
                        Open Report
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Helper tile so the grid stays balanced on lg screens */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 hidden lg:flex">
          <CardContent className="p-5 flex flex-col items-start gap-2">
            <div className="p-2.5 rounded-xl bg-white shadow-sm">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              Need a custom report?
            </h3>
            <p className="text-xs text-gray-600">
              Reach out to your administrator to request additional report
              views or filters.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
