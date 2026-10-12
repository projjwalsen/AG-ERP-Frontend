"use client";

import { FinancialStatementReportPage } from "@/components/reports/financial-statement-report";
import { reportApi } from "@/app/services/report.service";

export default function BalanceSheetPage() {
  return <FinancialStatementReportPage kind="BALANCE_SHEET" load={reportApi.getsrv1BalanceSheetReport} exportReport={reportApi.exportsrv1BalanceSheetExcel} />;
}
