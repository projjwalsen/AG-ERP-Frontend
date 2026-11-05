"use client";

import { FinancialStatementReportPage } from "@/components/reports/financial-statement-report";
import { reportApi } from "@/app/services/report.service";

export default function SystemProfitAndLossPage() {
  return (
    <FinancialStatementReportPage
      kind="PROFIT_AND_LOSS"
      collapsible
      load={() =>
        reportApi.getProfitAndLossReport({
          startDate: "2025-04-01",
          endDate: "2026-03-31",
        })
      }
      exportReport={() =>
        reportApi.exportProfitAndLossExcel({
          startDate: "2025-04-01",
          endDate: "2026-03-31",
        })
      }
    />
  );
}
