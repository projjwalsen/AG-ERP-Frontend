"use client";

import { FinancialStatementReportPage } from "@/components/reports/financial-statement-report";
import { reportApi } from "@/app/services/report.service";

export default function SystemBalanceSheetPage() {
  return (
    <FinancialStatementReportPage
      kind="BALANCE_SHEET"
      collapsible
      load={({ startDate, endDate }) =>
        reportApi.getBalanceSheetReport({
          startDate,
          endDate,
        })
      }
      exportReport={({ startDate, endDate }) =>
        reportApi.exportBalanceSheetExcel({
          startDate,
          endDate,
        })
      }
    />
  );
}
