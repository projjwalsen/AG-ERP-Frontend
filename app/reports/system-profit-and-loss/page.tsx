"use client";

import { FinancialStatementReportPage } from "@/components/reports/financial-statement-report";
import { reportApi } from "@/app/services/report.service";

export default function SystemProfitAndLossPage() {
  return (
    <FinancialStatementReportPage
      kind="PROFIT_AND_LOSS"
      collapsible
      load={({ startDate, endDate }) =>
        reportApi.getProfitAndLossReport({
          startDate,
          endDate,
        })
      }
      exportReport={({ startDate, endDate }) =>
        reportApi.exportProfitAndLossExcel({
          startDate,
          endDate,
        })
      }
    />
  );
}
