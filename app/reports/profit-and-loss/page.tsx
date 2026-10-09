"use client";

import { FinancialStatementReportPage } from "@/components/reports/financial-statement-report";
import { reportApi } from "@/app/services/report.service";

export default function ProfitAndLossPage() {
  return <FinancialStatementReportPage kind="PROFIT_AND_LOSS" load={reportApi.getsrv1ProfitAndLossReport} exportReport={reportApi.exportsrv1ProfitAndLossExcel} />;
}
