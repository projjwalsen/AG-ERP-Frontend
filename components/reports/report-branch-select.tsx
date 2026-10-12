"use client";

import * as React from "react";
import { Building2 } from "lucide-react";
import { branchApi } from "@/app/services/branch.service";
import { cn } from "@/lib/utils";

export const DEFAULT_REPORT_BRANCH = "A G Ashtavinayaka Petrochem Pvt Ltd - Maharashtra";

export function useReportBranchSelection() {
  const [branches, setBranches] = React.useState<string[]>([DEFAULT_REPORT_BRANCH]);
  const [selectedBranch, setSelectedBranch] = React.useState(DEFAULT_REPORT_BRANCH);

  React.useEffect(() => {
    let cancelled = false;
    void branchApi.getActive().then((response) => {
      if (cancelled || !response.success) return;
      const names = (response.data?.branches ?? []).map((branch) => branch.name).filter(Boolean);
      const uniqueNames = Array.from(new Set([DEFAULT_REPORT_BRANCH, ...names]));
      setBranches(uniqueNames);
      setSelectedBranch(DEFAULT_REPORT_BRANCH);
    }).catch(() => {
      // Keep the required default option available if branch loading fails.
    });
    return () => { cancelled = true; };
  }, []);

  return { branches, selectedBranch, setSelectedBranch };
}

export function ReportBranchSelect({ branches, value, onChange, light = false }: { branches: string[]; value: string; onChange: (value: string) => void; light?: boolean }) {
  return <label className={cn("inline-flex min-w-[280px] items-center gap-2 rounded-xl border px-3 py-2 focus-within:border-amber-300/70", light ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-white/10 text-white")}><Building2 size={15} className={cn("shrink-0", light ? "text-slate-500" : "text-amber-300")} /><span className="sr-only">Company branch</span><select value={value} onChange={(event) => onChange(event.target.value)} className={cn("min-w-0 flex-1 cursor-pointer bg-transparent text-sm font-medium outline-none", "[&>option]:text-slate-950")} aria-label="Company branch"><option value={DEFAULT_REPORT_BRANCH}>{DEFAULT_REPORT_BRANCH}</option>{branches.filter((branch) => branch !== DEFAULT_REPORT_BRANCH).map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>;
}
