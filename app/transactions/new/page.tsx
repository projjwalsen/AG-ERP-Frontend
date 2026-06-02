"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import {
  mockAgencies,
  mockBranches,
  mockInvoices,
  mockUsers,
} from "@/lib/mock-data/transactions";
import { TransactionForm } from "../components/TransactionForm";

export default function NewTransactionPage() {
  const currentUser = mockUsers[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/transactions">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Transactions
          </Button>
        </Link>
      </div>

      <PageHeader
        title="New Transaction Entry"
        description="Record a new inward or outward payment. All fields marked with * are required."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Transactions", href: "/transactions" },
          { label: "New" },
        ]}
      />

      <TransactionForm
        branches={mockBranches}
        agencies={mockAgencies}
        invoices={mockInvoices}
        currentUser={currentUser}
        defaultBranchId={mockBranches[0]?.id}
      />
    </div>
  );
}
