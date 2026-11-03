"use client";

import { FinancialStatementReportPage } from "@/components/reports/financial-statement-report";
import { reportApi } from "@/app/services/report.service";

export default function SystemBalanceSheetPage() {
  return (
    <FinancialStatementReportPage
      kind="BALANCE_SHEET"
      collapsible
      load={() =>
        reportApi.getBalanceSheetReport({
          startDate: "2025-04-01",
          endDate: "2026-03-31",
        })
      }
      exportReport={() =>
        reportApi.exportBalanceSheetExcel({
          startDate: "2025-04-01",
          endDate: "2026-03-31",
        })
      }
    />
  );
}
